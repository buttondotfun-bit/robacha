import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubRaffleDetail } from "@/components/launchpad/HubRaffleDetail";

export const metadata: Metadata = {
  title: "Raffle",
  description: "A trustless NFT raffle on the ROBACHA launchpad.",
};

export default async function LaunchpadRafflePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <HubRaffleDetail id={n} />;
}
