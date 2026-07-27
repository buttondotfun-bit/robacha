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
    title: "ROBACHA isn’t set up yet",
    body: "No pool is connected to this site yet, so there’s nothing to spin.",
    icon: <Boxes className="h-5 w-5" aria-hidden="true" />,
  },
  "rpc-unavailable": {
    title: `Can’t reach ${chainConfig.name}`,
    body: "We couldn’t load the pool just now. We’d rather show you nothing than something out of date.",
    icon: <ServerCrash className="h-5 w-5" aria-hidden="true" />,
  },
  "no-active-pool": {
    title: "No pool is open right now",
    body: "Everything’s working — there just isn’t a pool running. Spins open the moment one starts.",
    icon: <Boxes className="h-5 w-5" aria-hidden="true" />,
  },
  loading: {
    title: "Loading the pool…",
    body: "Grabbing what’s inside, the odds and how much is left.",
    icon: <PlugZap className="h-5 w-5" aria-hidden="true" />,
  },
  paused: {
    title: "Spins are paused",
    body: "New spins are off for now. Anything you’ve already won is still yours to claim.",
    icon: <PauseCircle className="h-5 w-5" aria-hidden="true" />,
  },
  randomness: {
    title: "The random draw is unavailable",
    body: "Rewards can only be picked by a real random draw, so spins stay closed until it’s back.",
    icon: <Dice5 className="h-5 w-5" aria-hidden="true" />,
  },
  "no-inventory": {
    title: "This pool is out of prizes",
    body: "There’s nothing left in the prize vault for this pool right now.",
    icon: <Boxes className="h-5 w-5" aria-hidden="true" />,
  },
  "wrong-network": {
    title: `Switch to ${chainConfig.name}`,
    body: "Your wallet is on a different network.",
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
