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

/** Uniswap V2 router and WETH, hardcoded in RobachaAutoBuyer. */
const SWAP_ROUTER = "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba" as const;
const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as const;

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

const V2_ROUTER_ABI = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ type: "uint256[]" }],
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
  const buyer = autoBuyer.address as Address | null;
  const router = contracts.feeRouter;
  const registry = contracts.poolRegistry;

  if (!buyer || !router) {
    return [{ action: "restock", skipped: "auto-buyer or fee router not configured" }];
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
  let minOut: bigint;
  try {
    const amounts = (await client.readContract({
      address: SWAP_ROUTER,
      abi: V2_ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [spend, [WETH, target]],
    })) as readonly bigint[];

    const quoted = amounts[amounts.length - 1];
    if (quoted === 0n) throw new Error("router quoted zero");
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
