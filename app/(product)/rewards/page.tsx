import type { Metadata } from "next";
import { RewardsExplorer } from "@/components/rewards/RewardsExplorer";
import { UpcomingMachines } from "@/components/rewards/UpcomingMachines";
import { PageContainer } from "@/components/shared/primitives";
import { chainConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Live Reward Pool",
  description:
    "Explore every token currently available through Robacha spins, with published odds and pool allocation read from the contract.",
};

export default function RewardsPage() {
  return (
    <PageContainer width="wide" className="pb-10 pt-6">
      <header className="mb-6 max-w-[60ch]">
        <p className="micro">{chainConfig.name}</p>
        <h1 className="text-page-title mt-2.5">Live Reward Pool</h1>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
          Every reward slot, published probability and inventory figure on this
          page is read from the Robacha pool contract. Nothing is listed here that
          the contract does not hold.
        </p>
      </header>

      <RewardsExplorer />
      <UpcomingMachines />
    </PageContainer>
  );
}
