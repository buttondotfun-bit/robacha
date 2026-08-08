"use client";

import { useMemo, useState } from "react";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { ArrowRight, ArrowUpRight, ExternalLink, Gift, RefreshCw, Wallet } from "lucide-react";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { ShareWin } from "@/components/rewards/ShareWin";
import { ClaimButton } from "./ClaimButton";
import { RefundPanel } from "./RefundPanel";
import { WalletHistory } from "./WalletHistory";
import { UnavailableState } from "@/components/shared/UnavailableState";
import { EmptyState } from "@/components/shared/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { chainConfig, explorerUrl } from "@/lib/config";
import { formatAmount, shortAddress, shortHash } from "@/lib/formatters";
import { useHoldings } from "@/lib/use-holdings";
import { useTokenMarket } from "@/lib/use-token-market";
import { usePool } from "@/lib/use-pool";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { useWalletRewards } from "@/lib/use-wallet-rewards";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/token";
import type { WalletReward } from "@/types/reward";

type Tab = "overview" | "rewards" | "balances";
type Filter = "all" | "unclaimed" | "claimed";

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

/**
 * My Bag — a personal Robacha inventory rather than a ledger dump.
 *
 * Two halves, neither inferred from the other: rewards the gacha contract
 * assigned (indexed logs) and live ERC-20 balances (a multicall). A personal
 * summary and tabs put what the wallet *has and won* first, its accounting
 * second, and every dollar figure is shown only when a token's price is
 * genuinely reliable — amount-only otherwise, never a guessed value.
 */
export function BagClient() {
  const wallet = useWallet();
  const { rewards, unclaimed, unavailable: rewardsUnavailable, isLoading: rewardsLoading, refetch: refetchRewards } =
    useWalletRewards();
  const { pool } = usePool();
  const { holdings, isLoading: holdingsLoading, isError: holdingsError, unavailableReason, refetch: refetchHoldings } =
    useHoldings();
  const { history } = useWalletHistory();
  const market = useTokenMarket([...rewards.map((r) => r.token), ...holdings.map((h) => h.token.token)]);

  const [tab, setTab] = useState<Tab>("overview");
  const [filter, setFilter] = useState<Filter>("all");

  const rarityOf = (r: WalletReward): Rarity | null =>
    r.rarity ?? pool?.tiers[r.tierIndex]?.rarity ?? null;

  // Group rewards by token for the inventory cards + the reward summary.
  const byToken = useMemo(() => {
    const map = new Map<string, { token: Address; symbol: string | null; decimals: number | null; totalRaw: bigint; pulls: number; topRarity: Rarity | null }>();
    for (const r of rewards) {
      const e = map.get(r.token) ?? { token: r.token as Address, symbol: r.symbol, decimals: r.decimals, totalRaw: 0n, pulls: 0, topRarity: null as Rarity | null };
      e.totalRaw += BigInt(r.amountRaw);
      e.pulls += 1;
      const ra = rarityOf(r);
      if (ra && (e.topRarity === null || RARITY_ORDER.indexOf(ra) > RARITY_ORDER.indexOf(e.topRarity))) e.topRarity = ra;
      map.set(r.token, e);
    }
    return [...map.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewards, pool]);

  // Rarity distribution across all pulls.
  const pulls = useMemo(() => {
    const c = { common: 0, rare: 0, legendary: 0, other: 0 };
    for (const r of rewards) {
      const ra = rarityOf(r);
      if (ra === "common" || ra === "uncommon") c.common += 1;
      else if (ra === "rare" || ra === "epic") c.rare += 1;
      else if (ra === "legendary") c.legendary += 1;
      else c.other += 1;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewards, pool]);

  // ---- gate: wallet + network ----
  if (!wallet.isConnected) {
    return (
      <div className="glass-panel overflow-hidden">
        <UnavailableState
          kind="disconnected"
          action={
            wallet.hasWallet ? (
              <Button variant="primary" size="md" onClick={() => void wallet.connect()} disabled={wallet.isConnecting}>
                <Wallet className="h-4 w-4" aria-hidden="true" /> Connect wallet
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }
  if (wallet.wrongNetwork) {
    return (
      <div className="glass-panel overflow-hidden">
        <UnavailableState
          kind="wrong-network"
          action={
            wallet.switchNetwork ? (
              <Button variant="primary" size="md" onClick={() => void wallet.switchNetwork()}>
                Switch to {chainConfig.name}
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const walletLink = wallet.address ? explorerUrl("address", wallet.address) : null;
  const value = (token: Address, amount: number | null): number | null => {
    const m = market.get(token);
    return m?.priceReliable && m.price != null && amount != null ? amount * m.price : null;
  };

  return (
    <div className="space-y-6">
      {/* Wallet + smart CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" />
          <span className="num text-[13px] font-medium text-ink">{wallet.address ? shortAddress(wallet.address) : ""}</span>
          <span className="text-[12px] text-ink-3">· {chainConfig.name}</span>
          {walletLink ? (
            <a href={walletLink} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-ink-2" aria-label="View wallet on the explorer">
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
        {unclaimed.length > 0 ? (
          <ClaimButton
            rewardIds={unclaimed.map((r) => r.rewardId)}
            label={`Claim ${unclaimed.length} ${unclaimed.length === 1 ? "reward" : "rewards"}`}
            size="md"
            variant="primary"
            onClaimed={refetchRewards}
          />
        ) : (
          <ButtonLink href="/app" variant="primary" size="md">
            Rob the Gacha <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        )}
      </div>

      {/* Summary strip */}
      <div className="glass-card grid grid-cols-2 divide-x divide-y divide-[rgb(var(--line-rgb)_/_0.08)] rounded-[18px] sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
        <Metric label="Rewards" value={rewardsLoading ? "—" : String(rewards.length)} />
        <Metric label="Unique tokens" value={rewardsLoading ? "—" : String(byToken.length)} />
        <Metric label="Rounds joined" value={history ? String(history.rounds) : "—"} />
        <Metric label="Spins bought" value={history ? String(history.spins) : "—"} />
        <Metric label="Claimable" value={rewardsLoading ? "—" : String(unclaimed.length)} accent={unclaimed.length > 0} />
      </div>

      {/* Tabs */}
      <div className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-[rgb(var(--line-rgb)_/_0.08)]">
        {(["overview", "rewards", "balances"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "relative shrink-0 px-3.5 pb-2.5 pt-1 text-[13px] font-medium capitalize transition-colors",
              tab === t ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {t}
            {tab === t ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#a6d900]" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>

      {/* ---------------- Overview ---------------- */}
      {tab === "overview" ? (
        <div className="space-y-6">
          <RefundPanel />

          {/* Your bag — token inventory */}
          <section>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Your bag.</h2>
            {rewardsLoading ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.05)]" />)}
              </div>
            ) : byToken.length ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {byToken.map((t) => {
                  const amount = t.decimals != null ? Number(formatUnits(t.totalRaw, t.decimals)) : null;
                  const usd = value(t.token, amount);
                  return (
                    <div key={t.token} data-rarity={t.topRarity ?? undefined} className="glass-card rounded-[16px] p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="h-9 w-9 overflow-hidden rounded-[10px] border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                          <TokenAvatar address={t.token} symbol={t.symbol} logoUrl={market.get(t.token)?.logoUrl} size={36} rounded="none" />
                        </span>
                        {t.topRarity ? <RarityChip rarity={t.topRarity} size="xs" showDot={false} /> : null}
                      </div>
                      <p className="num mt-2.5 truncate text-[15px] font-semibold">
                        {amount != null ? formatAmount(amount) : "—"} <span className="text-[12px] text-ink-3">{t.symbol ?? ""}</span>
                      </p>
                      <p className="text-[11px] text-ink-3">{t.pulls} {t.pulls === 1 ? "pull" : "pulls"}{usd != null ? ` · $${usd.toFixed(2)}` : ""}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <BagEmpty />
            )}
          </section>

          {/* Your pulls — rarity distribution */}
          {rewards.length > 0 ? (
            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Your pulls.</h2>
              <div className="mt-3 glass-card rounded-[16px] p-4">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full" aria-hidden="true">
                  {pulls.common ? <span className="h-full bg-[#9aa093]" style={{ width: `${(pulls.common / rewards.length) * 100}%` }} /> : null}
                  {pulls.rare ? <span className="h-full bg-[#4a87c4]" style={{ width: `${(pulls.rare / rewards.length) * 100}%` }} /> : null}
                  {pulls.legendary ? <span className="h-full bg-[#c9922b]" style={{ width: `${(pulls.legendary / rewards.length) * 100}%` }} /> : null}
                </div>
                <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
                  <PullLegend dot="#9aa093" label="Common" n={pulls.common} />
                  <PullLegend dot="#4a87c4" label="Rare" n={pulls.rare} />
                  <PullLegend dot="#c9922b" label="Legendary" n={pulls.legendary} />
                </ul>
              </div>
            </section>
          ) : null}

          {/* Robacha history */}
          <WalletHistory />

          {/* Recent rewards */}
          {rewards.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Recent rewards.</h2>
                {rewards.length > 5 ? (
                  <button type="button" onClick={() => setTab("rewards")} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink">
                    View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <div className="glass-panel overflow-hidden rounded-[24px]">
                <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] px-4">
                  {rewards.slice(0, 5).map((r) => (
                    <RewardRow key={r.rewardId} reward={r} rarity={rarityOf(r)} logoUrl={market.get(r.token)?.logoUrl} onClaimed={refetchRewards} />
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {/* ---------------- Rewards ---------------- */}
      {tab === "rewards" ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {(["all", "unclaimed", "claimed"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                    filter === f ? "bg-[rgb(var(--ink-rgb))] text-[rgb(var(--surface-rgb))]" : "glass-chip text-ink-2 hover:text-ink",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            {unclaimed.length > 1 ? (
              <ClaimButton rewardIds={unclaimed.map((r) => r.rewardId)} label={`Claim all ${unclaimed.length}`} size="md" variant="primary" onClaimed={refetchRewards} />
            ) : null}
          </div>

          <div className="glass-panel overflow-hidden rounded-[24px]">
            {rewardsUnavailable ? (
              <RewardsUnavailable reason={rewardsUnavailable} onRetry={refetchRewards} />
            ) : rewardsLoading ? (
              <div className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] px-4">
                {Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
              </div>
            ) : (() => {
              const list = rewards.filter((r) => (filter === "all" ? true : filter === "claimed" ? r.claimed : !r.claimed));
              return list.length ? (
                <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] px-4">
                  {list.map((r) => (
                    <RewardRow key={r.rewardId} reward={r} rarity={rarityOf(r)} logoUrl={market.get(r.token)?.logoUrl} onClaimed={refetchRewards} />
                  ))}
                </ul>
              ) : rewards.length ? (
                <p className="px-5 py-8 text-center text-[13px] text-ink-3">No {filter} rewards.</p>
              ) : (
                <BagEmpty inset />
              );
            })()}
          </div>
        </section>
      ) : null}

      {/* ---------------- Balances ---------------- */}
      {tab === "balances" ? (
        <section>
          <header className="mb-3">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Wallet balances.</h2>
            <p className="mt-1 text-[12.5px] text-ink-2">
              Live ERC-20 balances for the reward tokens, in your connected wallet — not funds held by Robacha.
            </p>
          </header>
          <div className="glass-panel overflow-hidden rounded-[24px]">
            {unavailableReason ? (
              <UnavailableState kind={unavailableReason} />
            ) : holdingsError ? (
              <UnavailableState kind="rpc-unavailable" action={<Button variant="secondary" size="md" onClick={() => void refetchHoldings()}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry</Button>} />
            ) : holdingsLoading ? (
              <div className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] px-4">
                {Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}
              </div>
            ) : holdings.length ? (
              <ul className="divide-y divide-[rgb(var(--line-rgb)_/_0.06)] px-4">
                {holdings.map((h) => {
                  const url = explorerUrl("token", h.token.token);
                  const usd = value(h.token.token, h.amount);
                  return (
                    <li key={h.token.token} className="flex items-center gap-3 py-3">
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
                        <TokenAvatar address={h.token.token} symbol={h.token.symbol} logoUrl={market.get(h.token.token)?.logoUrl} size={40} rounded="none" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold">{h.token.name ?? "Unknown token"}</p>
                        <p className="num mt-0.5 text-[11px] text-ink-3">{h.token.symbol ? `$${h.token.symbol}` : "metadata unavailable"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="num text-[13.5px] font-semibold">{formatAmount(h.amount)}</p>
                        {usd != null ? <p className="num text-[11px] text-ink-3">${usd.toFixed(2)}</p> : null}
                      </div>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-ink-3 hover:text-ink" aria-label={`Open ${h.token.symbol ?? "token"} contract on the explorer`}>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={<Wallet className="h-5 w-5" aria-hidden="true" />} title="No reward-token balances" description="This wallet holds none of the tokens in the active reward pool." />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ sub-parts
function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-4 py-3.5">
      <p className="micro text-ink-3">{label}</p>
      <p className={cn("num mt-1 text-[22px] font-semibold tracking-[-0.02em]", accent && "text-accent-ink")}>{value}</p>
    </div>
  );
}

function PullLegend({ dot, label, n }: { dot: string; label: string; n: number }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden="true" />
      {label} <span className="num text-ink">{n}</span>
    </li>
  );
}

/** A single reward row. Share is a moment for the best pulls, not a permanent
 *  pill on every row. */
function RewardRow({
  reward,
  rarity,
  logoUrl,
  onClaimed,
}: {
  reward: WalletReward;
  rarity: Rarity | null;
  logoUrl: string | null | undefined;
  onClaimed: () => void;
}) {
  return (
    <li data-rarity={rarity ?? undefined} className="flex items-center gap-3 py-3">
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgb(var(--edge-rgb)_/_0.8)] [container-type:inline-size]">
        <TokenAvatar address={reward.token} symbol={reward.symbol} logoUrl={logoUrl} size={40} rounded="none" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold">
          {reward.decimals != null ? formatAmount(Number(formatUnits(BigInt(reward.amountRaw), reward.decimals))) : "—"} {reward.symbol ?? ""}
        </p>
        <p className="num mt-0.5 truncate text-[11px] text-ink-3">
          Pool #{reward.poolId} · round #{reward.roundId} · {shortHash(reward.assignedTxHash)}
        </p>
      </div>
      {rarity ? <RarityChip rarity={rarity} size="xs" /> : null}
      <span
        className={`num shrink-0 rounded-full px-2 py-0.5 text-[10.5px] ${
          reward.claimed ? "bg-[rgb(var(--ink-rgb)_/_0.06)] text-ink-3" : "bg-[rgba(204,255,0,0.35)] text-ink"
        }`}
      >
        {reward.claimed ? "claimed" : "unclaimed"}
      </span>
      {reward.claimed ? null : <ClaimButton rewardIds={[reward.rewardId]} onClaimed={onClaimed} />}
      {rarity === "legendary" ? <ShareWin reward={reward} /> : null}
    </li>
  );
}

function RewardsUnavailable({ reason, onRetry }: { reason: string; onRetry: () => void }) {
  return (
    <UnavailableState
      kind={reason === "not-configured" ? "not-configured" : "rpc-unavailable"}
      title={reason === "indexer-behind" ? "Indexer is catching up" : reason === "indexer-unavailable" ? "Reward history is unavailable" : undefined}
      description={
        reason === "indexer-behind"
          ? "The indexer is behind the chain head. Your rewards are withheld until it is caught up so nothing shown here is stale."
          : reason === "indexer-unavailable"
            ? "The Robacha indexer is not reachable, so assigned rewards cannot be listed right now."
            : undefined
      }
      action={<Button variant="secondary" size="md" onClick={onRetry}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry</Button>}
    />
  );
}

function BagEmpty({ inset }: { inset?: boolean }) {
  const body = (
    <EmptyState
      icon={<Gift className="h-5 w-5" aria-hidden="true" />}
      title="Your bag is empty."
      description="The machine hasn't given this wallet anything yet. Prizes show up here once a spin settles and the contract assigns one."
      action={<ButtonLink href="/app" variant="primary" size="md">Spin the machine</ButtonLink>}
    />
  );
  return inset ? body : <div className="mt-3 glass-panel overflow-hidden rounded-[24px]">{body}</div>;
}
