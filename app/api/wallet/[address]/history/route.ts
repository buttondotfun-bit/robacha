import { NextResponse } from "next/server";
import { isAddress, parseAbiItem, type Address } from "viem";
import { ROBACHA_GACHA_ABI } from "@/lib/abi";
import { contracts } from "@/lib/config";
import { publicClient } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * What one wallet has put in and taken out, over its whole life.
 *
 * Nobody could answer "what have I spent here" before this. For a product
 * taking real money that is a trust problem more than a feature gap — and the
 * numbers are the least flattering ones on the site, which is exactly why they
 * should be easy to find.
 *
 * Every figure is derived from chain state, not an index:
 *
 *   paid       SpinEntered logs for this wallet, base + surcharge as recorded
 *   refunded   SpinRefunded logs for this wallet
 *   rewards    rewardsOf(), the same read the bag uses
 *   pending    refundable(), money owed but not yet withdrawn
 *
 * The log queries are filtered by the wallet as an indexed topic, which is why
 * they can span the whole chain in one call. `/api/activity` is limited to a
 * short recent window because it scans five event types with no filter at all;
 * that limitation does not apply here.
 *
 * No fiat value is computed server-side. Rewards are returned as token amounts
 * and the client prices them, so a stale or missing price shows as a missing
 * price rather than a confidently wrong net position.
 */

const SPIN_ENTERED = parseAbiItem(
  "event SpinEntered(uint256 indexed roundId, address indexed user, uint256 firstEntryIndex, uint16 quantity, uint256 baseAmount, uint256 surchargeAmount)",
);
const SPIN_REFUNDED = parseAbiItem(
  "event SpinRefunded(address indexed user, uint256 amount)",
);

export interface WalletHistory {
  address: string;
  /** Spins bought, all-time. */
  spins: number;
  /** Rounds this wallet has taken part in. */
  rounds: number;
  /** Wei paid in spin price, excluding the draw fee. */
  paidBaseWei: string;
  /** Wei paid in draw fees. */
  paidSurchargeWei: string;
  /** Wei already refunded and withdrawn. */
  refundedWei: string;
  /** Wei refundable but still unwithdrawn. */
  pendingRefundWei: string;
  /** Rewards assigned, by token. Amounts are raw; the client prices them. */
  rewards: { token: string; amountRaw: string; count: number; claimed: number }[];
  rewardCount: number;
  unclaimedCount: number;
  headBlock: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  if (!contracts.gacha) {
    return NextResponse.json(
      { reason: "not-configured", error: "ROBACHA gacha contract is not configured" },
      { status: 503 },
    );
  }

  const gacha = contracts.gacha;
  const user = address as Address;
  const client = publicClient();

  try {
    const headBlock = await client.getBlockNumber();

    const [entered, refunded, pendingRefund, rewardIds] = await Promise.all([
      client.getLogs({
        address: gacha,
        event: SPIN_ENTERED,
        args: { user },
        fromBlock: 0n,
        toBlock: headBlock,
      }),
      client.getLogs({
        address: gacha,
        event: SPIN_REFUNDED,
        args: { user },
        fromBlock: 0n,
        toBlock: headBlock,
      }),
      client.readContract({
        address: gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName: "refundable",
        args: [user],
      }) as Promise<bigint>,
      client.readContract({
        address: gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName: "rewardsOf",
        args: [user],
      }) as Promise<readonly bigint[]>,
    ]);

    let spins = 0;
    let paidBaseWei = 0n;
    let paidSurchargeWei = 0n;
    const rounds = new Set<string>();
    for (const log of entered) {
      const args = log.args as {
        roundId?: bigint;
        quantity?: number;
        baseAmount?: bigint;
        surchargeAmount?: bigint;
      };
      spins += Number(args.quantity ?? 0);
      paidBaseWei += args.baseAmount ?? 0n;
      paidSurchargeWei += args.surchargeAmount ?? 0n;
      if (args.roundId !== undefined) rounds.add(args.roundId.toString());
    }

    let refundedWei = 0n;
    for (const log of refunded) {
      refundedWei += (log.args as { amount?: bigint }).amount ?? 0n;
    }

    // Rewards grouped by token, so five Cash Cat pulls read as one line.
    const byToken = new Map<string, { amountRaw: bigint; count: number; claimed: number }>();
    let unclaimedCount = 0;

    if (rewardIds.length > 0) {
      const results = (await client.multicall({
        contracts: rewardIds.map((rewardId) => ({
          address: gacha,
          abi: ROBACHA_GACHA_ABI,
          functionName: "getReward" as const,
          args: [rewardId],
        })),
        allowFailure: true,
      })) as { status: "success" | "failure"; result?: unknown }[];

      for (const entry of results) {
        if (entry.status !== "success") continue;
        const reward = entry.result as { token: Address; amount: bigint; claimed: boolean };
        const key = reward.token.toLowerCase();
        const row = byToken.get(key) ?? { amountRaw: 0n, count: 0, claimed: 0 };
        row.amountRaw += reward.amount;
        row.count += 1;
        if (reward.claimed) row.claimed += 1;
        else unclaimedCount += 1;
        byToken.set(key, row);
      }
    }

    const payload: WalletHistory = {
      address: user,
      spins,
      rounds: rounds.size,
      paidBaseWei: paidBaseWei.toString(),
      paidSurchargeWei: paidSurchargeWei.toString(),
      refundedWei: refundedWei.toString(),
      pendingRefundWei: pendingRefund.toString(),
      rewards: [...byToken.entries()].map(([token, row]) => ({
        token,
        amountRaw: row.amountRaw.toString(),
        count: row.count,
        claimed: row.claimed,
      })),
      rewardCount: rewardIds.length,
      unclaimedCount,
      headBlock: Number(headBlock),
    };

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Fail closed: a partial history would understate what someone has spent.
    return NextResponse.json(
      {
        reason: "chain-unavailable",
        error: error instanceof Error ? error.message : "chain read failed",
      },
      { status: 503 },
    );
  }
}
