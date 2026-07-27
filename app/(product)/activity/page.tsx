import type { Metadata } from "next";
import { ActivityPageClient } from "@/components/activity/ActivityPageClient";
import { PageContainer } from "@/components/shared/primitives";
import { NETWORK_LABEL } from "@/lib/web3";

export const metadata: Metadata = {
  title: "Activity",
  description:
    "Every spin, pull, claim and pool update across Robacha reward pools on Robinhood Chain.",
};

export default function ActivityPage() {
  return (
    <PageContainer width="wide" className="pb-10 pt-6">
      <header className="mb-6 max-w-[58ch]">
        <div className="flex items-center gap-2">
          <span
            className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]"
            aria-hidden="true"
          />
          <p className="micro">Live on {NETWORK_LABEL}</p>
        </div>
        <h1 className="text-page-title mt-2.5">Activity</h1>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
          Every spin, pull, claim and pool update across Robacha, newest first.
        </p>
      </header>

      <ActivityPageClient />
    </PageContainer>
  );
}
