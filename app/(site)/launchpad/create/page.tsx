import type { Metadata } from "next";
import { PageContainer } from "@/components/shared/primitives";
import { CreateRaffleForm } from "@/components/launchpad/CreateRaffleForm";

export const metadata: Metadata = {
  title: "Create a raffle",
  description: "List one of your Robinhood Chain NFTs and open a trustless raffle for it.",
};

export default function CreateRafflePage() {
  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      <CreateRaffleForm />
    </PageContainer>
  );
}
