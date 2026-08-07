"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Sparkles, Wallet } from "lucide-react";
import { CurrencyToggle } from "@/components/shared/CurrencyToggle";
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
import { useRobZap } from "@/lib/use-rob-zap";
import { usePendingSpins, RoundState } from "@/lib/use-pending-spins";
import { useMoney } from "@/lib/use-money";
import { useWalletCap } from "@/lib/use-wallet-cap";
import { useWalletHistory } from "@/lib/use-wallet-history";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";
import type { ActivePool, PoolReadiness } from "@/lib/use-pool";
import { QuantitySelector } from "./QuantitySelector";
import { ShareSpin } from "./ShareSpin";
import { SpinReceipt } from "./SpinReceipt";
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
  const money = useMoney();
  const { history } = useWalletHistory();
  const [confirming, setConfirming] = useState(false);
  const { pending } = usePendingSpins();

  // Paying in ROB is the swap-then-spin zap: the player's own wallet turns ROB
  // into exactly the ETH the spin costs, then spins, so the prize is theirs and
  // no contract changed. `useRobZap` owns the swap half; the spin below is the
  // same call either way.
  const robZap = useRobZap();
  const [payWith, setPayWith] = useState<"eth" | "rob">("eth");
  const zapBusy = robZap.phase === "approving" || robZap.phase === "swapping";

  // Lifetime allowance for this pool version. A wallet at its cap used to see
  // a live button and pay gas for a guaranteed WalletCapExceeded revert.
  const walletCap = useWalletCap(pool);

  // Spins already paid for. Whether a new spin joins them or starts a fresh
  // round decides what the confirmation has to warn about.
  const pendingTotal = pending.reduce((sum, row) => sum + row.entries, 0);
  const openRound = pending.find((row) => row.state === RoundState.Open);

  const busy = SPIN_COPY[spin.phase].busy || zapBusy;

  const baseWei = pool?.spinPriceWei ?? 0n;
  const surchargeWei = pool?.surchargeWei ?? 0n;
  const perEntryWei = baseWei + surchargeWei;
  const robEstimate = robZap.estimateRob(perEntryWei * BigInt(spin.quantity));
  const quantity = BigInt(spin.quantity);
  const totalBaseWei = baseWei * quantity;
  const totalSurchargeWei = surchargeWei * quantity;
  const totalWei = perEntryWei * quantity;

  const onRightNetwork = wallet.isConnected && !wallet.wrongNetwork;
  const contractReady = readiness?.ready ?? false;

  // Only ever true on a balance we have actually read. A null balance is
  // unknown, not empty, and telling someone they cannot afford a spin while
  // their balance is still loading would be both wrong and insulting.
  const shortBy =
    wallet.balanceWei !== null && totalWei > 0n && wallet.balanceWei < totalWei
      ? totalWei - wallet.balanceWei
      : null;

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
                  : shortBy !== null
                    ? {
                        label: "Not Enough to Cover This",
                        note: `This costs ${money.native(totalWei)} and your wallet holds ${money.native(wallet.balanceWei ?? 0n)}. Add about ${money.native(shortBy)} — plus a little for the network fee — or spin fewer times.`,
                      }
                  : walletCap.exhausted
                    ? {
                        label: "You've Used All Your Spins",
                        note: `This wallet has used all ${walletCap.cap} of its spins on this pool. Anything you've won is still yours to claim.`,
                      }
                    : { label: "Rob the Gacha", note: null };

  const canSpin =
    PUBLIC_PAID_SPINS_ENABLED &&
    onRightNetwork &&
    contractReady &&
    baseWei > 0n &&
    shortBy === null &&
    !walletCap.exhausted &&
    !busy;
  const label = busy ? SPIN_COPY[spin.phase].label : blocker.label;
  const txLink = spin.txHash ? explorerUrl("tx", spin.txHash) : null;

  const gachaLink = contracts.gacha ? explorerUrl("address", contracts.gacha) : null;
  const vaultLink = contracts.rewardVault
    ? explorerUrl("address", contracts.rewardVault)
    : null;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold tracking-[-0.02em]">How many spins?</p>
        <div className="flex items-center gap-2">
          <span className="num text-[12px] text-ink-2">
            {baseWei > 0n ? `${money.format(perEntryWei)} / spin` : "Price unavailable"}
          </span>
          <CurrencyToggle />
        </div>
      </div>

      {walletCap.cap > 0 && wallet.isConnected ? (
        <p className="mt-1.5 text-[11.5px] text-ink-3">
          {walletCap.exhausted
            ? `You've used all ${walletCap.cap} of your spins on this pool.`
            : `${walletCap.remaining} of ${walletCap.cap} spins left on this pool.`}
        </p>
      ) : null}

      <QuantitySelector
        className="mt-3"
        value={spin.quantity}
        onChange={spin.setQuantity}
        // Never offer more than the wallet could actually buy.
        max={Math.max(
          1,
          Math.min(pool?.maxQuantityPerTx ?? 1, walletCap.remaining),
        )}
        disabled={busy || !contractReady || walletCap.exhausted}
      />

      {/* Pay in ETH or in ROB. The choice only changes how the ETH is sourced;
          the spin, the odds, the prize and every downstream path are identical.
          Hidden until a price exists, because a toggle with nothing to price is
          just noise. */}
      {baseWei > 0n ? (
        <div className="mt-3">
          <div
            role="tablist"
            aria-label="Pay with"
            className="grid grid-cols-2 gap-1 rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] p-1"
          >
            {(["eth", "rob"] as const).map((method) => {
              const active = payWith === method;
              return (
                <button
                  key={method}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={busy || zapBusy}
                  onClick={() => setPayWith(method)}
                  className={cn(
                    "rounded-full py-2 text-[12.5px] font-medium transition-colors",
                    active
                      ? "bg-[rgb(var(--surface-rgb))] text-ink shadow-[0_1px_2px_rgb(var(--ink-rgb)_/_0.08)]"
                      : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  {method === "eth" ? "Pay in ETH" : "Pay in $ROB"}
                </button>
              );
            })}
          </div>

          {payWith === "rob" ? (
            <div className="mt-2 rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.03)] px-3.5 py-3 text-[12px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-2">Approx. cost</span>
                <span className="num font-medium text-ink">
                  {robEstimate !== null
                    ? `≈ ${formatRob(robEstimate)} ROB`
                    : "Reading price…"}
                </span>
              </div>
              <p className="mt-1.5 leading-relaxed text-ink-3">
                Your wallet swaps ROB to the exact ETH this spin costs, then
                spins — two signatures. You pay the pool&rsquo;s swap fee, and
                the estimate settles to the real amount when you sign.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Full cost and routing disclosure, before any signature is requested. */}
      <dl className="mt-4 space-y-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3.5 text-[13px]">
        <Row label="Spin price">
          {baseWei > 0n ? money.format(totalBaseWei) : "Unavailable"}
        </Row>
        <Row label="Random draw fee" hint="Covers the gas of running the draw and paying out. We don’t keep any of it.">
          {baseWei > 0n ? money.format(totalSurchargeWei) : "Unavailable"}
        </Row>
        <Row label="Network fee">
          <span className="text-[12px] text-ink-3">Your wallet works this out when you sign</span>
        </Row>
        <div className="flex items-center justify-between border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-2">
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="num text-right font-semibold text-ink">
            {baseWei > 0n ? money.format(totalWei) : "Unavailable"}
            {/* The other currency, always, so the real amount is never hidden
                behind a converted one. */}
            {baseWei > 0n && money.hasPrice ? (
              <span className="block text-[11px] font-normal text-ink-3">
                {money.preference === "usd" ? money.native(totalWei) : money.usd(totalWei)}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      {pool ? (
        <dl className="mt-3 space-y-1.5 rounded-2xl bg-[rgb(var(--ink-rgb)_/_0.03)] p-3 text-[11.5px]">
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
        next. Your round closes before any number is drawn, and the number is
        then folded from mining work that hasn&rsquo;t happened yet, so nobody
        knows it while you can still enter. Yours is mixed with your own
        address, so everyone in a round draws separately. Token values go up
        and down.
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
          <Link
            href="/verify"
            className="underline decoration-dotted underline-offset-2 hover:text-ink-2"
          >
            Check a past round yourself
          </Link>
        </p>
      ) : null}

      {robZap.phase === "error" && robZap.error ? (
        <ErrorState
          className="mt-3"
          title="ROB swap not completed"
          description={robZap.error}
          action={
            <Button size="sm" variant="secondary" onClick={robZap.reset}>
              Dismiss
            </Button>
          }
        />
      ) : zapBusy ? (
        <div
          role="status"
          aria-live="polite"
          className="glass-quiet mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] text-ink-2"
        >
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          <span>
            {robZap.phase === "approving"
              ? "Approve ROB in your wallet — one-time, so the swap can pull it…"
              : "Swapping ROB for the exact ETH your spin costs…"}
          </span>
        </div>
      ) : spin.phase === "error" && spin.error ? (
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
        <dl className="space-y-2 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.035)] p-4 text-[13px]">
          <Row label="Spin price">{money.native(totalBaseWei)}</Row>
          <Row label="Random draw fee">{money.native(totalSurchargeWei)}</Row>
          <div className="flex items-center justify-between border-t border-[rgb(var(--line-rgb)_/_0.1)] pt-2">
            <dt className="font-semibold text-ink">Leaving your wallet</dt>
            <dd className="num text-right font-semibold text-ink">
              {money.native(totalWei)}
              {money.hasPrice ? (
                <span className="block text-[11px] font-normal text-ink-3">
                  {money.usd(totalWei)}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>

        {/* What this wallet has already spent here, at the moment of deciding
            to spend more. Shown without comment or judgement — the number is
            the point, and dressing it up either way would be the manipulative
            version of the same panel. */}
        {history && history.spins > 0 ? (
          <dl className="mt-3 flex items-baseline justify-between gap-3 rounded-[14px] border border-[rgb(var(--line-rgb)_/_0.08)] px-3.5 py-3 text-[12.5px]">
            <dt className="text-ink-2">
              Spent here so far
              <span className="mt-0.5 block text-[11px] text-ink-3">
                {history.spins} {history.spins === 1 ? "spin" : "spins"}, all time
                {BigInt(history.refundedWei) > 0n ? ", after refunds" : ""}
              </span>
            </dt>
            <dd className="num shrink-0 text-right font-semibold text-ink">
              {money.native(
                BigInt(history.paidBaseWei) +
                  BigInt(history.paidSurchargeWei) -
                  BigInt(history.refundedWei),
              )}
              {money.hasPrice ? (
                <span className="block text-[11px] font-normal text-ink-3">
                  {money.usd(
                    BigInt(history.paidBaseWei) +
                      BigInt(history.paidSurchargeWei) -
                      BigInt(history.refundedWei),
                  )}
                </span>
              ) : null}
            </dd>
          </dl>
        ) : null}

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
              void (async () => {
                // Paying in ROB: buy the exact ETH first, and only spin if that
                // succeeds. A failed or rejected swap must not leave a spin
                // half-attempted — the zap sets its own error and we stop.
                if (payWith === "rob") {
                  try {
                    await robZap.buyEth(perEntryWei * BigInt(spin.quantity));
                  } catch {
                    return;
                  }
                }
                await spin.spin(perEntryWei);
              })();
            }}
          >
            {payWith === "rob" ? "Swap ROB & spin" : "Confirm & sign"}
          </Button>
        </div>
      </Dialog>

      {/* Fires once the charge is real — a transaction in a block, not a
          broadcast that could still fail. */}
      <SpinReceipt
        pool={pool}
        quantity={spin.quantity}
        txHash={spin.txHash ?? null}
        confirmed={
          spin.phase === "round-open" ||
          spin.phase === "round-closed" ||
          spin.phase === "randomness-pending" ||
          spin.phase === "settled"
        }
      />
    </div>
  );
}

/**
 * ROB is an 18-decimal token trading in the thousands per spin, so it reads as
 * a rounded whole number with thousands separators — decimals here would be
 * false precision on a spot estimate that the swap resettles anyway.
 */
function formatRob(wei: bigint): string {
  const whole = wei / 1_000_000_000_000_000_000n;
  return whole.toLocaleString("en-US");
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
