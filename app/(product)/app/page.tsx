import type { Metadata } from "next";
import { PageContainer } from "@/components/shared/primitives";
import { chainConfig } from "@/lib/config";
import { AppClient } from "./AppClient";

export const metadata: Metadata = {
  title: "Spin",
  description:
    "Take a spin and pull a random memecoin from the machine, live on Robinhood Chain.",
};

export default function AppPage() {
  return (
    <PageContainer width="wide" className="pb-24 pt-5 lg:pb-10">
      <h1 className="sr-only">
        Take a spin and pull a random memecoin on {chainConfig.name}
      </h1>
      <AppClient />
    </PageContainer>
  );
}
