import { NextResponse } from "next/server";
import { parseAbiItem, type Address } from "viem";
import { contracts } from "@/lib/config";
import { publicClient } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Who has actually taken part, per pool version.
 *
 * Nobody could answer "how many people have used this" — spin counts were
 * visible but the number of distinct wallets behind them was not, and those are
 * very different numbers when a handful of people spin five times each.
 *
 * Built entirely from indexed event logs. `RoundOpened` carries the pool and
 * version for each round, so every later event can be attributed to a pool
 * version without a single contract read. All five queries filter by event
 * topic, which is what lets them span the whole chain in one call each.
 *
 * Not named /api/admin/* on purpose. This is derived from public logs and
 * anyone can compute it themselves, so putting it behind an admin path would
 * imply a protection that does not exist and could not honestly be added. The
 * admin panel that consumes it is gated by an on-chain role check, which hides
 * the console from visitors — a courtesy, not a boundary, exactly as the rest
 * of the admin surface documents.
 *
 * What it deliberately does not do is track people. There is no cookie, no
 * fingerprint, no session and no identity: a "participant" here is a wallet
 * address that appears in a log the contract emitted. Nothing links one to a
 * person, and nothing is stored.
 */

const ROUND_OPENED = parseAbiItem(
  "event RoundOpened(uint256 indexed roundId, uint256 indexed poolId, uint256 indexed version, uint64 closesAt)",
);
const SPIN_ENTERED = parseAbiItem(
  "event SpinEntered(uint256 indexed roundId, address indexed user, uint256 firstEntryIndex, uint16 quantity, uint256 baseAmount, uint256 surchargeAmount)",
);
const REWARD_ASSIGNED = parseAbiItem(
  "event RewardAssigned(uint256 indexed rewardId, uint256 indexed roundId, address indexed user, uint256 entryIndex, address token, uint256 amount, uint8 tierIndex)",
);
const REWARD_CLAIMED = parseAbiItem(
  "event RewardClaimed(uint256 indexed rewardId, address indexed user, address indexed token, uint256 amount)",
);
const SPIN_REFUNDED = parseAbiItem(
  "event SpinRefunded(address indexed user, uint256 amount)",
);

export interface PoolAnalytics {
  poolId: number;
  version: number;
  /** Distinct wallets that have entered this pool version. */
  participants: number;
  /** Wallets that came back for more than one round. */
  returning: number;
  spins: number;
  rounds: number;
  paidWei: string;
  /** Distinct wallets that have been assigned at least one prize. */
  winners: number;
  prizes: number;
  firstSpinAt: number | null;
  lastSpinAt: number | null;
}

export interface AnalyticsResponse {
  pools: PoolAnalytics[];
  totals: {
    /** Distinct wallets across every pool version. */
    participants: number;
    spins: number;
    rounds: number;
    paidWei: string;
    prizes: number;
    claimed: number;
    refundedWei: string;
    refundedWallets: number;
    /** Wallets that have spun more than once, anywhere. */
    repeatWallets: number;
  };
  /** Spins-per-wallet buckets, so a few whales are visible as a few whales. */
  distribution: { label: string; wallets: number }[];
  headBlock: number;
  generatedAt: string;
}

export async function GET() {
  if (!contracts.gacha) {
    return NextResponse.json(
      { reason: "not-configured", error: "gacha contract is not configured" },
      { status: 503 },
    );
  }

  const gacha = contracts.gacha;
  const client = publicClient();

  try {
    const headBlock = await client.getBlockNumber();
    const range = { address: gacha, fromBlock: 0n, toBlock: headBlock } as const;

    const [opened, entered, assigned, claimed, refunded] = await Promise.all([
      client.getLogs({ ...range, event: ROUND_OPENED }),
      client.getLogs({ ...range, event: SPIN_ENTERED }),
      client.getLogs({ ...range, event: REWARD_ASSIGNED }),
      client.getLogs({ ...range, event: REWARD_CLAIMED }),
      client.getLogs({ ...range, event: SPIN_REFUNDED }),
    ]);

    // roundId -> which pool version it belonged to.
    const roundKey = new Map<string, { poolId: number; version: number }>();
    for (const log of opened) {
      const args = log.args as { roundId?: bigint; poolId?: bigint; version?: bigint };
      if (args.roundId === undefined) continue;
      roundKey.set(args.roundId.toString(), {
        poolId: Number(args.poolId ?? 0n),
        version: Number(args.version ?? 0n),
      });
    }

    // Block timestamps only for the blocks that actually contain a spin.
    const spinBlocks = [...new Set(entered.map((log) => log.blockNumber))].filter(
      (b): b is bigint => b !== null,
    );
    const blockTimes = new Map<string, number>();
    await Promise.all(
      spinBlocks.map(async (blockNumber) => {
        try {
          const block = await client.getBlock({ blockNumber });
          blockTimes.set(blockNumber.toString(), Number(block.timestamp));
        } catch {
          /* a missing timestamp just leaves first/last unset for that spin */
        }
      }),
    );

    interface Bucket {
      poolId: number;
      version: number;
      wallets: Map<string, { spins: number; rounds: Set<string> }>;
      spins: number;
      rounds: Set<string>;
      paidWei: bigint;
      winners: Set<string>;
      prizes: number;
      firstSpinAt: number | null;
      lastSpinAt: number | null;
    }

    const byPool = new Map<string, Bucket>();
    const walletSpins = new Map<string, number>();
    let totalSpins = 0;
    let totalPaid = 0n;

    function bucketFor(key: { poolId: number; version: number }): Bucket {
      const id = `${key.poolId}:${key.version}`;
      let bucket = byPool.get(id);
      if (!bucket) {
        bucket = {
          poolId: key.poolId,
          version: key.version,
          wallets: new Map(),
          spins: 0,
          rounds: new Set(),
          paidWei: 0n,
          winners: new Set(),
          prizes: 0,
          firstSpinAt: null,
          lastSpinAt: null,
        };
        byPool.set(id, bucket);
      }
      return bucket;
    }

    for (const log of entered) {
      const args = log.args as {
        roundId?: bigint;
        user?: Address;
        quantity?: number;
        baseAmount?: bigint;
        surchargeAmount?: bigint;
      };
      if (!args.user || args.roundId === undefined) continue;

      // A round with no RoundOpened log cannot be attributed. Skipping keeps
      // per-pool figures honest rather than dumping them into a bogus pool 0.
      const key = roundKey.get(args.roundId.toString());
      if (!key) continue;

      const bucket = bucketFor(key);
      const user = args.user.toLowerCase();
      const quantity = Number(args.quantity ?? 0);
      const paid = (args.baseAmount ?? 0n) + (args.surchargeAmount ?? 0n);

      const row = bucket.wallets.get(user) ?? { spins: 0, rounds: new Set<string>() };
      row.spins += quantity;
      row.rounds.add(args.roundId.toString());
      bucket.wallets.set(user, row);

      bucket.spins += quantity;
      bucket.rounds.add(args.roundId.toString());
      bucket.paidWei += paid;

      const at = log.blockNumber ? blockTimes.get(log.blockNumber.toString()) : undefined;
      if (at !== undefined) {
        if (bucket.firstSpinAt === null || at < bucket.firstSpinAt) bucket.firstSpinAt = at;
        if (bucket.lastSpinAt === null || at > bucket.lastSpinAt) bucket.lastSpinAt = at;
      }

      walletSpins.set(user, (walletSpins.get(user) ?? 0) + quantity);
      totalSpins += quantity;
      totalPaid += paid;
    }

    for (const log of assigned) {
      const args = log.args as { roundId?: bigint; user?: Address };
      if (!args.user || args.roundId === undefined) continue;
      const key = roundKey.get(args.roundId.toString());
      if (!key) continue;
      const bucket = bucketFor(key);
      bucket.winners.add(args.user.toLowerCase());
      bucket.prizes += 1;
    }

    let refundedWei = 0n;
    const refundedWallets = new Set<string>();
    for (const log of refunded) {
      const args = log.args as { user?: Address; amount?: bigint };
      refundedWei += args.amount ?? 0n;
      if (args.user) refundedWallets.add(args.user.toLowerCase());
    }

    const pools: PoolAnalytics[] = [...byPool.values()]
      .map((bucket) => ({
        poolId: bucket.poolId,
        version: bucket.version,
        participants: bucket.wallets.size,
        returning: [...bucket.wallets.values()].filter((w) => w.rounds.size > 1).length,
        spins: bucket.spins,
        rounds: bucket.rounds.size,
        paidWei: bucket.paidWei.toString(),
        winners: bucket.winners.size,
        prizes: bucket.prizes,
        firstSpinAt: bucket.firstSpinAt,
        lastSpinAt: bucket.lastSpinAt,
      }))
      .sort((a, b) => b.poolId - a.poolId || b.version - a.version);

    const buckets: { label: string; min: number; max: number }[] = [
      { label: "1 spin", min: 1, max: 1 },
      { label: "2–4", min: 2, max: 4 },
      { label: "5–9", min: 5, max: 9 },
      { label: "10+", min: 10, max: Number.POSITIVE_INFINITY },
    ];
    const distribution = buckets.map((b) => ({
      label: b.label,
      wallets: [...walletSpins.values()].filter((n) => n >= b.min && n <= b.max).length,
    }));

    const payload: AnalyticsResponse = {
      pools,
      totals: {
        participants: walletSpins.size,
        spins: totalSpins,
        rounds: roundKey.size,
        paidWei: totalPaid.toString(),
        prizes: assigned.length,
        claimed: claimed.length,
        refundedWei: refundedWei.toString(),
        refundedWallets: refundedWallets.size,
        repeatWallets: [...walletSpins.values()].filter((n) => n > 1).length,
      },
      distribution,
      headBlock: Number(headBlock),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    // Fail closed. A partial count would understate participation and get
    // quoted somewhere as if it were the real figure.
    return NextResponse.json(
      {
        reason: "chain-unavailable",
        error: error instanceof Error ? error.message : "chain read failed",
      },
      { status: 503 },
    );
  }
}
