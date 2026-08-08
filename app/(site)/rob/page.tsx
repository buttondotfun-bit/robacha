import type { Metadata } from "next";
import { RobPage } from "@/components/rob/RobPage";

export const metadata: Metadata = {
  title: "$ROB — Robacha's utility token",
  description:
    "Robacha's official utility token on Robinhood Chain. Spend $ROB to spin, win it from live reward pools, and watch protocol fees buy it back and burn it — every claim verifiable on chain.",
};

export default function RobTokenPage() {
  return <RobPage />;
}
