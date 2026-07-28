"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { formatUnits } from "viem";
import type { LeaderboardResponse } from "@/app/api/leaderboard/route";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { EmptyState } from "@/components/shared/primitives";
import { UnavailableState } from "@/components/shared/UnavailableState";
import { explorerUrl } from "@/lib/config";
import { formatAmount, shortAddress } from "@/lib/formatters";
import { usePool } from "@/lib/use-pool";
import { useTokenMarket } from "@/lib/use-token-market";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";

/**
 * The biggest pulls and the busiest wallets, from chain logs.
 *
 * Pulls are ranked within each token rather than across them, because ranking
 * across would need a dependable price for every reward token and one of them
 * has no liquid market. A single combined table would have to invent a rate or
 * quietly drop a token; two honest tables do neither.
 *
 * Wallet addresses only — they are already public, and nothing here connects
 * one to a person. The connected wallet is highlighted where it appears, which
 * is the only personalisation.
 */
export function LeaderboardClient() {
  const wallet = useWallet();
  const { pool } = usePool();

  const query = useQuery({
    queryKey: ["robacha", "leaderboard"],
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/leaderboard", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("leaderboard unavailable");
      return (await response.json()) as LeaderboardResponse;
    },
  });

  const board = query.data;
  const market = useTokenMarket(board?.biggestPulls.map((b) => b.token) ?? []);
  const me = wallet.address?.toLowerCase() ?? null;

  if (query.isError) {
    return (
      <div className="glass-panel overflow-hidden rounded-[24px]">
        <UnavailableState kind="rpc-unavailable" />
      </div>
    );
  }

  if (query.isPending || !board) {
    return (
      <div className="glass-panel rounded-[24px] p-6">
        <p className="text-[12.5px] text-ink-3">Reading the chain…</p>
      </div>
    );
  }

  if (board.totalSpins === 0) {
    return (
      <div className="glass-panel overflow-hidden rounded-[24px]">
        <EmptyState
          icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
          title="Nobody has spun yet."
          description="The moment someone does, they'll be at the top of this page."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-[18px] px-4 py-3.5">
          <dt className="micro">Spins, all time</dt>
          <dd className="num mt-1 text-[19px] font-semibold tracking-[-0.02em]">
            {board.totalSpins.toLocaleString()}
          </dd>
        </div>
        <div className="glass-card rounded-[18px] px-4 py-3.5">
          <dt className="micro">Prizes handed out</dt>
          <dd className="num mt-1 text-[19px] font-semibold tracking-[-0.02em]">
            {board.totalPrizes.toLocaleString()}
          </dd>
        </div>
      </dl>

      <section>
        <header className="mb-3">
          <h2 className="text-section-title text-[19px]">Most spins</h2>
        </header>
        <div className="glass-panel overflow-hidden rounded-[24px] px-4">
          <ul className="divide-y divide-[rgba(20,24,18,0.06)]">
            {board.mostSpins.map((row, index) => (
              <li
                key={row.user}
                className={cn(
                  "flex items-center gap-3 py-3",
                  row.user.toLowerCase() === me && "-mx-4 bg-accent-soft px-4",
                )}
              >
                <Rank index={index} />
                <Who address={row.user} isMe={row.user.toLowerCase() === me} />
                <p className="num shrink-0 text-[13.5px] font-semibold">
                  {row.spins} {row.spins === 1 ? "spin" : "spins"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {board.biggestPulls.map((tokenBoard) => {
        const meta = market.get(tokenBoard.token);
        return (
          <section key={tokenBoard.token}>
            <header className="mb-3 flex items-center gap-2.5">
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.8)] [container-type:inline-size]">
                <TokenAvatar
                  address={tokenBoard.token}
                  symbol={tokenBoard.symbol}
                  logoUrl={meta?.logoUrl ?? null}
                  size={28}
                  rounded="none"
                />
              </span>
              <h2 className="text-section-title text-[19px]">
                Biggest {tokenBoard.symbol ?? "token"} pulls
              </h2>
            </header>

            <div className="glass-panel overflow-hidden rounded-[24px] px-4">
              <ul className="divide-y divide-[rgba(20,24,18,0.06)]">
                {tokenBoard.entries.map((entry, index) => {
                  const amount =
                    tokenBoard.decimals !== null
                      ? Number(formatUnits(BigInt(entry.amountRaw), tokenBoard.decimals))
                      : null;
                  const priced =
                    amount !== null && meta?.price != null && meta.priceReliable
                      ? amount * meta.price
                      : null;
                  const rarity = pool?.tiers[entry.tierIndex]?.rarity ?? null;

                  return (
                    <li
                      key={`${entry.roundId}-${entry.user}-${entry.amountRaw}`}
                      data-rarity={rarity ?? undefined}
                      className={cn(
                        "flex items-center gap-3 py-3",
                        entry.user.toLowerCase() === me && "-mx-4 bg-accent-soft px-4",
                      )}
                    >
                      <Rank index={index} />
                      <Who address={entry.user} isMe={entry.user.toLowerCase() === me} />
                      {rarity ? <RarityChip rarity={rarity} size="xs" /> : null}
                      <div className="shrink-0 text-right">
                        <p className="num text-[13.5px] font-semibold">
                          {amount !== null ? formatAmount(amount) : "—"}{" "}
                          {tokenBoard.symbol ?? ""}
                        </p>
                        <p className="num text-[11px] text-ink-3">
                          {priced !== null ? `$${priced.toFixed(2)}` : `round #${entry.roundId}`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      })}

      <p className="text-[11.5px] leading-relaxed text-ink-3">
        Read from the chain, all time. Pulls are ranked within each token —
        different tokens are worth different amounts, and some have no dependable
        market price, so a single combined ranking would be guesswork.
      </p>
    </div>
  );
}

function Rank({ index }: { index: number }) {
  return (
    <span
      className={cn(
        "num grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
        index === 0
          ? "bg-[rgba(204,255,0,0.5)] text-ink"
          : "bg-[rgba(16,17,15,0.06)] text-ink-2",
      )}
      aria-label={`Rank ${index + 1}`}
    >
      {index + 1}
    </span>
  );
}

function Who({ address, isMe }: { address: string; isMe: boolean }) {
  const url = explorerUrl("address", address);
  return (
    <div className="min-w-0 flex-1">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="num truncate text-[13px] font-medium text-ink hover:underline"
        >
          {shortAddress(address)}
        </a>
      ) : (
        <p className="num truncate text-[13px] font-medium text-ink">
          {shortAddress(address)}
        </p>
      )}
      {isMe ? <p className="text-[11px] text-accent-ink">That&rsquo;s you</p> : null}
    </div>
  );
}
