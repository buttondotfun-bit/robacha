import type { Metadata } from "next";
import { LaunchpadClient } from "@/components/launchpad/LaunchpadClient";

export const metadata: Metadata = {
  title: "NFT Raffle Launchpad",
  description:
    "Escrow one of your Robinhood Chain NFTs and run a trustless raffle for it. The contract holds the NFT and the money, draws the winner on chain, and refunds everyone if it doesn't sell out.",
};

export default function LaunchpadPage() {
  return <LaunchpadClient />;
}
