import type { Metadata } from "next";
import { NftSpinsTeaser } from "@/components/nft/NftSpinsTeaser";

export const metadata: Metadata = {
  title: "NFT Spins",
  description:
    "A new ROBACHA machine is coming to Robinhood Chain: spin and the capsule holds an NFT. Not live yet — follow @robachadotfun for the opening.",
};

export default function NftSpinsPage() {
  return <NftSpinsTeaser />;
}
