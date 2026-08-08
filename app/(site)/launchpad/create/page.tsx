import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { CreateRaffleForm } from "@/components/launchpad/CreateRaffleForm";

export const metadata: Metadata = {
  title: "Create a raffle",
  description: "List one of your Robinhood Chain NFTs and open a trustless raffle for it.",
};

export default function CreateRafflePage() {
  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      <Link href="/launchpad" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Launchpad
      </Link>
      <h1 className="text-display mt-4">Create a raffle</h1>
      <p className="mt-2 max-w-[54ch] text-[14px] leading-relaxed text-ink-2">
        Escrow an NFT, set your terms, and launch. You keep 90% of the take if it
        sells out; if it doesn&rsquo;t, every ticket refunds and your NFT comes
        straight back — all enforced by the contract.
      </p>
      <div className="mt-6">
        <CreateRaffleForm />
      </div>
    </PageContainer>
  );
}
