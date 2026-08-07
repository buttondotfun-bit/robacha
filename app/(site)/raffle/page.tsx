import type { Metadata } from "next";
import { RaffleClient } from "@/components/raffle/RaffleClient";

export const metadata: Metadata = {
  title: "Meebit Raffle",
  description:
    "Win a Meebit on ROBACHA. 200 tickets, $10 each, 24 hours — sell out and one wallet wins, or every ticket is refunded in full. Opening soon.",
};

export default function RafflePage() {
  return <RaffleClient />;
}
