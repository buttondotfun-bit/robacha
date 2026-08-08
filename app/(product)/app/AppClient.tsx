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
 *
 * `lean` drops the Genesis-flavoured ecosystem content (the featured raffle promo,
 * the memecoin token lineup, the upcoming-machines strip and the activity/burn
 * row) so a second machine — the Stock Machine — can reuse the exact spin core
 * without borrowing the token machine's surrounding pitch.
 */
export function AppClient({ lean = false }: { lean?: boolean }) {
  const { pool, unavailableReason, readiness, isLoading, refetch } = usePool();

  return (
    <>
      {/* Switch between the token machine and the NFT machine. */}
      <SpinTabs className="mb-4" />

      {/* Cross-product raffle promo, shown as the full banner so the live
          featured raffle is impossible to miss on the spin page. Self-hides when
          the raffle sells out, draws, or isn't running. Genesis-only. */}
      {lean ? null : <RafflePromo variant="banner" className="mb-4" />}

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
          {lean ? null : (
            <div className="hidden lg:block">
              <TokenLineup variant="strip" />
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

      {/* Live activity + protocol burn, right under the machine — real
          on-chain spins, claims and settlements paired with the $ROB the
          protocol has burned. Aligned to the machine/console columns so the
          two rows read as one surface. Genesis-only. */}
      {lean ? null : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_352px]">
          <div className="glass-panel overflow-hidden rounded-[24px]">
            <ActivityFeed maxHeight={360} />
          </div>
          <RobBurnedCard />
        </div>
      )}

      {/* Secondary: what's entering the machine, what's next, and help — all
          below the fold so nothing competes with the spin itself. In lean mode
          only the machine's own help remains; the ecosystem strips are dropped. */}
      {lean ? (
        <div className="mt-4">
          <SpinAssistant pool={pool} readiness={readiness} />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {/* Counterpart to the desktop strip under the machine; only one renders. */}
          <div className="lg:hidden">
            <TokenLineup variant="strip" />
          </div>
          <UpcomingMachines variant="strip" />
          <SpinAssistant pool={pool} readiness={readiness} />
        </div>
      )}
    </>
  );
}
