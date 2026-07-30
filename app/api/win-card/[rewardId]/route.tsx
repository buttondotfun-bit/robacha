import { ImageResponse } from "next/og";
import { erc20Abi, formatUnits, type Address } from "viem";
import { ROBACHA_GACHA_ABI, ROBACHA_POOL_REGISTRY_ABI } from "@/lib/abi";
import { contracts } from "@/lib/config";
import { publicClient } from "@/lib/server/chain";

export const runtime = "nodejs";

/**
 * A shareable image of a real pull.
 *
 * Sharing was text-only, and nobody screenshots a sentence. This renders the
 * pull as a card worth posting.
 *
 * Everything on it is read from chain using the reward id alone. That is the
 * whole design: the obvious version takes symbol, amount and rarity as query
 * parameters, and would let anyone mint an official-looking card claiming a
 * legendary they never pulled. Since this image carries our name, it has to be
 * unforgeable — so the only input is an id, and the contract supplies the rest.
 *
 * A reward id that does not exist renders nothing rather than an empty card.
 */

const RARITY: Record<string, { label: string; ink: string; wash: string }> = {
  common: { label: "Common", ink: "#575d52", wash: "#f2f3ee" },
  uncommon: { label: "Uncommon", ink: "#367135", wash: "#e9f8e6" },
  rare: { label: "Rare", ink: "#2a5c8e", wash: "#e9f3fd" },
  epic: { label: "Epic", ink: "#63419a", wash: "#f3eefd" },
  legendary: { label: "Legendary", ink: "#8c5a09", wash: "#fdf4e3" },
};

/** Ranked by probability, exactly as the interface does it. */
function rarityFor(index: number, probabilities: readonly number[]): string {
  if (!probabilities.length) return "common";
  const order = [...probabilities.keys()].sort(
    (a, b) => Number(probabilities[b]) - Number(probabilities[a]),
  );
  const rank = order.indexOf(index);
  return ["common", "uncommon", "rare", "epic", "legendary"][rank] ?? "common";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ rewardId: string }> },
) {
  const { rewardId } = await params;
  const id = Number(rewardId);

  if (!Number.isInteger(id) || id < 0 || !contracts.gacha) {
    return new Response("not found", { status: 404 });
  }

  try {
    const client = publicClient();
    const reward = (await client.readContract({
      address: contracts.gacha,
      abi: ROBACHA_GACHA_ABI,
      functionName: "getReward",
      args: [BigInt(id)],
    })) as {
      rewardId: bigint;
      roundId: bigint;
      user: Address;
      token: Address;
      amount: bigint;
      tierIndex: number;
    };

    // A zero address means the id has never been issued.
    if (!reward.token || reward.token === "0x0000000000000000000000000000000000000000") {
      return new Response("not found", { status: 404 });
    }

    const [symbol, decimals] = (await client.multicall({
      contracts: [
        { address: reward.token, abi: erc20Abi, functionName: "symbol" as const },
        { address: reward.token, abi: erc20Abi, functionName: "decimals" as const },
      ],
      allowFailure: true,
    })) as { status: "success" | "failure"; result?: unknown }[];

    // Rarity is a label over the pool's tier probabilities, so it has to come
    // from the round's own pool version rather than being assumed.
    let rarity = "common";
    try {
      const round = (await client.readContract({
        address: contracts.gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName: "getRound",
        args: [reward.roundId],
      })) as { poolId: bigint; version: bigint };

      if (contracts.poolRegistry) {
        const probabilities = (await client.readContract({
          address: contracts.poolRegistry,
          abi: ROBACHA_POOL_REGISTRY_ABI,
          functionName: "getProbabilities",
          args: [round.poolId, round.version],
        })) as readonly number[];
        rarity = rarityFor(Number(reward.tierIndex), probabilities);
      }
    } catch {
      /* fall back to the neutral label rather than guessing a flashier one */
    }

    const ticker = symbol?.status === "success" ? (symbol.result as string) : "TOKEN";
    const dp = decimals?.status === "success" ? Number(decimals.result as number) : 18;
    const amount = Number(formatUnits(reward.amount, dp));
    const shown =
      amount >= 1000
        ? amount.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : amount.toLocaleString(undefined, { maximumFractionDigits: 2 });

    const tone = RARITY[rarity] ?? RARITY.common;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
            background: `linear-gradient(135deg, #fbfdf7 0%, ${tone.wash} 100%)`,
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#10110f",
              }}
            >
              ROBACHA
            </div>
            <div
              style={{
                display: "flex",
                padding: "6px 16px",
                borderRadius: 999,
                background: "#ffffff",
                color: tone.ink,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {tone.label}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, color: "#5b6157" }}>
              I pulled
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                marginTop: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 116,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: "#10110f",
                }}
              >
                {shown}
              </div>
              <div
                style={{
                  display: "flex",
                  marginLeft: 24,
                  fontSize: 56,
                  fontWeight: 600,
                  color: tone.ink,
                }}
              >
                {`$${ticker}`}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              fontSize: 24,
              color: "#767c71",
            }}
          >
            <div style={{ display: "flex" }}>
              {`Round #${reward.roundId.toString()} · verified on Robinhood Chain`}
            </div>
            <div style={{ display: "flex", fontWeight: 600, color: "#10110f" }}>
              robacha.fun
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      },
    );
  } catch {
    return new Response("not found", { status: 404 });
  }
}
