import Link from "next/link";
import { ArrowRight, Boxes, Coins, Sparkles, Ticket } from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";

/**
 * The ecosystem map: one machine, the ways to play it, each with its real
 * status. This consolidates what used to be a "next release" teaser and a
 * separate NFT-spins callout into a single compact grid, so the homepage tells
 * the expansion story once instead of in fragments.
 *
 * Statuses are the true product states today — Token Spins and Raffles are
 * live, NFT Spins and the Capsule mint are pre-launch — and the copy claims
 * nothing a contract doesn't yet back.
 */
const PRODUCTS = [
  {
    icon: Coins,
    name: "Token Spins",
    status: "Live",
    live: true,
    body: "Pull ecosystem tokens from live reward pools.",
    cta: "Spin",
    href: "/app",
  },
  {
    icon: Ticket,
    name: "Raffles",
    status: "Live",
    live: true,
    body: "Enter trustless NFT raffles, or launch one of your own.",
    cta: "View raffles",
    href: "/raffle",
  },
  {
    icon: Sparkles,
    name: "NFT Spins",
    status: "Coming soon",
    live: false,
    body: "The machine is expanding to collectibles.",
    cta: "Explore",
    href: "/nft-spins",
  },
  {
    icon: Boxes,
    name: "Capsules",
    status: "Minting soon",
    live: false,
    body: "Collectible NFTs built to interact with the Robacha machine.",
    cta: "Explore",
    href: "/mint",
  },
] as const;

export function EcosystemMap() {
  return (
    <section className="relative py-14">
      <PageContainer width="wide">
        <SectionHeader
          eyebrow="The ecosystem"
          title="One machine. More ways to play."
          description="The same provable machine, expanding into new ways to spin, collect and win — on Robinhood Chain."
          className="mb-6"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.name}
                href={p.href}
                className="glass-card group flex flex-col rounded-[20px] p-5 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(204,255,0,0.14)] text-accent-ink">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
                      p.live ? "bg-[rgba(204,255,0,0.16)] text-accent-ink" : "bg-[rgb(var(--ink-rgb)_/_0.06)] text-ink-3"
                    }`}
                  >
                    {p.live ? <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> : null}
                    {p.status}
                  </span>
                </div>
                <h3 className="mt-3.5 text-[16px] font-semibold tracking-[-0.02em]">{p.name}</h3>
                <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-ink-2">{p.body}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-ink">
                  {p.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </PageContainer>
    </section>
  );
}
