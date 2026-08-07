"use client";

import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { PageContainer, Pill, SectionHeader } from "@/components/shared/primitives";

/**
 * Machines that do not exist yet.
 *
 * These are themes we intend to build, not pools. That distinction is the whole
 * design: the cards carry a name and nothing else, and the contents are drawn
 * as an unreadable blur rather than as prizes, odds or prices. Inventing those
 * numbers to make a card look convincing would put fabricated product values on
 * a page whose entire promise is that every figure is read from a contract —
 * and the first person to notice would be right to doubt the real ones too.
 *
 * So the blur is not decoration hiding real data. There is no data. It is an
 * honest picture of "nothing here yet", and every card still says so in words —
 * the tone is excited, the claim is not.
 */
const UPCOMING: { name: string; theme: string; href?: string }[] = [
  {
    // The one machine on this list with a page of its own — it has a public
    // teaser with a real candidate reel, so its card links out where the
    // others stay sealed.
    name: "NFT spins",
    theme: "Same spin, but the capsule holds an NFT from a top Robinhood Chain collection.",
    href: "/nft-spins",
  },
  {
    name: "Blue chip machine",
    theme: "The big names on Robinhood Chain. Bigger pulls, bigger price.",
  },
  {
    name: "Tokenised stocks",
    theme: "Pull a slice of a real company instead of a memecoin. We’re exploring it — no promises yet.",
  },
  {
    name: "Community machine",
    theme: "Stocked with whatever you lot ask for. Loudest coins win.",
  },
];

export function UpcomingMachines({
  variant = "full",
}: {
  /**
   * `strip` is for the spin page, which is already dense — a teaser row rather
   * than a second grid competing with the machine someone came to play.
   */
  variant?: "full" | "strip";
} = {}) {
  if (variant === "strip") return <UpcomingStrip />;

  return (
    <section className="relative mt-12" aria-label="Upcoming machines">
      <PageContainer width="wide" className="px-0">
        <SectionHeader
          eyebrow="In the workshop"
          title="More machines are coming."
          description="Three more in the works. Locked until they're loaded — the moment one's ready it drops in above, with real prizes and real odds."
          className="mb-6"
          action={<Pill tone="neutral">Locked</Pill>}
        />

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {UPCOMING.map((m) => (
            <li
              key={m.name}
              className="glass-card relative overflow-hidden rounded-[20px] p-5"
            >
              {/* Deliberately contentless. Shapes, not numbers — there is no
                  pool behind this to describe. */}
              <div
                aria-hidden="true"
                className="pointer-events-none relative h-[112px] select-none overflow-hidden rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.04)]"
              >
                <div className="absolute inset-0 blur-[7px]">
                  <span className="absolute left-4 top-4 h-9 w-9 rounded-xl bg-[rgb(var(--ink-rgb)_/_0.16)]" />
                  <span className="absolute left-16 top-5 h-3 w-24 rounded-full bg-[rgb(var(--ink-rgb)_/_0.13)]" />
                  <span className="absolute left-16 top-11 h-2.5 w-16 rounded-full bg-[rgb(var(--ink-rgb)_/_0.09)]" />
                  <span className="absolute left-4 top-[72px] h-3 w-28 rounded-full bg-[rgba(204,255,0,0.4)]" />
                  <span className="absolute right-5 top-6 h-5 w-14 rounded-full bg-[rgb(var(--ink-rgb)_/_0.11)]" />
                  <span className="absolute right-5 top-[70px] h-3 w-10 rounded-full bg-[rgb(var(--ink-rgb)_/_0.1)]" />
                </div>

                <div className="absolute inset-0 grid place-items-center">
                  <span className="glass-micro inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Coming soon
                  </span>
                </div>
              </div>

              <h3 className="mt-4 text-[15px] font-semibold leading-snug tracking-[-0.02em]">
                {m.name}
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{m.theme}</p>
              {m.href ? (
                <Link
                  href={m.href}
                  className="mt-3 inline-flex items-center gap-1 border-t border-[rgb(var(--line-rgb)_/_0.07)] pt-3 text-[11.5px] font-medium text-accent-ink underline decoration-dotted underline-offset-2"
                >
                  See the teaser
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              ) : (
                <p className="mt-3 border-t border-[rgb(var(--line-rgb)_/_0.07)] pt-3 text-[11.5px] text-ink-3">
                  Nothing loaded in yet.
                </p>
              )}
            </li>
          ))}
        </ul>
      </PageContainer>
    </section>
  );
}

/** Compact teaser for the spin page. */
function UpcomingStrip() {
  return (
    <section
      className="glass-card rounded-[20px] p-4"
      aria-label="Upcoming machines"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold tracking-[-0.02em]">
          More machines are coming
        </p>
        <Pill tone="neutral">Locked</Pill>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
        Nothing loaded in them yet. When one&rsquo;s ready it turns up here,
        loaded and spinnable.
      </p>

      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {UPCOMING.map((m) => (
          <li
            key={m.name}
            className="relative overflow-hidden rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.04)] px-3 py-3"
          >
            {m.href ? (
              <Link href={m.href} className="absolute inset-0 z-10" aria-label={`${m.name} teaser`} />
            ) : null}
            {/* Same idea as the full cards: shapes, not numbers. */}
            <div aria-hidden="true" className="absolute inset-0 blur-[6px]">
              <span className="absolute left-3 top-3 h-6 w-6 rounded-lg bg-[rgb(var(--ink-rgb)_/_0.14)]" />
              <span className="absolute left-11 top-4 h-2.5 w-16 rounded-full bg-[rgb(var(--ink-rgb)_/_0.11)]" />
              <span className="absolute left-3 bottom-3 h-2.5 w-20 rounded-full bg-[rgba(204,255,0,0.35)]" />
            </div>
            <div className="relative flex items-center gap-1.5">
              <Lock className="h-3 w-3 shrink-0 text-ink-3" aria-hidden="true" />
              <span className="truncate text-[12px] font-medium text-ink">{m.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
