import type { Metadata } from "next";
import { VerifyClient } from "@/components/verify/VerifyClient";
import { PageContainer } from "@/components/shared/primitives";

export const metadata: Metadata = {
  title: "Check a round",
  description:
    "Recompute the number that decided any Robacha round, from published inputs, yourself.",
};

export default function VerifyPage() {
  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      <header className="mb-6 max-w-[62ch]">
        <p className="micro">Prove it</p>
        <h1 className="text-page-title mt-2.5">Check a round yourself.</h1>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
          We say we can&rsquo;t pick your reward. That&rsquo;s not something you
          should take our word for, so here is the working. Pick any round and
          this re-derives the number that decided it from inputs published on
          chain — and tells you if any step doesn&rsquo;t hold.
        </p>
      </header>

      <VerifyClient />
    </PageContainer>
  );
}
