import "server-only";
import type { Account, Address, PublicClient } from "viem";
import { ROBACHA_FEE_ROUTER_ABI } from "@/lib/abi";
import { contracts } from "@/lib/config";
import {
  estimateRobForEth,
  ROB_POOL_FEE,
  ROB_TOKEN,
  ROB_WETH_POOL,
  SWAP_ROUTER,
  V3_POOL_SLOT0_ABI,
  WETH_TOKEN,
} from "@/lib/rob-payment";

/**
 * Buys ROB with a slice of protocol margin and burns it.
 *
 * The honest version of a ROB burn. Players are not surcharged; the platform
 * spends its own fee revenue to buy ROB on the open market and send it to the
 * dead address, which anyone can verify by watching that balance climb. No
 * price is promised anywhere — this removes supply, and what that is worth is
 * the market's to decide.
 *
 * Three hard rules keep it from ever harming the machine:
 *
 *   1. It spends only *protocol* fees — the 12% that is genuinely margin. The
 *      85% reward reserve and the randomness surcharge are other people's money
 *      (prizes and the entropy float) and are never touched. The protocol
 *      treasury is read from the router, not configuration, for the same reason
 *      every other pointer here is.
 *
 *   2. It keeps only a share of that margin, not all of it. A platform that
 *      burns 100% of its revenue earns nothing and cannot keep running, so this
 *      burns `BURN_SHARE_BPS` and leaves the rest as real margin.
 *
 *   3. It never drops the keeper below `GAS_FLOOR`. The keeper wallet is also
 *      what pays for closing and settling rounds, and starving it was a live
 *      outage earlier in this project. The buyback only spends ETH that sits
 *      above the floor, so a busy day of settlements always comes first.
 *
 * At low volume the accrued margin sits under `MIN_BURN_WEI` and this does
 * nothing — correctly. It wakes up on its own when there is real margin to
 * spend, and a burn of dust would cost more in gas than it removes.
 */

/** Below this much accrued protocol margin, a buyback burns more gas than ROB. */
const MIN_BURN_WEI = 10_000_000_000_000_000n; // 0.01 ETH (~$36)

/** Never spend more than this on a single run, to bound the blast radius. */
const MAX_BURN_PER_RUN_WEI = 20_000_000_000_000_000n; // 0.02 ETH

/**
 * Gas the keeper must always retain. Far above the monitor's alarm and worth
 * hundreds of round-lifecycle transactions on this chain, so a buyback can
 * never be the reason a round fails to close.
 */
const GAS_FLOOR_WEI = 15_000_000_000_000_000n; // 0.015 ETH

/** The fraction of accrued protocol margin spent on the buyback. */
const BURN_SHARE_BPS = 5_000n; // 50%

/** Tolerance against the pool's spot price when flooring the swap output. */
const SLIPPAGE_BPS = 500n; // 5%

const DEAD: Address = "0x000000000000000000000000000000000000dEaD";

const SWAP_ROUTER_EXACT_IN_ABI = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        type: "tuple",
        name: "params",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

export interface BurnAction {
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
    value?: bigint;
  },
) => Promise<`0x${string}` | null>;

export async function buybackAndBurnRob(
  client: PublicClient,
  account: Account,
  send: Send,
): Promise<BurnAction[]> {
  const router = contracts.feeRouter;
  if (!router) {
    return [{ action: "buybackAndBurn", skipped: "fee router not configured" }];
  }

  // Who holds protocol margin, per the router itself.
  const protocolTreasury = (await client
    .readContract({
      address: router,
      abi: ROBACHA_FEE_ROUTER_ABI,
      functionName: "protocolTreasury",
    })
    .catch(() => null)) as Address | null;

  if (!protocolTreasury) {
    return [{ action: "buybackAndBurn", skipped: "no protocol treasury set" }];
  }

  const accrued = (await client.readContract({
    address: router,
    abi: ROBACHA_FEE_ROUTER_ABI,
    functionName: "accrued",
    args: [protocolTreasury],
  })) as bigint;

  if (accrued < MIN_BURN_WEI) {
    return [
      {
        action: "buybackAndBurn",
        skipped: `${accrued} wei protocol margin accrued, below the buyback threshold`,
      },
    ];
  }

  // Withdraw the accrued margin to the treasury (which is the keeper wallet).
  // This moves it out of the router's claim and into spendable ETH; the half
  // not burned simply stays in the wallet as margin.
  const withdrawHash = await send("withdrawProtocolFees", {
    address: router,
    abi: ROBACHA_FEE_ROUTER_ABI as readonly unknown[],
    functionName: "withdraw",
    args: [protocolTreasury],
  });
  if (!withdrawHash) {
    return [{ action: "buybackAndBurn", skipped: "protocol fee withdrawal did not land" }];
  }

  // Decide the spend only after the withdrawal, from the wallet's real balance,
  // so the gas floor is enforced against what is actually there.
  const balance = await client.getBalance({ address: protocolTreasury });
  const headroom = balance > GAS_FLOOR_WEI ? balance - GAS_FLOOR_WEI : 0n;

  let spend = (accrued * BURN_SHARE_BPS) / 10_000n;
  if (spend > MAX_BURN_PER_RUN_WEI) spend = MAX_BURN_PER_RUN_WEI;
  if (spend > headroom) spend = headroom;

  if (spend < MIN_BURN_WEI) {
    return [
      {
        action: "buybackAndBurn",
        txHash: withdrawHash,
        skipped: `withdrew margin; buyback held back to keep the keeper above its gas floor`,
      },
    ];
  }

  // Floor the ROB out against spot, so a thin or manipulated block cannot make
  // the burn buy far less than the market would give.
  const slot0 = (await client.readContract({
    address: ROB_WETH_POOL,
    abi: V3_POOL_SLOT0_ABI,
    functionName: "slot0",
  })) as readonly [bigint, number, number, number, number, number, boolean];

  const expectedRob = estimateRobForEth(spend, slot0[0]);
  if (expectedRob === 0n) {
    return [
      {
        action: "buybackAndBurn",
        txHash: withdrawHash,
        skipped: "could not read a ROB price; refusing to buy without a floor",
      },
    ];
  }
  const minRob = (expectedRob * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  // Buy ROB with ETH and send it straight to the dead address — the bought
  // tokens never touch the keeper, so there is no separate burn step to fail.
  const burnHash = await send("burnRob", {
    address: SWAP_ROUTER,
    abi: SWAP_ROUTER_EXACT_IN_ABI as readonly unknown[],
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: WETH_TOKEN,
        tokenOut: ROB_TOKEN,
        fee: ROB_POOL_FEE,
        recipient: DEAD,
        amountIn: spend,
        amountOutMinimum: minRob,
        sqrtPriceLimitX96: 0n,
      },
    ],
    value: spend,
  });

  return [
    { action: "withdrawProtocolFees", txHash: withdrawHash },
    { action: `burnRob:${spend}`, txHash: burnHash ?? undefined },
  ];
}
