import { NextResponse } from "next/server";
import { erc20Abi, parseAbiItem, type Address } from "viem";
import { contracts } from "@/lib/config";
import { publicClient } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Discovery aggregates, derived from `RewardAssigned` logs.
 *
 * "A project is discovered by a wallet when that wallet is assigned a reward of
 * that project's token in a settled round." (The spec's definition.) Everything
 * here follows from that single event, which carries user + token + amount +
 * tier + round together — so per-token unique-discoverer counts and per-wallet
 * distinct-project counts are exact reads of public log data, not estimates.
 *
 * Same live-scan + short-cache pattern as /api/leaderboard (the event is indexed
 * by topic, so the whole history reads in one call). Nothing is stored; nothing
 * is invented. Ranking is by *unique discoverers*, never token quantity or
 * price, so a large token supply can't buy its way up.
 */

const REWARD_ASSIGNED = parseAbiItem(
  "event RewardAssigned(uint256 indexed rewardId, uint256 indexed roundId, address indexed user, uint256 entryIndex, address token, uint256 amount, uint8 tierIndex)",
);

const TOP_DISCOVERERS_N = 25;

export interface DiscoveryProject {
  token: string;
  symbol: string | null;
  decimals: number | null;
  uniqueDiscoverers: number;
  pullsDistributed: number;
  lastRoundId: number;
}

export interface DiscoveryResponse {
  /** One entry per token ever distributed, sorted by unique discoverers desc. */
  projects: DiscoveryProject[];
  /** Wallets ranked by distinct projects discovered. */
  topDiscoverers: { user: string; projects: number }[];
  totalProjects: number;
  totalPulls: number;
  /** Distinct wallets that have discovered at least one project. */
  totalExplorers: number;
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
    const assigned = await client.getLogs({
      address: gacha,
      event: REWARD_ASSIGNED,
      fromBlock: 0n,
      toBlock: headBlock,
    });

    // Per-token discovery stats + per-wallet distinct-token sets, one pass.
    const perToken = new Map<
      string,
      { discoverers: Set<string>; pulls: number; lastRoundId: number }
    >();
    const perUser = new Map<string, Set<string>>();

    for (const log of assigned) {
      const args = log.args as {
        user?: Address;
        token?: Address;
        roundId?: bigint;
      };
      if (!args.user || !args.token) continue;
      const token = args.token.toLowerCase();
      const user = args.user.toLowerCase();
      const roundId = Number(args.roundId ?? 0n);

      const t = perToken.get(token) ?? {
        discoverers: new Set<string>(),
        pulls: 0,
        lastRoundId: 0,
      };
      t.discoverers.add(user);
      t.pulls += 1;
      if (roundId > t.lastRoundId) t.lastRoundId = roundId;
      perToken.set(token, t);

      const seen = perUser.get(user) ?? new Set<string>();
      seen.add(token);
      perUser.set(user, seen);
    }

    // One metadata read per token, not per pull.
    const tokens = [...perToken.keys()];
    const metadata = tokens.length
      ? ((await client.multicall({
          contracts: tokens.flatMap((token) => [
            { address: token as Address, abi: erc20Abi, functionName: "symbol" as const },
            { address: token as Address, abi: erc20Abi, functionName: "decimals" as const },
          ]),
          allowFailure: true,
        })) as { status: "success" | "failure"; result?: unknown }[])
      : [];

    const projects: DiscoveryProject[] = tokens
      .map((token, index) => {
        const symbol = metadata[index * 2];
        const decimals = metadata[index * 2 + 1];
        const stats = perToken.get(token)!;
        return {
          token,
          symbol: symbol?.status === "success" ? (symbol.result as string) : null,
          decimals:
            decimals?.status === "success" ? Number(decimals.result as number) : null,
          uniqueDiscoverers: stats.discoverers.size,
          pullsDistributed: stats.pulls,
          lastRoundId: stats.lastRoundId,
        };
      })
      .sort((a, b) => b.uniqueDiscoverers - a.uniqueDiscoverers);

    const topDiscoverers = [...perUser.entries()]
      .map(([user, set]) => ({ user, projects: set.size }))
      .sort((a, b) => b.projects - a.projects)
      .slice(0, TOP_DISCOVERERS_N);

    const payload: DiscoveryResponse = {
      projects,
      topDiscoverers,
      totalProjects: tokens.length,
      totalPulls: assigned.length,
      totalExplorers: perUser.size,
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
