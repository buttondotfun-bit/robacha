import { RaffleClient } from "@/components/raffle/RaffleClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Win a Meebit — NFT Raffle | Robacha",
  description:
    "Enter the Robacha Meebit raffle on Robinhood Chain — published ticket terms, onchain settlement and full refunds if it doesn't sell out.",
  path: "/raffle/meebit",
  ogTitle: "Win a Meebit",
  ogTag: "NFT raffle",
});

export default function MeebitRafflePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Raffles", path: "/raffle" },
          { name: "Win a Meebit", path: "/raffle/meebit" },
        ])}
      />
      <RaffleClient />
    </>
  );
}
