"use client";

import { Check } from "lucide-react";
import { useRaffle, RaffleState } from "@/lib/use-raffle";
import { cn } from "@/lib/utils";

type NodeState = "done" | "active" | "pending" | "missed";

/**
 * The raffle's lifecycle, read from contract state rather than narrated. Each
 * node reflects where the raffle actually is — opened, selling, sold out,
 * drawing, settled (or refunding) — so the UI can never claim a step happened
 * that the chain hasn't reached.
 */
export function RaffleTimeline({ className }: { className?: string }) {
  const raffle = useRaffle();

  const nodes = deriveNodes(raffle.state, raffle.ticketsSold ?? 0, raffle.cap ?? 0);

  return (
    <ol
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0",
        className,
      )}
    >
      {nodes.map((node, i) => (
        <li key={node.label} className="flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center sm:text-center">
          <div className="flex items-center sm:w-full sm:flex-col">
            <Dot state={node.state} />
            {/* connector */}
            {i < nodes.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-px flex-1 sm:block sm:w-full",
                  node.state === "done" ? "bg-[#a6d900]" : "bg-[rgb(var(--line-rgb)_/_0.14)]",
                )}
              />
            ) : null}
          </div>
          <div className="min-w-0 pb-1 sm:mt-2">
            <p className={cn("text-[12.5px] font-semibold", node.state === "pending" || node.state === "missed" ? "text-ink-3" : "text-ink")}>
              {node.label}
            </p>
            <p className="text-[11px] text-ink-3">{node.hint}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Dot({ state }: { state: NodeState }) {
  if (state === "done") {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#a6d900] text-[var(--on-accent)]">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[rgba(204,255,0,0.2)]">
        <span className="pulse-dot h-2 w-2 rounded-full bg-[#8ec500]" aria-hidden="true" />
      </span>
    );
  }
  if (state === "missed") {
    return <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[rgb(var(--line-rgb)_/_0.2)] text-ink-3">—</span>;
  }
  return <span className="h-6 w-6 shrink-0 rounded-full border border-[rgb(var(--line-rgb)_/_0.16)] bg-[rgb(var(--ink-rgb)_/_0.02)]" />;
}

function deriveNodes(state: number | null, sold: number, cap: number): { label: string; hint: string; state: NodeState }[] {
  const soldOut = cap > 0 && sold >= cap;

  if (state === RaffleState.Refundable) {
    return [
      { label: "Opened", hint: "Sales began", state: "done" },
      { label: "Selling", hint: `${sold}/${cap} sold`, state: "done" },
      { label: "Sell-out", hint: "Not reached", state: "missed" },
      { label: "Draw", hint: "Skipped", state: "missed" },
      { label: "Refunds", hint: "Open now", state: "active" },
    ];
  }

  const opened: NodeState = state === null ? "pending" : "done";
  const selling: NodeState = state === RaffleState.Open ? "active" : state === null ? "pending" : "done";
  const sellout: NodeState = soldOut ? "done" : state === RaffleState.Open ? "pending" : "pending";
  const draw: NodeState =
    state === RaffleState.Complete ? "done" : state === RaffleState.AwaitingDraw ? "active" : "pending";
  const settle: NodeState = state === RaffleState.Complete ? "done" : "pending";

  return [
    { label: "Opened", hint: "Sales began", state: opened },
    { label: "Selling", hint: `${sold}/${cap} sold`, state: selling },
    { label: "Sell-out", hint: soldOut ? "Reached" : "Waiting", state: sellout },
    { label: "Draw", hint: draw === "done" ? "Winner picked" : "Pending", state: draw },
    { label: "Settle", hint: settle === "done" ? "Winner drawn" : "Pending", state: settle },
  ];
}
