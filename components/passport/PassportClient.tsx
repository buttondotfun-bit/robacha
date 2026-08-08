"use client";

import Link from "next/link";
import { ArrowRight, Check, Lock, Trophy, Wallet } from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/lib/use-wallet";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { deriveAchievements, achievementSummary } from "@/lib/passport";
import { shortAddress } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * A wallet's Robacha passport.
 *
 * Everything is derived from the connected wallet's on-chain history (see
 * lib/passport) — no server state, no awarding, no fabrication. Not connected,
 * empty, and unreachable are three different states with three different
 * messages; a wallet that has done nothing shows honest locked badges rather
 * than an empty page.
 */
export function PassportClient() {
  const wallet = useWallet();
  const { history, isLoading, unavailable } = useWalletHistory();

  if (!wallet.isConnected) {
    return (
      <Gate>
        <Button variant="primary" size="md" onClick={() => void wallet.connect()} disabled={wallet.isConnecting}>
          <Wallet className="h-4 w-4" aria-hidden="true" /> Connect wallet
        </Button>
      </Gate>
    );
  }

  return (
    <PageContainer width="wide" className="pb-20 pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
          <Trophy className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" /> Derived from your on-chain history
        </span>
        {wallet.address ? (
          <span className="num glass-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-ink-2">{shortAddress(wallet.address, 4)}</span>
        ) : null}
      </div>
      <h1 className="text-page-title mt-4">Your passport</h1>
      <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-ink-2">
        Badges you&rsquo;ve earned by using the machine — every one read from what
        this wallet has actually done on chain. Nothing here is granted; it&rsquo;s
        all just true.
      </p>

      {isLoading && !history ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-[18px] bg-[rgb(var(--ink-rgb)_/_0.04)]" />
          ))}
        </div>
      ) : unavailable || !history ? (
        <div className="mt-8 glass-card rounded-[18px] p-6 text-[13px] text-ink-3">
          Your history is temporarily unreachable. It reads straight from the chain — nothing is inferred while it&rsquo;s down. Try again shortly.
        </div>
      ) : (
        <PassportBody history={history} />
      )}
    </PageContainer>
  );
}

function PassportBody({ history }: { history: ReturnType<typeof useWalletHistory>["history"] }) {
  if (!history) return null;
  const achievements = deriveAchievements(history);
  const { earned, total } = achievementSummary(achievements);
  const pct = Math.round((earned / total) * 100);

  return (
    <>
      {/* Summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr]">
        <div className="glass-panel rounded-[20px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Badges earned</p>
            <span className="num text-[12px] text-ink-3">{pct}%</span>
          </div>
          <p className="num mt-2 text-[32px] font-semibold leading-none tracking-[-0.03em]">
            {earned} <span className="text-[18px] text-ink-3">/ {total}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)]">
            <span className="block h-full rounded-full bg-[linear-gradient(90deg,#b6e800,#7aa80e)]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Stat value={history.spins} label="Spins" />
        <Stat value={history.rewards.length} label="Projects discovered" accent />
      </div>

      {/* Grid */}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => (
          <li
            key={a.key}
            className={cn(
              "rounded-[18px] border p-5 transition-colors",
              a.earned
                ? "border-[rgba(142,197,0,0.4)] bg-[rgba(142,197,0,0.06)]"
                : "border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)]",
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full",
                  a.earned ? "bg-[rgba(142,197,0,0.18)] text-[#3f7d17]" : "bg-[rgb(var(--ink-rgb)_/_0.05)] text-ink-3",
                )}
              >
                {a.earned ? <Check className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
              <span className="num text-[11px] text-ink-3">{a.readout}</span>
            </div>
            <h3 className="mt-3 text-[14.5px] font-semibold tracking-[-0.01em]">{a.title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{a.desc}</p>
            {!a.earned && a.progress > 0 ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)]">
                <span className="block h-full rounded-full bg-[rgb(var(--ink-rgb)_/_0.2)]" style={{ width: `${Math.round(a.progress * 100)}%` }} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/app" className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(186,232,0,0.98))] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)]">
          Keep spinning <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href="/receipts" className="glass-chip inline-flex h-11 items-center rounded-full px-5 text-[14px] font-semibold text-ink">
          See your receipts
        </Link>
      </div>
    </>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer width="wide" className="pb-24 pt-8">
      <h1 className="text-page-title">Your passport</h1>
      <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
        Your Robacha badges, derived from what this wallet has done on chain.
        Connect a wallet to see yours.
      </p>
      <div className="mt-6">{children}</div>
    </PageContainer>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="glass-card rounded-[20px] p-5">
      <p className={cn("num text-[32px] font-semibold leading-none tracking-[-0.03em]", accent && "text-accent-ink")}>{value}</p>
      <p className="micro mt-2 text-ink-3">{label}</p>
    </div>
  );
}
