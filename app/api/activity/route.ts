import { NextResponse } from "next/server";
import { erc20Abi, parseAbiItem, type Address, type Log } from "viem";
import { CONFIRMATIONS, contracts } from "@/lib/config";
import { indexer } from "@/lib/env/server";
import { archiveClient, publicClient, serialiseBigints } from "@/lib/server/chain";
import type { ActivityEvent, ActivityKind, ActivityResponse } from "@/types/activity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Confirmed Robacha activity.
 *
 * Reads logs from the chain over a bounded recent window. Every row is a real
 * log at a real block; there is no seeding and no optimistic entry.
 *
 * Two honest limits, both reported rather than papered over:
 *
 *  - Without an archive endpoint the window is whatever the standard node
 *    retains, so this covers recent activity only. Full history needs the
 *    database-backed indexer.
 *  - Logs within `CONFIRMATIONS` of the head are excluded, so a reorg cannot
 *    surface an event that later disappears.
 */

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
const ROUND_SETTLED = parseAbiItem(
  "event RoundSettled(uint256 indexed roundId, uint256 routedBaseWei, uint256 routedSurchargeWei, uint16 refundedEntries)",
);

/** Blocks scanned when no archive endpoint narrows the question. */
const DEFAULT_WINDOW = 50_000n;

export async function GET(request: Request) {
  if (!contracts.gacha) {
    return NextResponse.json(
      { reason: "not-configured", error: "ROBACHA gacha contract is not configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const walletParam = url.searchParams.get("wallet");
  const wallet = walletParam?.toLowerCase() ?? null;
  const kinds = (url.searchParams.get("kinds") ?? "")
    .split(",")
    .map((kind) => kind.trim())
    .filter(Boolean) as ActivityKind[];

  const client = archiveClient() ?? publicClient();

  try {
    const head = await client.getBlockNumber();
    const confirmedTo = head > BigInt(CONFIRMATIONS) ? head - BigInt(CONFIRMATIONS) : 0n;
    const fromBlock = confirmedTo > DEFAULT_WINDOW ? confirmedTo - DEFAULT_WINDOW : 0n;

    const address = contracts.gacha as Address;
    const range = { address, fromBlock, toBlock: confirmedTo };

    const [spins, assigned, claimed, refunded, settled] = await Promise.all([
      client.getLogs({ ...range, event: SPIN_ENTERED }),
      client.getLogs({ ...range, event: REWARD_ASSIGNED }),
      client.getLogs({ ...range, event: REWARD_CLAIMED }),
      client.getLogs({ ...range, event: SPIN_REFUNDED }),
      client.getLogs({ ...range, event: ROUND_SETTLED }),
    ]);

    const events: ActivityEvent[] = [];
    const tokensSeen = new Set<string>();

    const push = (
      log: Log,
      kind: ActivityKind,
      fields: Partial<ActivityEvent>,
    ) => {
      if (kinds.length && !kinds.includes(kind)) return;
      if (wallet && fields.wallet && fields.wallet.toLowerCase() !== wallet) return;
      events.push({
        id: `${log.transactionHash}:${log.logIndex}`,
        kind,
        wallet: fields.wallet ?? null,
        txHash: log.transactionHash ?? "",
        logIndex: Number(log.logIndex ?? 0),
        blockNumber: Number(log.blockNumber ?? 0),
        at: 0, // filled in below from the block timestamp
        status: "confirmed",
        ...fields,
      } as ActivityEvent);
      if (fields.token) tokensSeen.add(fields.token.toLowerCase());
    };

    for (const log of spins) {
      push(log, "spin", {
        wallet: log.args.user ?? null,
        roundId: Number(log.args.roundId ?? 0),
        note: `${log.args.quantity} ${log.args.quantity === 1 ? "entry" : "entries"}`,
      });
    }
    for (const log of assigned) {
      push(log, "reward-assigned", {
        wallet: log.args.user ?? null,
        token: log.args.token,
        amountRaw: (log.args.amount ?? 0n).toString(),
        roundId: Number(log.args.roundId ?? 0),
      });
    }
    for (const log of claimed) {
      push(log, "claim", {
        wallet: log.args.user ?? null,
        token: log.args.token,
        amountRaw: (log.args.amount ?? 0n).toString(),
      });
    }
    for (const log of refunded) {
      push(log, "refund", {
        wallet: log.args.user ?? null,
        amountRaw: (log.args.amount ?? 0n).toString(),
      });
    }
    for (const log of settled) {
      push(log, "round-settled", {
        roundId: Number(log.args.roundId ?? 0),
        note:
          Number(log.args.refundedEntries ?? 0) > 0
            ? `${log.args.refundedEntries} entries refunded`
            : undefined,
      });
    }

    events.sort(
      (a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex,
    );
    const page = events.slice(0, limit);

    // Block timestamps, one read per distinct block on this page.
    const blocks = [...new Set(page.map((event) => event.blockNumber))];
    const timestamps = new Map<number, number>();
    await Promise.all(
      blocks.map(async (blockNumber) => {
        try {
          const block = await client.getBlock({ blockNumber: BigInt(blockNumber) });
          timestamps.set(blockNumber, Number(block.timestamp) * 1000);
        } catch {
          // A block we cannot read leaves `at` at 0; the row still shows, and
          // the age simply reads as unknown rather than being invented.
        }
      }),
    );
    for (const event of page) {
      event.at = timestamps.get(event.blockNumber) ?? 0;
    }

    // Token metadata for the rows on this page.
    const tokens = [...new Set(page.map((e) => e.token?.toLowerCase()).filter(Boolean))] as string[];
    if (tokens.length) {
      const metadata = (await client.multicall({
        contracts: tokens.flatMap((token) => [
          { address: token as Address, abi: erc20Abi, functionName: "symbol" as const },
          { address: token as Address, abi: erc20Abi, functionName: "name" as const },
          { address: token as Address, abi: erc20Abi, functionName: "decimals" as const },
        ]),
        allowFailure: true,
      })) as { status: "success" | "failure"; result?: unknown }[];

      const byToken = new Map<string, { symbol: string | null; name: string | null; decimals: number | null }>();
      tokens.forEach((token, index) => {
        const symbol = metadata[index * 3];
        const name = metadata[index * 3 + 1];
        const decimals = metadata[index * 3 + 2];
        byToken.set(token, {
          symbol: symbol?.status === "success" ? (symbol.result as string) : null,
          name: name?.status === "success" ? (name.result as string) : null,
          decimals: decimals?.status === "success" ? Number(decimals.result as number) : null,
        });
      });

      for (const event of page) {
        if (!event.token) continue;
        const meta = byToken.get(event.token.toLowerCase());
        event.tokenSymbol = meta?.symbol ?? null;
        event.tokenName = meta?.name ?? null;
        event.tokenDecimals = meta?.decimals ?? null;
      }
    }

    const response: ActivityResponse = {
      events: page,
      indexedBlock: Number(confirmedTo),
      headBlock: Number(head),
      // Direct log reads are always at the confirmed head, so this path is
      // synced by construction. The lag check matters once the database-backed
      // indexer serves this route.
      synced: Number(head) - Number(confirmedTo) <= indexer.maxLagBlocks,
    };

    return NextResponse.json(serialiseBigints(response));
  } catch (error) {
    return NextResponse.json(
      {
        reason: "indexer-unavailable",
        error: error instanceof Error ? error.message : "log query failed",
      },
      { status: 503 },
    );
  }
}
