import type { Metadata } from "next";
import { BagClient } from "@/components/bag/BagClient";
import { PageContainer } from "@/components/shared/primitives";

export const metadata: Metadata = {
  title: "My Bag",
  description:
    "Every reward your wallet has pulled from Robacha reward pools, with claim status and estimated value.",
};

export default function BagPage() {
  return (
    <PageContainer width="wide" className="pb-10 pt-6">
      <header className="mb-6 max-w-[56ch]">
        <p className="micro">Wallet inventory</p>
        <h1 className="text-page-title mt-2.5">My Bag</h1>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
          Every reward this wallet has pulled, with the odds it was drawn at and
          whether it has been claimed.
        </p>
      </header>

      <BagClient />
    </PageContainer>
  );
}
