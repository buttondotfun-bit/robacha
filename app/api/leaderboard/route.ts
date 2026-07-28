import { NextResponse } from "next/server";
import { erc20Abi, parseAbiItem, type Address } from "viem";
import { contracts } from "@/lib/config";
import { publicClient } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Who has pulled the most, and who has spun the most.
 *
 * Built from `RewardAssigned` and `SpinEntered` logs, which are indexed by
 * event and so can be read across the whole chain in one call each — the same
 * reason the wallet history route can, and the reason `/api/activity` cannot.
 *
 * Biggest pulls are ranked *within each token*, not across them. Comparing a
 * WOOD pull to a CASHCAT pull needs a reliable price for both, and one of them
 * currently has no liquid market at all. Ranking them together would mean
 * either inventing an exchange rate or silently dropping the unpriced token, so
 * this ranks per token and lets each board stand on its own.
 *
 * Addresses are the only personal data here, they are already public on chain,
 * and nothing links them to anything off chain.
 */

const REWARD_ASSIGNED = parseAbiItem(
  "event RewardAssigned(uint256 indexed rewardId, uint256 indexed roundId, address indexed user, uint256 entryIndex, address token, uint256 amount, uint8 tierIndex)",
);
const SPIN_ENTERED = parseAbiItem(
  "event SpinEntered(uint256 indexed roundId, address indexed user, uint256 firstEntryIndex, uint16 quantity, uint256 baseAmount, uint256 surchargeAmount)",
);

/** Enough to be interesting, short enough to stay readable. */
const TOP_N = 5;

export interface LeaderboardResponse {
  /** One board per token, each already sorted biggest-first. */
  biggestPulls: {
    token: string;
    symbol: string | null;
    decimals: number | null;
    entries: { user: string; amountRaw: string; roundId: number; tierIndex: number }[];
  }[];
  mostSpins: { user: string; spins: number }[];
  totalSpins: number;
  totalPrizes: number;
  headBlock: number;
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

    const [assigned, entered] = await Promise.all([
      client.getLogs({ address: gacha, event: REWARD_ASSIGNED, fromBlock: 0n, toBlock: headBlock }),
      client.getLogs({ address: gacha, event: SPIN_ENTERED, fromBlock: 0n, toBlock: headBlock }),
    ]);

    // ---- Spins per wallet ----
    const spinsByUser = new Map<string, number>();
    let totalSpins = 0;
    for (const log of entered) {
      const args = log.args as { user?: Address; quantity?: number };
      if (!args.user) continue;
      const quantity = Number(args.quantity ?? 0);
      totalSpins += quantity;
      spinsByUser.set(args.user, (spinsByUser.get(args.user) ?? 0) + quantity);
    }

    // ---- Pulls per token ----
    const byToken = new Map<
      string,
      { user: string; amountRaw: bigint; roundId: number; tierIndex: number }[]
    >();
    for (const log of assigned) {
      const args = log.args as {
        user?: Address;
        token?: Address;
        amount?: bigint;
        roundId?: bigint;
        tierIndex?: number;
      };
      if (!args.user || !args.token || args.amount === undefined) continue;
      const key = args.token.toLowerCase();
      const list = byToken.get(key) ?? [];
      list.push({
        user: args.user,
        amountRaw: args.amount,
        roundId: Number(args.roundId ?? 0n),
        tierIndex: Number(args.tierIndex ?? 0),
      });
      byToken.set(key, list);
    }

    // One metadata read per token, not per pull.
    const tokens = [...byToken.keys()];
    const metadata = tokens.length
      ? ((await client.multicall({
          contracts: tokens.flatMap((token) => [
            { address: token as Address, abi: erc20Abi, functionName: "symbol" as const },
            { address: token as Address, abi: erc20Abi, functionName: "decimals" as const },
          ]),
          allowFailure: true,
        })) as { status: "success" | "failure"; result?: unknown }[])
      : [];

    const biggestPulls = tokens
      .map((token, index) => {
        const symbol = metadata[index * 2];
        const decimals = metadata[index * 2 + 1];
        const entries = (byToken.get(token) ?? [])
          .sort((a, b) => (b.amountRaw > a.amountRaw ? 1 : b.amountRaw < a.amountRaw ? -1 : 0))
          .slice(0, TOP_N)
          .map((entry) => ({ ...entry, amountRaw: entry.amountRaw.toString() }));
        return {
          token,
          symbol: symbol?.status === "success" ? (symbol.result as string) : null,
          decimals: decimals?.status === "success" ? Number(decimals.result as number) : null,
          entries,
        };
      })
      .filter((board) => board.entries.length > 0);

    const mostSpins = [...spinsByUser.entries()]
      .map(([user, spins]) => ({ user, spins }))
      .sort((a, b) => b.spins - a.spins)
      .slice(0, TOP_N);

    const payload: LeaderboardResponse = {
      biggestPulls,
      mostSpins,
      totalSpins,
      totalPrizes: assigned.length,
      headBlock: Number(headBlock),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        reason: "chain-unavailable",
        error: error instanceof Error ? error.message : "chain read failed",
      },
      { status: 503 },
    );
  }
}
