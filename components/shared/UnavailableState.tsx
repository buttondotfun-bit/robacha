"use client";

import {
  AlertTriangle,
  Boxes,
  Dice5,
  PauseCircle,
  PlugZap,
  ServerCrash,
} from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "./primitives";
import type { PoolUnavailableReason } from "@/lib/use-pool";
import { chainConfig } from "@/lib/config";

/**
 * Honest unavailable states.
 *
 * Every one of these means a production dependency is genuinely not working.
 * None of them substitute example data, and each is paired with the action
 * being disabled — the interface never looks operational when it isn't.
 */

export type UnavailableKind =
  | PoolUnavailableReason
  | "paused"
  | "randomness"
  | "no-inventory"
  | "wrong-network"
  | "disconnected";

const COPY: Record<
  UnavailableKind,
  { title: string; body: string; icon: ReactNode }
> = {
  "not-configured": {
    title: "ROBACHA contract is not configured",
    body: "No gacha contract address is set for this deployment, so there is no pool to read. Spins are unavailable.",
    icon: <Boxes className="h-5 w-5" aria-hidden="true" />,
  },
  "rpc-unavailable": {
    title: `${chainConfig.name} RPC is currently unavailable`,
    body: "Pool state could not be read from the chain. Nothing is shown rather than serving a stale or guessed value.",
    icon: <ServerCrash className="h-5 w-5" aria-hidden="true" />,
  },
  "no-active-pool": {
    title: "No active Robacha reward pool is currently available",
    body: "The contract is live but no pool is currently activated. Spins open when a pool goes active.",
    icon: <Boxes className="h-5 w-5" aria-hidden="true" />,
  },
  loading: {
    title: "Reading pool from chain…",
    body: "Fetching the active pool, its odds and its live inventory.",
    icon: <PlugZap className="h-5 w-5" aria-hidden="true" />,
  },
  paused: {
    title: "Robacha spins are temporarily paused",
    body: "The contract is paused. Existing rewards remain claimable; new spins are disabled.",
    icon: <PauseCircle className="h-5 w-5" aria-hidden="true" />,
  },
  randomness: {
    title: "Secure randomness is currently unavailable",
    body: "No randomness provider is configured on the contract. A reward can only be drawn from verifiable on-chain randomness, so spins stay closed.",
    icon: <Dice5 className="h-5 w-5" aria-hidden="true" />,
  },
  "no-inventory": {
    title: "This pool has no funded rewards",
    body: "The reward vault holds no payable inventory for the active pool.",
    icon: <Boxes className="h-5 w-5" aria-hidden="true" />,
  },
  "wrong-network": {
    title: `Switch to ${chainConfig.name}`,
    body: "Your wallet is connected to a different network.",
    icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
  },
  disconnected: {
    title: "Connect a wallet",
    body: `Connect a ${chainConfig.name} wallet to continue.`,
    icon: <PlugZap className="h-5 w-5" aria-hidden="true" />,
  },
};

export function unavailableCopy(kind: UnavailableKind) {
  return COPY[kind];
}

export function UnavailableState({
  kind,
  action,
  title,
  description,
  className,
}: {
  kind: UnavailableKind;
  action?: ReactNode;
  /** Overrides the default title when the caller knows something more precise. */
  title?: string;
  /** Overrides the default body. Must still describe a real condition. */
  description?: string;
  className?: string;
}) {
  const copy = COPY[kind];
  return (
    <EmptyState
      icon={copy.icon}
      title={title ?? copy.title}
      description={description ?? copy.body}
      action={action}
      className={className}
    />
  );
}

/** Inline one-line variant for stat slots that cannot be computed. */
export function Unavailable({ label = "Unavailable" }: { label?: string }) {
  return <span className="text-[13px] text-ink-3">{label}</span>;
}
