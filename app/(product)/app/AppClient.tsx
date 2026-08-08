"use client";

import { RefreshCw } from "lucide-react";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { GachaStage } from "@/components/gacha/GachaStage";
import { PoolBar } from "@/components/gacha/PoolBar";
import { PendingSpins } from "@/components/gacha/PendingSpins";
import { RobBurnedCard } from "@/components/gacha/RobBurnedCard";
import { SpinAssistant } from "@/components/gacha/SpinAssistant";
import { TokenLineup } from "@/components/landing/TokenLineup";
import { UpcomingMachines } from "@/components/rewards/UpcomingMachines";
import { SpinControls } from "@/components/gacha/SpinControls";
import { SpinResult } from "@/components/gacha/SpinResult";
import { SpinTabs } from "@/components/gacha/SpinTabs";
import { RafflePromo } from "@/components/raffle/RafflePromo";
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
      {/* Switch between the token machine and the NFT machine. */}
      <SpinTabs className="mb-4" />

      {/* Markets the live Meebit raffle above the machine; self-hides the
          moment the raffle sells out, draws, or isn't running. */}
      <RafflePromo variant="banner" className="mb-4" />

      {pool ? (
        <PoolBar pool={pool} className="mb-4" />
      ) : null}

      {/* Watches for a round of ours that is due, hurries it along, and shows
          the prizes once they exist on chain. */}
      <SpinResult pool={pool} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex min-w-0 flex-col gap-4">
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

          {/* Fills the space under the machine, which the taller rail beside it
              would otherwise leave blank on a wide screen. Desktop only: on
              mobile the columns stack, so putting it here would push the spin
              button below the fold behind something nobody asked to read. The
              mobile copy lives in the row underneath, and only ever one of the
              two is rendered. */}
          <div className="hidden lg:block">
            <TokenLineup variant="strip" />
          </div>
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
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SpinAssistant pool={pool} readiness={readiness} />
        {/* Counterpart to the one in the left column above; hidden once there
            is room beside the machine for it. */}
        <div className="lg:hidden">
          <TokenLineup variant="strip" />
        </div>
        <UpcomingMachines variant="strip" />
        <RobBurnedCard />
        <div className="glass-panel overflow-hidden rounded-[24px]">
          <ActivityFeed maxHeight={380} />
        </div>
      </div>
    </>
  );
}
