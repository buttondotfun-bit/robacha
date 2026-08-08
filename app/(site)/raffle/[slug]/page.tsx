import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RaffleClient } from "@/components/raffle/RaffleClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { RaffleProvider } from "@/lib/raffle-context";
import { RAFFLES, getRaffle } from "@/data/raffle";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

// One page per standalone raffle in the registry (Chimpers, Meebit, …).
export function generateStaticParams() {
  return RAFFLES.map((r) => ({ slug: r.slug }));
}

/** "Win a Chimper." → "Win a Chimper" for titles and breadcrumbs. */
function bareHeadline(headline: string): string {
  return headline.replace(/\.$/, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const raffle = getRaffle(slug);
  if (!raffle) return { title: "Not found", robots: { index: false, follow: false } };

  return pageMeta({
    title: `${bareHeadline(raffle.headline)} — NFT Raffle | Robacha`,
    description: `Enter the Robacha ${raffle.prize.collection} raffle on Robinhood Chain — published ticket terms, onchain settlement and full refunds if it doesn't sell out.`,
    path: `/raffle/${raffle.slug}`,
    ogTitle: bareHeadline(raffle.headline),
    ogTag: "NFT raffle",
  });
}

export default async function RafflePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raffle = getRaffle(slug);
  if (!raffle) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Raffles", path: "/raffle" },
          { name: bareHeadline(raffle.headline), path: `/raffle/${raffle.slug}` },
        ])}
      />
      <RaffleProvider raffle={raffle}>
        <RaffleClient raffle={raffle} />
      </RaffleProvider>
    </>
  );
}
