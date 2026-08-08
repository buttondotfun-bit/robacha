import type { Metadata } from "next";
import { RaffleGallery } from "@/components/raffle/RaffleGallery";

export const metadata: Metadata = {
  title: "Raffles",
  description:
    "Trustless NFT raffles on ROBACHA. Enter the featured Meebit raffle, browse live community raffles, or launch one for your own NFT — the contract holds the prize and the money and refunds everyone if a raffle doesn't sell out.",
};

export default function RafflePage() {
  return <RaffleGallery />;
}
