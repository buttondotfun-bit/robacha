import { RaffleClient } from "@/components/raffle/RaffleClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Win a Chimper — NFT Raffle | Robacha",
  description:
    "Enter the Robacha Chimpers raffle on Robinhood Chain — published ticket terms, onchain settlement and full refunds if it doesn't sell out.",
  path: "/raffle/chimpers",
  ogTitle: "Win a Chimper",
  ogTag: "NFT raffle",
});

export default function ChimpersRafflePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Raffles", path: "/raffle" },
          { name: "Win a Chimper", path: "/raffle/chimpers" },
        ])}
      />
      <RaffleClient />
    </>
  );
}
