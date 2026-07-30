"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Receipt } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { chainConfig, explorerUrl } from "@/lib/config";
import { shortHash } from "@/lib/formatters";
import { useMoney } from "@/lib/use-money";
import type { ActivePool } from "@/lib/use-pool";

/**
 * A receipt for money that has actually left the wallet.
 *
 * The confirmation dialog states what a spin *will* cost; nothing stated what
 * it *did*. Between those two is a wallet prompt showing a raw number and then
 * a screen that moves on to waiting for the result, so the only durable record
 * of the charge was a transaction hash in a link.
 *
 * Everything here is drawn from the pool's own snapshotted economics and the
 * quantity that was signed for — not re-read afterwards, because the receipt
 * has to describe the transaction that happened even if the pool changes
 * underneath it a minute later.
 *
 * The network fee is deliberately absent. It is charged by the chain, varies,
 * and is not ours to report; the wallet's own history is the authority on it,
 * and inventing a figure here would be the one wrong number on a receipt.
 */
export function SpinReceipt({
  pool,
  quantity,
  txHash,
  confirmed,
}: {
  pool: ActivePool | null;
  quantity: number;
  txHash: string | null;
  /** True once the transaction is in a block — before that there is no charge. */
  confirmed: boolean;
}) {
  const money = useMoney();
  const [open, setOpen] = useState(false);

  // Snapshotted at the moment of confirmation so later pool changes cannot
  // rewrite what someone was charged.
  const snapshot = useRef<{
    quantity: number;
    baseWei: bigint;
    surchargeWei: bigint;
    txHash: string;
    poolName: string;
    rewardBps: number;
    protocolBps: number;
    operationsBps: number;
  } | null>(null);
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (!confirmed || !txHash || !pool) return;
    if (shown.current === txHash) return;
    shown.current = txHash;
    snapshot.current = {
      quantity,
      baseWei: pool.spinPriceWei * BigInt(quantity),
      surchargeWei: pool.surchargeWei * BigInt(quantity),
      txHash,
      poolName: pool.name || `Pool #${pool.poolId}`,
      rewardBps: pool.rewardReserveBps,
      protocolBps: pool.protocolFeeBps,
      operationsBps: pool.operationsFeeBps,
    };
    setOpen(true);
  }, [confirmed, txHash, pool, quantity]);

  const receipt = snapshot.current;
  if (!receipt) return null;

  const total = receipt.baseWei + receipt.surchargeWei;
  const link = explorerUrl("tx", receipt.txHash);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="Receipt"
      description={`${receipt.quantity} spin${receipt.quantity === 1 ? "" : "s"} on ${receipt.poolName}`}
    >
      <dl className="space-y-2.5 rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.035)] p-4 text-[13px]">
        <Line label="Spin price" value={money.native(receipt.baseWei)} />
        <Line label="Random draw fee" value={money.native(receipt.surchargeWei)} />
        <div className="flex items-baseline justify-between gap-3 border-t border-[rgb(var(--line-rgb)_/_0.1)] pt-2.5">
          <dt className="font-semibold text-ink">Charged</dt>
          <dd className="num text-right font-semibold text-ink">
            {money.native(total)}
            {money.hasPrice ? (
              <span className="block text-[11px] font-normal text-ink-3">
                {money.usd(total)}
              </span>
            ) : null}
          </dd>
        </div>
        <p className="border-t border-[rgb(var(--line-rgb)_/_0.1)] pt-2.5 text-[11px] leading-relaxed text-ink-3">
          Your wallet also paid a network fee to {chainConfig.name}. That one is
          set by the chain, not by us — your wallet&rsquo;s history has the exact
          figure.
        </p>
      </dl>

      <div className="mt-4">
        <p className="micro mb-2">Where the spin price went</p>
        <dl className="space-y-1.5 text-[12px]">
          <Line small label="Into prizes" value={`${(receipt.rewardBps / 100).toFixed(2)}%`} />
          <Line small label="To ROBACHA" value={`${(receipt.protocolBps / 100).toFixed(2)}%`} />
          <Line small label="Running costs" value={`${(receipt.operationsBps / 100).toFixed(2)}%`} />
        </dl>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
          The draw fee is not split — all of it pays for running the draw and
          sending your prize.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {link ? (
          <ButtonLink href={link} external variant="secondary" size="md" className="flex-1">
            <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="num">{shortHash(receipt.txHash)}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </ButtonLink>
        ) : null}
        <Button variant="primary" size="md" className="flex-1" onClick={() => setOpen(false)}>
          Done
        </Button>
      </div>
    </Dialog>
  );
}

function Line({
  label,
  value,
  small,
}: {
  label: string;
  value: string | null;
  small?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={small ? "text-ink-3" : "text-ink-2"}>{label}</dt>
      <dd className={`num shrink-0 ${small ? "text-ink-2" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
