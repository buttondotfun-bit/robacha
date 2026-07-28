import Link from "next/link";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { EntryGate } from "@/components/legal/EntryGate";
import { FollowPrompt } from "@/components/marketing/FollowPrompt";
import { ClaimReminder } from "@/components/rewards/ClaimReminder";
import { Walkthrough } from "@/components/onboarding/Walkthrough";
import { AmbientBackground } from "@/components/shared/AmbientBackground";
import { RISK_NOTICE } from "@/lib/constants";
import { NETWORK_LABEL } from "@/lib/web3";

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AmbientBackground />
      <EntryGate />
      <AppHeader />
      {/* Clears the floating navbar, which is fixed. */}
      <main id="main" className="flex-1 pt-[76px] sm:pt-[84px]">
        {children}
      </main>
      <footer className="mt-14 px-4 pb-6 sm:px-6">
        <div className="glass-quiet mx-auto flex w-full max-w-[1360px] flex-col gap-3 rounded-[22px] px-5 py-5 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[70ch] text-[11.5px] leading-relaxed text-ink-3">
            {RISK_NOTICE} ROBACHA is an independent project built for{" "}
            {NETWORK_LABEL} and is not affiliated with or endorsed by Robinhood.
          </p>
          <nav
            aria-label="Legal"
            className="flex shrink-0 items-center gap-4 text-[11.5px] text-ink-3"
          >
            <Link href="/faq" className="transition-colors hover:text-ink">
              FAQ
            </Link>
            <Link
              href="/legal/terms"
              className="transition-colors hover:text-ink"
            >
              Terms
            </Link>
            <Link
              href="/legal/privacy"
              className="transition-colors hover:text-ink"
            >
              Privacy
            </Link>
            <Link href="/legal/risk" className="transition-colors hover:text-ink">
              Risk
            </Link>
          </nav>
        </div>
      </footer>
      <FollowPrompt />
      <ClaimReminder />
      <Walkthrough />
    </>
  );
}
