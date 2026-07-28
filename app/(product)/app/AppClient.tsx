"use client";

import { RefreshCw } from "lucide-react";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { GachaStage } from "@/components/gacha/GachaStage";
import { PoolBar } from "@/components/gacha/PoolBar";
import { PendingSpins } from "@/components/gacha/PendingSpins";
import { SpinAssistant } from "@/components/gacha/SpinAssistant";
import { UpcomingMachines } from "@/components/rewards/UpcomingMachines";
import { SpinControls } from "@/components/gacha/SpinControls";
import { UnavailableState } from "@/components/shared/UnavailableState";
import { Button } from "@/components/ui/Button";
import { usePool } from "@/lib/use-pool";

/**
 * The spin page.
 *
 * Renders the pool only when the contract actually returns one. Every other
 * path resolves to a named unavailable state with the action disabled — the
 * page never shows a stage, odds or a price it could not read from chain.
 */
export function AppClient() {
  const { pool, unavailableReason, readiness, isLoading, refetch } = usePool();

  return (
    <>
      {pool ? (
        <PoolBar pool={pool} className="mb-4" />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_352px]">
        <div className="min-w-0">
          {pool ? (
            <GachaStage pool={pool} />
          ) : (
            <div className="glass-panel overflow-hidden rounded-[28px]">
              <UnavailableState
                kind={unavailableReason ?? "no-active-pool"}
                action={
                  unavailableReason === "rpc-unavailable" ? (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={refetch}
                      disabled={isLoading}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                        aria-hidden="true"
                      />
                      Retry
                    </Button>
                  ) : undefined
                }
              />
            </div>
          )}
        </div>

        {/* The rail holds only what pairs with the machine: what you already
            have in flight, and what you are about to buy. Everything else is
            reading material and was squeezing this column narrow. */}
        <div className="flex flex-col gap-4">
          <PendingSpins />
          <div className="glass-panel rounded-[24px] p-4">
            <SpinControls pool={pool} readiness={readiness} />
          </div>
        </div>
      </div>

      {/* Full width beneath the machine, three across on desktop. */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SpinAssistant pool={pool} readiness={readiness} />
        <UpcomingMachines variant="strip" />
        <div className="glass-panel overflow-hidden rounded-[24px]">
          <ActivityFeed maxHeight={380} />
        </div>
      </div>
    </>
  );
}
