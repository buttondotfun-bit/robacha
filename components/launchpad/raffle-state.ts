import { HubRaffleState } from "@/lib/abi/robacha-raffle-hub";

/** Human labels for each on-chain raffle state, shared across launchpad UI. */
export function stateLabel(state: number): string {
  switch (state) {
    case HubRaffleState.Open:
      return "Live";
    case HubRaffleState.AwaitingDraw:
      return "Sold out · drawing";
    case HubRaffleState.Complete:
      return "Winner drawn";
    case HubRaffleState.Refundable:
      return "Refunds open";
    case HubRaffleState.Cancelled:
      return "Cancelled";
    default:
      return "—";
  }
}

/** "23h 45m" / "45m" / "12s", or empty once elapsed. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
