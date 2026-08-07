import "server-only";
import type { Account, Address, PublicClient } from "viem";
import { ROBACHA_FEE_ROUTER_ABI, ROBACHA_POOL_REGISTRY_ABI } from "@/lib/abi";
import { ACTIVE_POOL_ID, contracts } from "@/lib/config";
import { autoBuyer } from "@/lib/env/server";

/**
 * Turns the reward reserve back into prizes.
 *
 * 85% of every spin is already earmarked for restocking and accrues to the
 * AutoBuyer inside the fee router — but accrual is not a transfer, and the
 * AutoBuyer does not trade on its own. Both steps needed calling and nothing
 * called them, so the reserve piled up in the router while the vault ran dry
 * and spins began refunding. This closes that loop.
 *
 * The swap is the delicate part. `swapAndFund` accepts `minAmountOut = 0`,
 * which is an unprotected market buy that anyone watching the mempool can
 * sandwich — there is a contract test pinning exactly that risk. So the price
 * is quoted first and a real floor is passed. If the quote cannot be read, the
 * swap is skipped: stalling a restock is recoverable, being sandwiched is not.
 */

/** Don't bother moving dust; gas would eat it. */
const MIN_WITHDRAW_WEI = 1_000_000_000_000_000n; // 0.001 ETH
const MIN_SPEND_WEI = 1_000_000_000_000_000n; // 0.001 ETH
/** Most that may be spent in one run, so a bad quote cannot drain the reserve. */
const MAX_SPEND_WEI = 50_000_000_000_000_000n; // 0.05 ETH
/** Tolerance against the quoted price. */
const SLIPPAGE_BPS = 200n; // 2%

const AUTO_BUYER_ABI = [
  {
    type: "function",
    name: "swapAndFund",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "poolFee", type: "uint24" },
      { name: "ethAmount", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

export interface RestockAction {
  action: string;
  txHash?: string;
  skipped?: string;
}

type Send = (
  label: string,
  params: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  },
) => Promise<`0x${string}` | null>;

/**
 * @param send Sends one call, simulating first, and returns its hash or null.
 *             Shared with the keeper so every write is bounded and awaited the
 *             same way.
 */
export async function restockVault(
  client: PublicClient,
  account: Account,
  send: Send,
): Promise<RestockAction[]> {
  const actions: RestockAction[] = [];
  const router = contracts.feeRouter;
  const registry = contracts.poolRegistry;

  if (!router) {
    return [{ action: "restock", skipped: "fee router not configured" }];
  }

  /**
   * Which buyer, asked of the router.
   *
   * `ROBACHA_AUTO_BUYER` named the previous auto-buyer for the whole of the
   * period after it was redeployed, and the failure was silent in the worst
   * possible way: the accrual is looked up *per address*, so this read the old
   * contract's balance, got zero, decided there was nothing to restock, and
   * reported a clean run. Meanwhile 0.09 ETH of prize money — already earned,
   * already reserved — piled up against the live buyer while the legendary
   * tier had no inventory and refunded instead of paying.
   *
   * The router is the contract that credits the reserve, so its own
   * `rewardReserveTreasury` is the address that money is actually sitting
   * under; nothing else can be right about it. Same reasoning as
   * `randomnessTreasury` in `entropy-float.ts`, and the same underlying lesson:
   * a redeployed address in an env var is a step outside the transaction, and
   * that is the step that gets missed.
   */
  const fromRouter = await client
    .readContract({
      address: router,
      abi: ROBACHA_FEE_ROUTER_ABI,
      functionName: "rewardReserveTreasury",
    })
    .catch(() => null);

  const buyer =
    typeof fromRouter === "string" &&
    fromRouter !== "0x0000000000000000000000000000000000000000"
      ? (fromRouter as Address)
      : (autoBuyer.address as Address | null);

  if (!buyer) {
    return [{ action: "restock", skipped: "auto-buyer not configured" }];
  }

  // 1. Move the accrued reserve out of the router. Accrual is a claim, not a
  //    balance; nothing can be spent until it is pulled.
  const accrued = (await client.readContract({
    address: router,
    abi: ROBACHA_FEE_ROUTER_ABI,
    functionName: "accrued",
    args: [buyer],
  })) as bigint;

  if (accrued >= MIN_WITHDRAW_WEI) {
    const hash = await send("withdrawRewardReserve", {
      address: router,
      abi: ROBACHA_FEE_ROUTER_ABI as readonly unknown[],
      functionName: "withdraw",
      args: [buyer],
    });
    actions.push({ action: "withdrawRewardReserve", txHash: hash ?? undefined });
  }

  // 2. Spend whatever the buyer now holds.
  const balance = await client.getBalance({ address: buyer });
  if (balance < MIN_SPEND_WEI) {
    actions.push({
      action: "swapAndFund",
      skipped: `auto-buyer holds ${balance} wei, below the minimum worth spending`,
    });
    return actions;
  }

  const spend = balance > MAX_SPEND_WEI ? MAX_SPEND_WEI : balance;

  // 3. Which token is short. The registry names the first token that cannot
  //    cover its own reward range, which is precisely what stops spins.
  let target: Address | null = null;
  if (registry) {
    try {
      const version = (await client.readContract({
        address: registry,
        abi: ROBACHA_POOL_REGISTRY_ABI,
        functionName: "currentPoolVersion",
        args: [ACTIVE_POOL_ID],
      })) as readonly [bigint, boolean];

      const readiness = (await client.readContract({
        address: registry,
        abi: ROBACHA_POOL_REGISTRY_ABI,
        functionName: "activationReadiness",
        args: [ACTIVE_POOL_ID, version[0]],
      })) as readonly [boolean, boolean, boolean, boolean, boolean, Address];

      const firstUnfunded = readiness[5];
      if (firstUnfunded && firstUnfunded !== "0x0000000000000000000000000000000000000000") {
        target = firstUnfunded;
      }
    } catch {
      // Fall through; a missing readiness read is not a reason to guess.
    }
  }

  if (!target) {
    actions.push({ action: "swapAndFund", skipped: "no token is short; nothing to restock" });
    return actions;
  }

  // 4. Quote, then floor. A zero floor is an unprotected market buy.
  //
  //    Quoted by simulating the real call rather than by asking the V2 router.
  //    The buyer routes per token now — V2, V3, the legacy SwapRouter, or the
  //    V4 singleton — and `getAmountsOut` only knows V2, so for every token
  //    whose liquidity is anywhere else the quote threw and restock skipped
  //    with "no usable quote". That is what left MANCER, a V3 route, unfunded
  //    while the ETH to buy it sat in the buyer: the withdraw half of the loop
  //    ran every minute and the spend half could never fire.
  //
  //    `swapAndFund` returns `amountOut`, so an `eth_call` against it with a
  //    zero floor reports exactly what the swap would yield, through whatever
  //    venue that token is actually routed to. Nothing is sent — the zero floor
  //    exists only inside the simulation, and the real call below carries the
  //    derived one. It also stays correct through the next routing change,
  //    which a hardcoded venue would not.
  let minOut: bigint;
  try {
    const { result } = await client.simulateContract({
      address: buyer,
      abi: AUTO_BUYER_ABI,
      functionName: "swapAndFund",
      args: [target, 3000, spend, 0n],
      account,
    });

    const quoted = result as bigint;
    if (quoted === 0n) throw new Error("simulation returned zero out");
    minOut = (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  } catch (error) {
    actions.push({
      action: "swapAndFund",
      skipped: `no usable quote, refusing to swap without a floor: ${
        error instanceof Error ? error.message.split("\n")[0] : "quote failed"
      }`,
    });
    return actions;
  }

  const hash = await send("swapAndFund", {
    address: buyer,
    abi: AUTO_BUYER_ABI as readonly unknown[],
    // poolFee is unused by the V2 implementation but kept in the signature.
    functionName: "swapAndFund",
    args: [target, 3000, spend, minOut],
  });
  actions.push({ action: `swapAndFund:${target}`, txHash: hash ?? undefined });

  return actions;
}
