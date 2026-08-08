"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { ROBACHA_RAFFLE_ABI, ROBACHA_RAFFLE_ADMIN_ABI, RaffleState } from "@/lib/abi/robacha-raffle";
import { FEATURED_RAFFLE } from "@/data/raffle";
import { chainConfig, contracts, explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { useRaffle } from "@/lib/use-raffle";
import { AdminAction } from "../AdminAction";
import type { AdminTabProps } from "../types";
import { AdminSection, Metric, ModuleError } from "../ui";

/**
 * The featured raffle, from the operator's side.
 *
 * Answers the one question the read pages don't: once it sells out, how do the
 * proceeds come out. The contract's flow is fund the draw → request it → and,
 * only after a winner has actually landed, `claimProceeds(to)` sends the ETH
 * wherever you choose. Every control here is gated on the real on-chain state,
 * and each is a privileged call the public pages can't reach.
 */

const STATE_LABEL: Record<number, string> = {
  [RaffleState.Open]: "Selling",
  [RaffleState.AwaitingDraw]: "Sold out — awaiting draw",
  [RaffleState.Complete]: "Winner drawn",
  [RaffleState.Refundable]: "Refundable",
};

export function RaffleTab({ refreshAll }: AdminTabProps) {
  const raffle = contracts.raffle;
  const r = useRaffle();
  const { address: admin } = useAccount();
  const [fundEth, setFundEth] = useState("0.005");

  // Refresh both this tab's reads and the shared admin poll after any action.
  const done = () => {
    r.refetch();
    refreshAll();
  };

  const proceedsClaimedQ = useReadContract({
    address: raffle ?? undefined,
    abi: ROBACHA_RAFFLE_ADMIN_ABI,
    functionName: "proceedsClaimed",
    chainId: chainConfig.id,
    query: { enabled: Boolean(raffle), refetchInterval: 15_000 },
  });

  if (!raffle) {
    return <ModuleError message="No raffle configured — contracts.raffle is unset." />;
  }

  const state = r.state;
  const soldOut = r.ticketsSold != null && r.cap != null && r.ticketsSold >= r.cap;
  const grossWei = r.ticketsSold != null && r.priceWei != null ? BigInt(r.ticketsSold) * r.priceWei : null;
  const proceedsClaimed = proceedsClaimedQ.data === true;
  const link = explorerUrl("address", raffle);

  let fundValue: bigint | null = null;
  try {
    fundValue = fundEth.trim() ? parseEther(fundEth.trim()) : null;
  } catch {
    fundValue = null;
  }

  return (
    <div className="space-y-4">
      <AdminSection title={`${FEATURED_RAFFLE.prize.collection} raffle`} description={`${FEATURED_RAFFLE.prize.name} · single raffle`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="State" value={state != null ? STATE_LABEL[state] ?? `#${state}` : "—"} />
          <Metric label="Tickets" value={r.ticketsSold != null && r.cap != null ? `${r.ticketsSold} / ${r.cap}` : "—"} />
          <Metric label="Ticket price" value={r.priceWei != null ? `${formatEther(r.priceWei)} ETH` : "—"} />
          <Metric label="Gross proceeds" value={grossWei != null ? `${formatEther(grossWei)} ETH` : "—"} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-ink-3">
          <span>Winner: <span className="num text-ink-2">{r.winner ? shortAddress(r.winner) : "not drawn"}</span></span>
          <span>Proceeds: <span className="num text-ink-2">{proceedsClaimed ? "claimed" : "unclaimed"}</span></span>
          {link ? (
            <a href={link} target="_blank" rel="noreferrer" className="text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">
              View contract
            </a>
          ) : null}
        </div>
      </AdminSection>

      {/* Draw */}
      <AdminSection title="Run the draw" description="Once it sells out, fund and request the random winner.">
        <p className="mb-3 text-[12.5px] leading-relaxed text-ink-2">
          {state === RaffleState.Open
            ? soldOut
              ? "Sold out — move to the draw."
              : "Still selling. There's nothing to draw or withdraw until every ticket is sold."
            : state === RaffleState.AwaitingDraw
              ? "Sold out. Fund the draw fee, then request the draw to pick a winner."
              : state === RaffleState.Complete
                ? "The winner is drawn. Proceeds can be withdrawn below."
                : "Refundable — buyers withdraw their tickets; no proceeds to take."}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">Draw fee (ETH)</span>
            <input
              value={fundEth}
              onChange={(e) => setFundEth(e.target.value)}
              inputMode="decimal"
              className="num h-9 w-28 rounded-[10px] border border-[rgb(var(--line-rgb)_/_0.14)] bg-surface px-2.5 text-[13px] outline-none"
            />
          </label>
          <AdminAction
            label="Fund draw"
            address={raffle}
            abi={ROBACHA_RAFFLE_ADMIN_ABI}
            functionName="fundDraw"
            value={fundValue ?? undefined}
            confirm={fundValue ? `Send ${fundEth} ETH to fund the raffle draw?` : undefined}
            onDone={done}
          />
          <AdminAction
            label="Request draw"
            address={raffle}
            abi={ROBACHA_RAFFLE_ADMIN_ABI}
            functionName="requestDraw"
            confirm="Request the random draw now?"
            onDone={done}
          />
        </div>
      </AdminSection>

      {/* Withdraw — the answer */}
      <AdminSection title="Withdraw proceeds" description="Sends the ticket ETH to your wallet. Only works after a winner is drawn.">
        {proceedsClaimed ? (
          <p className="text-[13px] text-ink-2">Proceeds have already been withdrawn.</p>
        ) : state !== RaffleState.Complete ? (
          <p className="text-[13px] text-ink-3">Not available yet — a winner must be drawn first.</p>
        ) : !admin ? (
          <p className="text-[13px] text-ink-3">Connect the admin wallet to withdraw.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <AdminAction
              label={`Withdraw ${grossWei != null ? `${formatEther(grossWei)} ETH ` : ""}to me`}
              address={raffle}
              abi={ROBACHA_RAFFLE_ADMIN_ABI}
              functionName="claimProceeds"
              args={[admin]}
              variant="primary"
              confirm={`Send all raffle proceeds to ${shortAddress(admin)}?`}
              onDone={() => { done(); void proceedsClaimedQ.refetch(); }}
            />
            <span className="num text-[11.5px] text-ink-3">to {shortAddress(admin)}</span>
          </div>
        )}
      </AdminSection>

      {/* Failure path */}
      {state === RaffleState.AwaitingDraw || state === RaffleState.Refundable ? (
        <AdminSection title="If the draw stalls" description="Open refunds so buyers can withdraw; reclaim any stranded draw fee.">
          <div className="flex flex-wrap gap-2">
            <AdminAction
              label="Open refunds"
              address={raffle}
              abi={ROBACHA_RAFFLE_ABI}
              functionName="markRefundable"
              confirm="Mark the raffle refundable? Buyers will be able to withdraw their tickets."
              onDone={done}
            />
            <AdminAction
              label="Reclaim stranded fee"
              address={raffle}
              abi={ROBACHA_RAFFLE_ADMIN_ABI}
              functionName="reclaimStrandedFee"
              onDone={done}
            />
          </div>
        </AdminSection>
      ) : null}
    </div>
  );
}
