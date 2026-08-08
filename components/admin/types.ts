import type { UseAdminMonitor } from "@/lib/use-admin-monitor";
import type { useAdminState } from "@/lib/use-admin-state";

export type AdminState = ReturnType<typeof useAdminState>;

export type AdminTab =
  | "overview"
  | "rounds"
  | "vault"
  | "randomness"
  | "fees"
  | "raffle"
  | "system";

/** Shared props every tab receives from the shell — one poll, many views. */
export interface AdminTabProps {
  s: AdminState;
  monitor: UseAdminMonitor;
  refreshAll: () => void;
  /** Lets a tab (or an alert) route the operator to another tab. */
  go: (tab: AdminTab) => void;
}
