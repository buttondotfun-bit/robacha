import type { Metadata } from "next";
import { NftTeaser } from "@/components/nft/NftTeaser";

export const metadata: Metadata = {
  title: "Mint",
  description:
    "Robacha capsule NFTs are coming to Robinhood Chain — mint, trade, or spin a legendary. Not live yet.",
};

export default function NftPage() {
  return <NftTeaser />;
}
