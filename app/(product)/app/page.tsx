import type { Metadata } from "next";
import { PageContainer } from "@/components/shared/primitives";
import { chainConfig } from "@/lib/config";
import { AppClient } from "./AppClient";

export const metadata: Metadata = {
  title: "Spin",
  description:
    "Spin the live Robacha reward pool and pull random tokens from trending Robinhood Chain projects.",
};

export default function AppPage() {
  return (
    <PageContainer width="wide" className="pb-24 pt-5 lg:pb-10">
      <h1 className="sr-only">
        Spin the live Robacha reward pool on {chainConfig.name}
      </h1>
      <AppClient />
    </PageContainer>
  );
}
