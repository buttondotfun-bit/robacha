import "server-only";
import type { Account, Address, PublicClient } from "viem";
import { ROBACHA_FEE_ROUTER_ABI } from "@/lib/abi";
import { contracts } from "@/lib/config";

/**
 * Keeps the entropy float topped up out of the surcharge that funds it.
 *
 * Every spin pays a randomness surcharge, and whatever a round does not spend
 * buying its word accrues to `randomnessTreasury` inside the fee router —
 * which points at the entropy adapter. The money to pay for future rounds is
 * therefore always already earned. The catch is that accrual is a claim rather
 * than a balance: the router holds the ETH until somebody calls `withdraw`,
 * and the adapter's readiness is measured against what it actually holds.
 *
 * So a float can sit at two rounds of runway while the router holds ten rounds
 * of its money, and the machine closes itself with the cure in the next
 * contract along. That gap was crossed by hand until now, which is the same
 * shape as every other failure this project has had: a step that looked
 * automatic because it was documented, and wasn't because nothing ran it.
 *
 * Running it here makes the loop close on its own. Lean rounds draw the float
 * down, busy rounds bank a surplus, and this carries it across on the same
 * tick that settles the rounds which earned it.
 */

/**
 * Don't sweep for less than this.
 *
 * A withdraw costs gas, and sweeping dust burns more than it moves. Roughly a
 * third of one round's worst-case cost, so a sweep always buys back
 * meaningfully more runway than it spends.
 */
const MIN_SWEEP_WEI = 200_000_000_000_000n; // 0.0002 ETH

export interface SweepAction {
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
) => Promise<string | null>;

export async function sweepEntropyFloat(
  client: PublicClient,
  _account: Account,
  send: Send,
): Promise<SweepAction[]> {
  const router = contracts.feeRouter;
  if (!router) {
    return [{ action: "sweepEntropyFloat", skipped: "fee router not configured" }];
  }

  // Read the destination from the router rather than from configuration. The
  // adapter has already been replaced twice, and a sweep aimed at a stale
  // address would move real money to a contract nothing points at any more.
  // The router knows who the surcharge belongs to; nothing else needs to.
  const treasury = (await client.readContract({
    address: router,
    abi: ROBACHA_FEE_ROUTER_ABI,
    functionName: "randomnessTreasury",
  })) as Address;

  if (!treasury || treasury === "0x0000000000000000000000000000000000000000") {
    return [{ action: "sweepEntropyFloat", skipped: "no randomness treasury set" }];
  }

  const accrued = (await client.readContract({
    address: router,
    abi: ROBACHA_FEE_ROUTER_ABI,
    functionName: "accrued",
    args: [treasury],
  })) as bigint;

  if (accrued < MIN_SWEEP_WEI) {
    return [
      {
        action: "sweepEntropyFloat",
        skipped: `${accrued} wei accrued, below the minimum worth the gas`,
      },
    ];
  }

  const hash = await send("sweepEntropyFloat", {
    address: router,
    abi: ROBACHA_FEE_ROUTER_ABI as readonly unknown[],
    functionName: "withdraw",
    args: [treasury],
  });

  return [{ action: "sweepEntropyFloat", txHash: hash ?? undefined }];
}
