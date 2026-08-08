import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Globe, MessageCircle } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import type { RaffleConfig } from "@/data/raffle";
import { RaffleTicketPanel } from "./RaffleTicketPanel";
import { RaffleStatusLine } from "./RaffleStatusChip";
import { RaffleActivity } from "./RaffleActivity";
import { RaffleTimeline } from "./RaffleTimeline";
import { RafflePrizePanel } from "./RafflePrizePanel";
import { RaffleContractDetails } from "./RaffleContractDetails";
import { ShareRaffle } from "./ShareRaffle";

/**
 * A standalone raffle's detail page.
 *
 * A two-column entry surface: everything a buyer needs to decide and act sits
 * above the fold — what they can win, the live clock, how full it is, the price
 * and the button — with the prize, the collection and the on-chain proofs
 * beside and below it. Every dynamic value is read from the raffle contract
 * (via the surrounding `RaffleProvider`) or the configured prize; the one thing
 * the contract cannot do, hold the cross-chain NFT, is stated as the mechanism
 * it actually is rather than dressed up as on-chain custody.
 */
export function RaffleClient({ raffle }: { raffle: RaffleConfig }) {
  const websiteLabel = hostOf(raffle.links.website);

  return (
    <PageContainer width="wide" className="pb-16 pt-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/raffle"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Raffles
        </Link>
        <ShareRaffle />
      </div>

      {/* ---------------- Main hero ---------------- */}
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_minmax(0,430px)] lg:items-start">
        {/* LEFT — info + entry */}
        <Reveal className="min-w-0">
          <RaffleStatusLine />
          <h1 className="text-page-title mt-2">{raffle.headline}</h1>
          <p className="mt-2 text-[13.5px] text-ink-2">{raffle.blurb}</p>

          <div className="mt-4">
            <RaffleTicketPanel
              fallback={
                <div className="glass-card rounded-[20px] p-5 text-[13px] text-ink-3">
                  The raffle isn&rsquo;t open yet. Follow{" "}
                  <a href={raffle.links.x} target="_blank" rel="noreferrer" className="text-ink-2 underline decoration-dotted underline-offset-2">
                    {raffle.xHandle}
                  </a>{" "}
                  for the drop.
                </div>
              }
            />
          </div>

          {/* Refund conditions — two minimal columns, said once. */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="glass-card rounded-[14px] p-4">
              <p className="text-[12px] font-semibold">If it sells out</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
                One valid entry is drawn on chain and that wallet receives {raffle.prizePhrase}.
              </p>
            </div>
            <div className="glass-card rounded-[14px] p-4">
              <p className="text-[12px] font-semibold">If it doesn&rsquo;t</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
                Every ticket payment is refundable in full, straight from the contract.
              </p>
            </div>
          </div>
        </Reveal>

        {/* RIGHT — the prize */}
        <Reveal delay={60}>
          <RafflePrizePanel />
        </Reveal>
      </div>

      {/* ---------------- Lifecycle ---------------- */}
      <Reveal delay={40} className="mt-10">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Raffle status</h2>
        <RaffleTimeline className="mt-3" />
      </Reveal>

      {/* ---------------- Recent entries ---------------- */}
      <RaffleActivity className="mt-10" />

      {/* ---------------- How this raffle works ---------------- */}
      <section className="mt-10">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em]">How this raffle works</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HowStep n="01" title="Enter" body="Buy up to 25 tickets with your connected wallet, on Robinhood Chain." />
          <HowStep n="02" title="Sell out" body="All 200 tickets must sell inside the 24-hour window for a draw to happen." />
          <HowStep n="03" title="Draw" body="The contract requests StonkPit's on-chain entropy and picks one weighted ticket." />
          <HowStep n="04" title="Settle" body={`The winner receives ${raffle.prizePhrase}; if it didn't sell out, every ticket refunds in full.`} />
        </div>
      </section>

      {/* ---------------- Contract transparency ---------------- */}
      <RaffleContractDetails className="mt-10" />

      {/* ---------------- Collection links ---------------- */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-6">
        <span className="micro mr-1 text-ink-3">Verify the collection</span>
        <PrizeLink href={raffle.links.opensea} icon={<ArrowUpRight className="h-3 w-3" />}>OpenSea</PrizeLink>
        <PrizeLink href={raffle.links.website} icon={<Globe className="h-3 w-3" />}>{websiteLabel}</PrizeLink>
        <PrizeLink href={raffle.links.x} icon={<XIcon className="h-3 w-3" />}>{raffle.xHandle}</PrizeLink>
        {raffle.links.discord ? (
          <PrizeLink href={raffle.links.discord} icon={<MessageCircle className="h-3 w-3" />}>Discord</PrizeLink>
        ) : null}
      </div>
    </PageContainer>
  );
}

/** "chimpers.xyz" from "https://chimpers.xyz/" — the bare host, for a link label. */
function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

function HowStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="glass-card rounded-[16px] p-4">
      <span className="num text-[12px] font-semibold text-accent-ink">{n}</span>
      <p className="mt-1.5 text-[14px] font-semibold tracking-[-0.01em]">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{body}</p>
    </div>
  );
}

function PrizeLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-ink-2 transition-colors hover:text-ink"
    >
      {icon}
      {children}
    </a>
  );
}
