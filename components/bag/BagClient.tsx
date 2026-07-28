"use client";

import { ExternalLink, Gift, RefreshCw, Wallet } from "lucide-react";
import { formatUnits } from "viem";
import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { RarityChip } from "@/components/shared/RarityChip";
import { ShareWin } from "@/components/rewards/ShareWin";
import { ClaimButton } from "./ClaimButton";
import { RefundPanel } from "./RefundPanel";
import { UnavailableState } from "@/components/shared/UnavailableState";
import { EmptyState } from "@/components/shared/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { RowSkeleton } from "@/components/ui/Skeleton";
import { chainConfig, explorerUrl } from "@/lib/config";
import { formatAmount, shortHash } from "@/lib/formatters";
import { useHoldings } from "@/lib/use-holdings";
import { useTokenMarket } from "@/lib/use-token-market";
import { usePool } from "@/lib/use-pool";
import { useWalletRewards } from "@/lib/use-wallet-rewards";
import { useWallet } from "@/lib/use-wallet";

/**
 * My Bag has two halves, and neither is inferred from the other:
 *
 *  - Robacha rewards assigned by the gacha contract, from indexed logs.
 *  - Live ERC-20 balances for the pool's reward tokens, from a multicall.
 *
 * When a source cannot answer, that half says so rather than borrowing the
 * other's data.
 */
export function BagClient() {
  const wallet = useWallet();
  const {
    rewards,
    unclaimed,
    unavailable: rewardsUnavailable,
    isLoading: rewardsLoading,
    refetch: refetchRewards,
  } = useWalletRewards();
  // Rarity is a label ranked by tier probability, which only the pool knows.
  // The reward carries its tier index; the pool names it.
  const { pool } = usePool();

  const {
    holdings,
    isLoading: holdingsLoading,
    isError: holdingsError,
    unavailableReason,
    refetch: refetchHoldings,
  } = useHoldings();

  const market = useTokenMarket([
    ...rewards.map((r) => r.token),
    ...holdings.map((h) => h.token.token),
  ]);

  if (!wallet.isConnected) {
    return (
      <div className="glass-panel overflow-hidden">
        <UnavailableState kind="disconnected" />
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
              <Button
                variant="primary"
                size="md"
                onClick={() => void wallet.switchNetwork()}
              >
                Switch to {chainConfig.name}
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Money owed comes first. Someone arriving here after being told their
          refund is waiting should see it before anything else. */}
      <RefundPanel />

      {/* Robacha rewards */}
      <section>
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-section-title text-[19px]">Robacha rewards</h2>
          {unclaimed.length > 1 ? (
            <ClaimButton
              rewardIds={unclaimed.map((r) => r.rewardId)}
              label={`Claim all ${unclaimed.length}`}
              size="md"
              variant="primary"
              onClaimed={refetchRewards}
            />
          ) : null}
          {unclaimed.length ? (
            <p className="num text-[12px] text-ink-2">
              {unclaimed.length} unclaimed
            </p>
          ) : null}
        </header>

        <div className="glass-panel overflow-hidden rounded-[24px]">
          {rewardsUnavailable ? (
            <UnavailableState
              kind={
                rewardsUnavailable === "not-configured"
                  ? "not-configured"
                  : "rpc-unavailable"
              }
              title={
                rewardsUnavailable === "indexer-behind"
                  ? "Indexer is catching up"
                  : rewardsUnavailable === "indexer-unavailable"
                    ? "Reward history is unavailable"
                    : undefined
              }
              description={
                rewardsUnavailable === "indexer-behind"
                  ? "The indexer is behind the chain head. Your rewards are withheld until it is caught up so nothing shown here is stale."
                  : rewardsUnavailable === "indexer-unavailable"
                    ? "The Robacha indexer is not reachable, so assigned rewards cannot be listed right now."
                    : undefined
              }
              action={
                <Button variant="secondary" size="md" onClick={refetchRewards}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </Button>
              }
            />
          ) : rewardsLoading ? (
            <div className="divide-y divide-[rgba(20,24,18,0.06)] px-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <RowSkeleton key={index} />
              ))}
            </div>
          ) : rewards.length ? (
            <ul className="divide-y divide-[rgba(20,24,18,0.06)] px-4">
              {rewards.map((reward) => (
                <li
                  key={reward.rewardId}
                  data-rarity={reward.rarity ?? undefined}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.8)] [container-type:inline-size]">
                    <TokenAvatar
                      address={reward.token}
                      symbol={reward.symbol}
                      logoUrl={market.get(reward.token)?.logoUrl}
                      size={40}
                      rounded="none"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">
                      {reward.decimals != null
                        ? formatAmount(
                            Number(
                              formatUnits(
                                BigInt(reward.amountRaw),
                                reward.decimals,
                              ),
                            ),
                          )
                        : "—"}{" "}
                      {reward.symbol ?? ""}
                    </p>
                    <p className="num mt-0.5 truncate text-[11px] text-ink-3">
                      Pool #{reward.poolId} · round #{reward.roundId} ·{" "}
                      {shortHash(reward.assignedTxHash)}
                    </p>
                  </div>
                  {(() => {
                    const rarity =
                      reward.rarity ?? pool?.tiers[reward.tierIndex]?.rarity ?? null;
                    return rarity ? <RarityChip rarity={rarity} size="xs" /> : null;
                  })()}
                  <span
                    className={`num shrink-0 rounded-full px-2 py-0.5 text-[10.5px] ${
                      reward.claimed
                        ? "bg-[rgba(16,17,15,0.06)] text-ink-3"
                        : "bg-[rgba(204,255,0,0.35)] text-ink"
                    }`}
                  >
                    {reward.claimed ? "claimed" : "unclaimed"}
                  </span>
                  {reward.claimed ? null : (
                    <ClaimButton
                      rewardIds={[reward.rewardId]}
                      onClaimed={refetchRewards}
                    />
                  )}
                  <ShareWin reward={reward} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Gift className="h-5 w-5" aria-hidden="true" />}
              title="Nothing in your bag yet."
              description="Prizes show up here once a spin has settled and the contract has assigned one to this wallet."
              action={
                <ButtonLink href="/app" variant="primary" size="md">
                  Open the pool
                </ButtonLink>
              }
            />
          )}
        </div>
      </section>

      {/* Live reward-token balances */}
      <section>
        <header className="mb-3">
          <h2 className="text-section-title text-[19px]">
            Reward token balances
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-2">
            Live ERC-20 balances for the tokens in the active pool, read from{" "}
            {chainConfig.name}.
          </p>
        </header>

        <div className="glass-panel overflow-hidden rounded-[24px]">
          {unavailableReason ? (
            <UnavailableState kind={unavailableReason} />
          ) : holdingsError ? (
            <UnavailableState
              kind="rpc-unavailable"
              action={
                <Button variant="secondary" size="md" onClick={() => void refetchHoldings()}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </Button>
              }
            />
          ) : holdingsLoading ? (
            <div className="divide-y divide-[rgba(20,24,18,0.06)] px-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <RowSkeleton key={index} />
              ))}
            </div>
          ) : holdings.length ? (
            <ul className="divide-y divide-[rgba(20,24,18,0.06)] px-4">
              {holdings.map((holding) => {
                const url = explorerUrl("token", holding.token.token);
                return (
                  <li
                    key={holding.token.token}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.8)] [container-type:inline-size]">
                      <TokenAvatar
                        address={holding.token.token}
                        symbol={holding.token.symbol}
                        logoUrl={market.get(holding.token.token)?.logoUrl}
                        size={40}
                        rounded="none"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">
                        {holding.token.name ?? "Unknown token"}
                      </p>
                      <p className="num mt-0.5 text-[11px] text-ink-3">
                        {holding.token.symbol
                          ? `$${holding.token.symbol}`
                          : "metadata unavailable"}
                      </p>
                    </div>
                    <p className="num shrink-0 text-[13.5px] font-semibold">
                      {formatAmount(holding.amount)}
                    </p>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-ink-3 hover:text-ink"
                        aria-label={`Open ${holding.token.symbol ?? "token"} contract on the explorer`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
              title="No reward-token balances"
              description="This wallet holds none of the tokens in the active reward pool."
            />
          )}
        </div>
      </section>
    </div>
  );
}
