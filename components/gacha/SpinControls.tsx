"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Sparkles, Wallet } from "lucide-react";
import { formatEther } from "viem";
import { ErrorState } from "@/components/shared/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  chainConfig,
  contracts,
  explorerUrl,
  PUBLIC_PAID_SPINS_ENABLED,
} from "@/lib/config";
import { shortAddress, shortHash } from "@/lib/formatters";
import { useSpin } from "@/lib/spin-store";
import { usePendingSpins, RoundState } from "@/lib/use-pending-spins";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";
import type { ActivePool, PoolReadiness } from "@/lib/use-pool";
import { QuantitySelector } from "./QuantitySelector";
import { ShareSpin } from "./ShareSpin";
import { SPIN_COPY, SpinStatus } from "./SpinStatus";

/**
 * Spin console.
 *
 * The action is gated on every production prerequisite in turn — the operator's
 * paid-spins flag, wallet, network, contract readiness, published price — and
 * each failed check produces a specific label rather than a generic disabled
 * button.
 *
 * Before a wallet is asked to sign, the full cost is broken out: the base
 * price, the randomness surcharge that pays for the cross-chain VRF request,
 * and where the base price is routed. None of those figures is authored here —
 * they are the values the pool version snapshotted on chain.
 */
export function SpinControls({
  pool,
  readiness,
  className,
}: {
  pool: ActivePool | null;
  readiness: PoolReadiness | null;
  className?: string;
}) {
  const spin = useSpin();
  const wallet = useWallet();
  const [confirming, setConfirming] = useState(false);
  const { pending } = usePendingSpins();

  // Spins already paid for. Whether a new spin joins them or starts a fresh
  // round decides what the confirmation has to warn about.
  const pendingTotal = pending.reduce((sum, row) => sum + row.entries, 0);
  const openRound = pending.find((row) => row.state === RoundState.Open);

  const busy = SPIN_COPY[spin.phase].busy;

  const baseWei = pool?.spinPriceWei ?? 0n;
  const surchargeWei = pool?.surchargeWei ?? 0n;
  const perEntryWei = baseWei + surchargeWei;
  const quantity = BigInt(spin.quantity);
  const totalBaseWei = baseWei * quantity;
  const totalSurchargeWei = surchargeWei * quantity;
  const totalWei = perEntryWei * quantity;

  const onRightNetwork = wallet.isConnected && !wallet.wrongNetwork;
  const contractReady = readiness?.ready ?? false;

  // Highest-priority blocker decides the label.
  const blocker: { label: string; note: string | null } = !PUBLIC_PAID_SPINS_ENABLED
    ? {
        label: "Spins Aren’t Open Yet",
        note: "We haven’t switched on paid spins yet.",
      }
    : !wallet.isConnected
      ? { label: "Connect Wallet", note: null }
      : wallet.wrongNetwork
        ? { label: `Switch to ${chainConfig.name}`, note: null }
        : !readiness
          ? {
              label: "Can’t Reach the Pool",
              note: "We couldn’t load the pool just now.",
            }
          : !readiness.poolOpen
            ? { label: "No Pool Open", note: "There’s no pool running right now." }
            : !readiness.notPaused
              ? { label: "Spins Paused", note: "Spins are switched off for now." }
              : !readiness.randomnessAvailable
                ? {
                    label: "Random Draw Unavailable",
                    note:
                      readiness.randomnessReason ||
                      "The random draw isn’t available, so we can’t pick a reward.",
                  }
                : baseWei === 0n
                  ? {
                      label: "Price Unavailable",
                      note: "We couldn’t load the spin price.",
                    }
                  : { label: "Rob the Gacha", note: null };

  const canSpin =
    PUBLIC_PAID_SPINS_ENABLED && onRightNetwork && contractReady && baseWei > 0n && !busy;
  const label = busy ? SPIN_COPY[spin.phase].label : blocker.label;
  const txLink = spin.txHash ? explorerUrl("tx", spin.txHash) : null;

  const gachaLink = contracts.gacha ? explorerUrl("address", contracts.gacha) : null;
  const vaultLink = contracts.rewardVault
    ? explorerUrl("address", contracts.rewardVault)
    : null;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold tracking-[-0.02em]">How many spins?</p>
        <span className="num text-[12px] text-ink-2">
          {baseWei > 0n
            ? `${formatEther(perEntryWei)} ${chainConfig.nativeSymbol} / spin`
            : "Price unavailable"}
        </span>
      </div>

      <QuantitySelector
        className="mt-3"
        value={spin.quantity}
        onChange={spin.setQuantity}
        max={pool?.maxQuantityPerTx}
        disabled={busy || !contractReady}
      />

      {/* Full cost and routing disclosure, before any signature is requested. */}
      <dl className="mt-4 space-y-2 border-t border-[rgba(20,24,18,0.08)] pt-3.5 text-[13px]">
        <Row label="Spin price">
          {baseWei > 0n
            ? `${formatEther(totalBaseWei)} ${chainConfig.nativeSymbol}`
            : "Unavailable"}
        </Row>
        <Row label="Random draw fee" hint="Pays for the random draw itself. We don’t keep any of it.">
          {baseWei > 0n
            ? `${formatEther(totalSurchargeWei)} ${chainConfig.nativeSymbol}`
            : "Unavailable"}
        </Row>
        <Row label="Network fee">
          <span className="text-[12px] text-ink-3">Your wallet works this out when you sign</span>
        </Row>
        <div className="flex items-center justify-between border-t border-[rgba(20,24,18,0.08)] pt-2">
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="num font-semibold text-ink">
            {baseWei > 0n
              ? `${formatEther(totalWei)} ${chainConfig.nativeSymbol}`
              : "Unavailable"}
          </dd>
        </div>
      </dl>

      {pool ? (
        <dl className="mt-3 space-y-1.5 rounded-2xl bg-[rgba(16,17,15,0.03)] p-3 text-[11.5px]">
          <p className="micro mb-1.5">Where your spin price goes</p>
          <Row small label="Into prizes">
            {(pool.rewardReserveBps / 100).toFixed(2)}%
          </Row>
          <Row small label="To ROBACHA">
            {(pool.protocolFeeBps / 100).toFixed(2)}%
          </Row>
          <Row small label="Running costs">
            {(pool.operationsFeeBps / 100).toFixed(2)}%
          </Row>
        </dl>
      ) : null}

      <dl className="mt-3 space-y-2 text-[13px]">
        <Row label="Network">
          <span className="flex items-center gap-1.5 text-[12px] text-ink">
            <span
              className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]"
              aria-hidden="true"
            />
            {chainConfig.name}
          </span>
        </Row>
        <Row label="Wallet">
          <span className="num text-[12px] text-ink">
            {wallet.address ? shortAddress(wallet.address) : "Not connected"}
          </span>
        </Row>
        {wallet.balance ? (
          <Row label="Balance">
            <span className="num text-[12px] text-ink">{wallet.balance}</span>
          </Row>
        ) : null}
      </dl>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        Every spin has the same odds shown above — one pull never changes the
        next. Your reward is picked by Chainlink&rsquo;s random draw once the
        round closes, and nobody at ROBACHA gets to choose it. Token values go
        up and down.
      </p>

      {gachaLink || vaultLink ? (
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3">
          {gachaLink ? (
            <a
              href={gachaLink}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-ink-2"
            >
              See the pool contract
            </a>
          ) : null}
          {vaultLink ? (
            <a
              href={vaultLink}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-ink-2"
            >
              See the prize vault
            </a>
          ) : null}
        </p>
      ) : null}

      {spin.phase === "error" && spin.error ? (
        <ErrorState
          className="mt-3"
          title="Spin not sent"
          description={spin.error}
          action={
            <Button size="sm" variant="secondary" onClick={spin.reset}>
              Dismiss
            </Button>
          }
        />
      ) : (
        <SpinStatus phase={spin.phase} className="mt-3" />
      )}

      {/* Both appear only once a real transaction exists to point at. */}
      {txLink ? (
        <div className="mt-2 flex items-center gap-2">
          <ButtonLink
            href={txLink}
            external
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            <span className="num">{shortHash(spin.txHash ?? "")}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </ButtonLink>
          <ShareSpin quantity={spin.quantity} />
        </div>
      ) : null}

      <Button
        id="spin-action"
        variant="primary"
        size="lg"
        fullWidth
        className="mt-3"
        disabled={busy || !PUBLIC_PAID_SPINS_ENABLED || (onRightNetwork && !canSpin)}
        onClick={() => {
          if (!wallet.isConnected) {
            void wallet.connect();
            return;
          }
          if (wallet.wrongNetwork) {
            void wallet.switchNetwork();
            return;
          }
          if (!canSpin) return;
          setConfirming(true);
        }}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : onRightNetwork ? (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Wallet className="h-4 w-4" aria-hidden="true" />
        )}
        {label}
      </Button>

      {blocker.note ? (
        <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-ink-3">
          {blocker.note}
        </p>
      ) : null}

      {/* Last stop before a signature is requested. Restates the exact amount
          leaving the wallet and the fact that it cannot be undone, because the
          wallet prompt itself shows a raw number with no context. */}
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Confirm your spin"
        description={`${spin.quantity} spin${spin.quantity === 1 ? "" : "s"} on ${pool?.name ?? "this pool"}`}
      >
        <dl className="space-y-2 rounded-[16px] bg-[rgba(16,17,15,0.035)] p-4 text-[13px]">
          <Row label="Spin price">
            {`${formatEther(totalBaseWei)} ${chainConfig.nativeSymbol}`}
          </Row>
          <Row label="Random draw fee">
            {`${formatEther(totalSurchargeWei)} ${chainConfig.nativeSymbol}`}
          </Row>
          <div className="flex items-center justify-between border-t border-[rgba(20,24,18,0.1)] pt-2">
            <dt className="font-semibold text-ink">Leaving your wallet</dt>
            <dd className="num font-semibold text-ink">
              {`${formatEther(totalWei)} ${chainConfig.nativeSymbol}`}
            </dd>
          </div>
        </dl>

        {/* Someone with money already in flight is the most likely person to
            pay twice by mistake, so say plainly what this button does to it. */}
        {pendingTotal > 0 ? (
          <div className="mt-3.5 rounded-[14px] border border-[#eadfc4] bg-[#fdfaf2] px-3.5 py-3">
            <p className="text-[12.5px] font-medium text-ink">
              You already have {pendingTotal}{" "}
              {pendingTotal === 1 ? "spin" : "spins"} waiting
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
              {openRound
                ? `This adds to round #${openRound.roundId}, which helps it fill up and finish sooner.`
                : "This buys a new spin in a new round. It doesn't retry or speed up the ones you're waiting on."}
            </p>
          </div>
        ) : null}

        <p className="mt-3.5 text-[12px] leading-relaxed text-ink-2">
          Once this is signed it can&rsquo;t be cancelled — entries have to be
          locked before the draw happens. If the draw can&rsquo;t be completed
          you get the full amount back.
        </p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
          Your wallet adds its own network fee on top. Every spin is chance, and
          token rewards go up and down in value.
        </p>

        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => setConfirming(false)}
          >
            Back
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={() => {
              setConfirming(false);
              void spin.spin(perEntryWei);
            }}
          >
            Confirm &amp; sign
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  hint,
  small,
  children,
}: {
  label: string;
  hint?: string;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={small ? "text-ink-3" : "text-ink-2"}>
        {label}
        {hint ? (
          <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-3">
            {hint}
          </span>
        ) : null}
      </dt>
      <dd className={cn("num shrink-0", small ? "text-ink-2" : "text-ink")}>
        {children}
      </dd>
    </div>
  );
}
