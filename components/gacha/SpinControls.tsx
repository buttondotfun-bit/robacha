"use client";

import { ExternalLink, Loader2, Sparkles, Wallet } from "lucide-react";
import { formatEther } from "viem";
import { ErrorState } from "@/components/shared/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  chainConfig,
  contracts,
  explorerUrl,
  PUBLIC_PAID_SPINS_ENABLED,
} from "@/lib/config";
import { shortAddress, shortHash } from "@/lib/formatters";
import { useSpin } from "@/lib/spin-store";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";
import type { ActivePool, PoolReadiness } from "@/lib/use-pool";
import { QuantitySelector } from "./QuantitySelector";
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
        label: "Spins Not Yet Open",
        note: "Public paid spins have not been enabled for this deployment.",
      }
    : !wallet.isConnected
      ? { label: "Connect Wallet", note: null }
      : wallet.wrongNetwork
        ? { label: `Switch to ${chainConfig.name}`, note: null }
        : !readiness
          ? {
              label: "Pool Unavailable",
              note: "Pool state could not be read from the chain.",
            }
          : !readiness.poolOpen
            ? { label: "No Active Pool", note: "No pool is currently open." }
            : !readiness.notPaused
              ? { label: "Spins Paused", note: "The contract is paused." }
              : !readiness.randomnessAvailable
                ? {
                    label: "Randomness Unavailable",
                    note:
                      readiness.randomnessReason ||
                      "Verifiable randomness is not available, so a reward cannot be drawn.",
                  }
                : baseWei === 0n
                  ? {
                      label: "Price Unavailable",
                      note: "The spin price could not be read from the contract.",
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
        <p className="text-[13px] font-semibold tracking-[-0.02em]">Spin quantity</p>
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
        <Row label="Base spin price">
          {baseWei > 0n
            ? `${formatEther(totalBaseWei)} ${chainConfig.nativeSymbol}`
            : "Unavailable"}
        </Row>
        <Row label="Randomness surcharge" hint="Pays the cross-chain VRF request. Not protocol revenue.">
          {baseWei > 0n
            ? `${formatEther(totalSurchargeWei)} ${chainConfig.nativeSymbol}`
            : "Unavailable"}
        </Row>
        <Row label="Network fee">
          <span className="text-[12px] text-ink-3">Estimated by your wallet at signature</span>
        </Row>
        <div className="flex items-center justify-between border-t border-[rgba(20,24,18,0.08)] pt-2">
          <dt className="font-semibold text-ink">Total sent</dt>
          <dd className="num font-semibold text-ink">
            {baseWei > 0n
              ? `${formatEther(totalWei)} ${chainConfig.nativeSymbol}`
              : "Unavailable"}
          </dd>
        </div>
      </dl>

      {pool ? (
        <dl className="mt-3 space-y-1.5 rounded-2xl bg-[rgba(16,17,15,0.03)] p-3 text-[11.5px]">
          <p className="micro mb-1.5">How the base price is routed</p>
          <Row small label="Reward reserve">
            {(pool.rewardReserveBps / 100).toFixed(2)}%
          </Row>
          <Row small label="Protocol">
            {(pool.protocolFeeBps / 100).toFixed(2)}%
          </Row>
          <Row small label="Operations">
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
        Published probabilities apply to every entry independently. The reward is
        assigned on chain from a Chainlink VRF result after the round closes.
        Token values can fluctuate.
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
              Pool contract
            </a>
          ) : null}
          {vaultLink ? (
            <a
              href={vaultLink}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-ink-2"
            >
              Reward vault
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

      {txLink ? (
        <ButtonLink
          href={txLink}
          external
          variant="secondary"
          size="sm"
          className="mt-2"
          fullWidth
        >
          <span className="num">{shortHash(spin.txHash ?? "")}</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </ButtonLink>
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
          void spin.spin(perEntryWei);
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
