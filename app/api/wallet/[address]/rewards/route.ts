import { NextResponse } from "next/server";
import { erc20Abi, isAddress, type Address } from "viem";
import { ROBACHA_GACHA_ABI } from "@/lib/abi";
import { contracts } from "@/lib/config";
import { publicClient, serialiseBigints } from "@/lib/server/chain";
import type { WalletReward, WalletRewardsResponse } from "@/types/reward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Rewards assigned to a wallet.
 *
 * Read directly from the gacha contract rather than from an index, so the
 * answer is exactly current chain state and needs no database. Claim status
 * comes from the same read, which means a reward can never show as unclaimed
 * after it has been claimed.
 *
 * The wallet address is taken from the path and validated here — it is never
 * trusted as an ownership claim. Nothing in this route grants any capability;
 * it only reports what the contract already says publicly.
 */
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

  const client = publicClient();

  try {
    const [headBlock, rewardIds] = await Promise.all([
      client.getBlockNumber(),
      client.readContract({
        address: contracts.gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName: "rewardsOf",
        args: [address as Address],
      }) as Promise<readonly bigint[]>,
    ]);

    if (rewardIds.length === 0) {
      const empty: WalletRewardsResponse = {
        rewards: [],
        indexedBlock: Number(headBlock),
        headBlock: Number(headBlock),
        synced: true,
      };
      return NextResponse.json(empty);
    }

    const rewards = (await client.multicall({
      contracts: rewardIds.map((rewardId) => ({
        address: contracts.gacha as Address,
        abi: ROBACHA_GACHA_ABI,
        functionName: "getReward" as const,
        args: [rewardId],
      })),
      allowFailure: true,
    })) as { status: "success" | "failure"; result?: unknown }[];

    type RawReward = {
      rewardId: bigint;
      roundId: bigint;
      entryIndex: bigint;
      user: Address;
      token: Address;
      amount: bigint;
      tierIndex: number;
      claimed: boolean;
    };

    const raw = rewards
      .map((entry) => (entry.status === "success" ? (entry.result as RawReward) : null))
      .filter((entry): entry is RawReward => entry !== null);

    // One metadata read per distinct token, not per reward.
    const tokens = [...new Set(raw.map((reward) => reward.token.toLowerCase()))];
    const metadata = (await client.multicall({
      contracts: tokens.flatMap((token) => [
        { address: token as Address, abi: erc20Abi, functionName: "symbol" as const },
        { address: token as Address, abi: erc20Abi, functionName: "name" as const },
        { address: token as Address, abi: erc20Abi, functionName: "decimals" as const },
      ]),
      allowFailure: true,
    })) as { status: "success" | "failure"; result?: unknown }[];

    const byToken = new Map<
      string,
      { symbol: string | null; name: string | null; decimals: number | null }
    >();
    tokens.forEach((token, index) => {
      const symbol = metadata[index * 3];
      const name = metadata[index * 3 + 1];
      const decimals = metadata[index * 3 + 2];
      byToken.set(token, {
        symbol: symbol?.status === "success" ? (symbol.result as string) : null,
        name: name?.status === "success" ? (name.result as string) : null,
        decimals:
          decimals?.status === "success" ? Number(decimals.result as number) : null,
      });
    });

    const payload: WalletReward[] = raw.map((reward) => {
      const meta = byToken.get(reward.token.toLowerCase());
      return {
        rewardId: reward.rewardId.toString(),
        poolId: 0,
        roundId: Number(reward.roundId),
        spinEntryId: `${reward.roundId}:${reward.entryIndex}`,
        token: reward.token,
        symbol: meta?.symbol ?? null,
        name: meta?.name ?? null,
        decimals: meta?.decimals ?? null,
        amountRaw: reward.amount.toString(),
        // Rarity is a presentation label derived from tier probability rank;
        // the client applies it from the pool it is already reading.
        rarity: null,
        claimed: reward.claimed,
        // These come from the indexer once it is running; a direct contract read
        // cannot recover the transaction a reward was assigned in.
        assignedTxHash: "",
        assignedAt: 0,
        claimedTxHash: null,
        claimedAt: null,
      };
    });

    const response: WalletRewardsResponse = {
      rewards: payload,
      indexedBlock: Number(headBlock),
      headBlock: Number(headBlock),
      synced: true,
    };

    return NextResponse.json(serialiseBigints(response));
  } catch (error) {
    return NextResponse.json(
      {
        reason: "indexer-unavailable",
        error: error instanceof Error ? error.message : "chain read failed",
      },
      { status: 503 },
    );
  }
}
