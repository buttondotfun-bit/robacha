import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubRaffleDetail } from "@/components/launchpad/HubRaffleDetail";
import { pageMeta } from "@/lib/seo";

// Per-creator raffles are user-generated and often thin; noindex,follow keeps
// them out of the index (§57/58) while the curated /raffle hub carries the SEO.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const n = Number(id);
  const label = Number.isInteger(n) && n > 0 ? ` #${n}` : "";
  return pageMeta(
    {
      title: `NFT Raffle${label} | Robacha`,
      description:
        "A trustless NFT raffle on the Robacha launchpad, settled onchain on Robinhood Chain.",
      path: `/launchpad/${id}`,
      ogTitle: "NFT Raffle",
      ogTag: "Launchpad",
    },
    { robots: "noindex,follow" },
  );
}

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
