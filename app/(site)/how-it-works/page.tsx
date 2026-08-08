import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageContainer } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import {
  breadcrumbJsonLd,
  pageMeta,
  PAGE_SEO,
  webApplicationJsonLd,
} from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.howItWorks);

/**
 * How Robacha works — a public, server-rendered explainer.
 *
 * Written to be a real SEO landing page and a genuinely useful read: every
 * mechanic described is what the deployed contracts actually do (a spin
 * resolves after its round closes, odds freeze once a pool starts selling, an
 * underfunded prize refunds rather than pays short). Human-readable, not
 * keyword-stuffed. All content is in the initial HTML — no wallet required.
 */

const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "what-is-robacha",
    title: "What is Robacha?",
    body: (
      <>
        Robacha is an onchain reward and discovery machine built on Robinhood
        Chain. You pay for a spin and pull a random token from a transparent
        reward pool — a way to turn up coins across the ecosystem you&rsquo;d
        never have gone looking for. Every pool&rsquo;s contents, odds and
        results are published from the contract, so nothing about a draw is
        hidden.
      </>
    ),
  },
  {
    id: "token-spins",
    title: "How Token Spins work",
    body: (
      <>
        A spin picks a rarity tier using the odds shown on screen, then picks
        one of the prizes in that tier, then picks how much you receive inside
        that prize&rsquo;s published range. Every spin stands on its own — past
        results never change your chances. You can buy up to five spins at once,
        enough to fill a whole round yourself. See it live on the{" "}
        <Inline href="/app">spin page</Inline>.
      </>
    ),
  },
  {
    id: "reward-pools",
    title: "How reward pools work",
    body: (
      <>
        A pool is the set of tokens currently loaded in a machine, each with a
        tier, a probability and a reward range. The full inventory is readable
        before you spend anything. Once a pool starts selling, its prizes and
        odds are frozen for that version, so what you agreed to is what runs.
      </>
    ),
  },
  {
    id: "odds",
    title: "How odds are published",
    body: (
      <>
        Rarity labels — common, rare, legendary — are derived from each
        tier&rsquo;s probability, and the exact percentages come straight from
        the pool contract. They&rsquo;re shown at the top of the app, on every
        tier and on each prize, before you pay. Those are the same numbers the
        draw actually uses; there is no second set behind them.
      </>
    ),
  },
  {
    id: "rounds",
    title: "How rounds work",
    body: (
      <>
        Spins are grouped into rounds. A round opens, collects entries, closes,
        requests randomness, and settles — assigning each entry its reward. A
        spin resolves once its round settles, not in the spin transaction
        itself. Closing, requesting and settling are permissionless: a keeper
        normally does them, and anyone can push a stuck round along.
      </>
    ),
  },
  {
    id: "randomness",
    title: "How randomness is generated",
    body: (
      <>
        Each round&rsquo;s outcome is drawn from randomness that is committed
        before the round settles, so the result can be checked on chain rather
        than trusted. You can recompute the number that decided any round from
        its published inputs on the{" "}
        <Inline href="/verify">verify page</Inline>.
      </>
    ),
  },
  {
    id: "claims",
    title: "How rewards are claimed",
    body: (
      <>
        When a round settles, your reward is assigned to your wallet and waits
        there to be claimed. Claiming transfers the token to you. Everything you
        pull lives in your bag, with claim status for each reward.
      </>
    ),
  },
  {
    id: "payments",
    title: "What happens to spin payments",
    body: (
      <>
        You pay the spin price plus a small fee that covers running the random
        draw; your wallet adds its own network fee, shown before you sign.
        Payments route through the protocol&rsquo;s fee split rather than to any
        individual, and a share funds the reward reserve.
      </>
    ),
  },
  {
    id: "refunds",
    title: "How refunds work",
    body: (
      <>
        If a round can&rsquo;t pay a prize in full — for example a tier is
        underfunded — that entry is refunded rather than paid short, and if a
        round fails to settle in time its entries become refundable. Refunds are
        withdrawable by the people owed them; the contract holds the money, not
        us.
      </>
    ),
  },
  {
    id: "rob",
    title: "What $ROB does",
    body: (
      <>
        $ROB is Robacha&rsquo;s official utility token on Robinhood Chain. You
        can spend it to spin — your wallet swaps it for exactly the ETH a spin
        costs — and protocol fees buy it back and burn it. Learn more and verify
        the official contract on the <Inline href="/rob">$ROB page</Inline>.
      </>
    ),
  },
  {
    id: "nft",
    title: "NFT Spins, Raffles and Capsules",
    body: (
      <>
        The <Inline href="/raffle">Meebit raffle</Inline> is live now — trustless
        NFT raffles with published terms and onchain settlement.{" "}
        <Inline href="/nft-spins">NFT Spins</Inline> and{" "}
        <Inline href="/mint">Robacha Capsules</Inline> are coming to the same
        machine; both say so plainly until a contract makes them real.
      </>
    ),
  },
  {
    id: "verification",
    title: "Verification",
    body: (
      <>
        Robacha is built around things you can check: published pools, public
        contracts and verifiable results. Read the full contract directory in
        the <Inline href="/docs">docs</Inline>, or recompute any round yourself
        on the <Inline href="/verify">verify page</Inline>.
      </>
    ),
  },
];

export default function HowItWorksPage() {
  return (
    <PageContainer width="narrow" className="pb-16 pt-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "How It Works", path: "/how-it-works" },
          ]),
          webApplicationJsonLd({
            name: "Robacha",
            description: PAGE_SEO.howItWorks.description,
            path: "/app",
          }),
        ]}
      />

      <header className="mb-9">
        <p className="micro">How it works</p>
        <h1 className="text-page-title mt-2.5">How Robacha works.</h1>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
          Robacha is an onchain reward and discovery machine on Robinhood Chain.
          Spin a transparent reward pool, pull whichever token the round selects,
          and check every step against the contract. Here&rsquo;s the whole
          machine, start to finish.
        </p>

        <nav aria-label="On this page" className="mt-6">
          <ul className="flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex h-8 items-center rounded-full border border-[rgb(var(--edge-rgb)_/_0.8)] bg-surface/60 px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="space-y-9">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="text-section-title">{s.title}</h2>
            <p className="mt-2.5 max-w-[68ch] text-[14.5px] leading-relaxed text-ink-2">
              {s.body}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-2.5 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-8">
        <ButtonLink href="/app" variant="primary" size="lg">
          Spin the machine
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
        <ButtonLink href="/faq" variant="secondary" size="lg">
          Read the FAQ
        </ButtonLink>
      </div>

      <p className="mt-6 text-[11.5px] leading-relaxed text-ink-3">
        Robacha is an independent project built for Robinhood Chain. It is not
        affiliated with, endorsed by, or operated by Robinhood. Token values go
        up and down; nothing here is financial advice.
      </p>
    </PageContainer>
  );
}

function Inline({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-ink underline decoration-dotted underline-offset-2 hover:text-ink-2"
    >
      {children}
    </Link>
  );
}
