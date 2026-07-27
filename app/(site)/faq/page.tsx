import type { Metadata } from "next";
import { BookOpen, MessageCircle } from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { FAQ_GROUPS } from "@/data/faq";
import { RISK_NOTICE, SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "How Robacha spins, odds, claims and reward pools work on Robinhood Chain.",
};

export default function FaqPage() {
  return (
    <PageContainer width="narrow" className="pb-8 pt-10">
      <header className="mb-9">
        <p className="micro">Support</p>
        <h1 className="text-page-title mt-2.5">
          Everything worth knowing before you spin.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          How spins resolve, how odds are published, what happens to a reward
          after you pull it, and what this build does and does not do yet.
        </p>
      </header>

      {/* Group index */}
      <nav aria-label="FAQ sections" className="mb-10">
        <ul className="flex flex-wrap gap-1.5">
          {FAQ_GROUPS.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                className="inline-flex h-8 items-center rounded-full border border-[rgba(255,255,255,0.8)] bg-white/60 px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-[rgba(20,24,18,0.14)] hover:text-ink"
              >
                {group.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-10">
        {FAQ_GROUPS.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-24">
            <h2 className="text-section-title">{group.title}</h2>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              {group.description}
            </p>
            <div className="glass-panel mt-4 px-5 sm:px-6">
              <Accordion items={group.items} />
            </div>
          </section>
        ))}
      </div>

      {/* Docs + support */}
      <section id="docs" className="mt-12 scroll-mt-24">
        <div className="glass-quiet p-6 sm:p-7">
          <h2 className="text-section-title">Still have a question?</h2>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-ink-2">
            The documentation covers how spins resolve, where randomness comes
            from, how odds and fees are published, and every deployed contract
            address — linked to the block explorer so you can read the code.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ButtonLink href="/app" variant="primary" size="md">
              Open the app
            </ButtonLink>
            <ButtonLink href="/docs" variant="secondary" size="md">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Read the docs
            </ButtonLink>
          </div>

          <div className="mt-6 border-t border-[rgba(20,24,18,0.08)] pt-5">
            <p className="micro mb-3 flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3" aria-hidden="true" />
              Community
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-full border border-[rgba(255,255,255,0.8)] bg-white/60 px-3 text-[12.5px] text-ink-2 transition-colors hover:text-ink"
                  >
                    {social.label}
                    <span className="sr-only"> — {social.handle}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 border-t border-[rgba(20,24,18,0.08)] pt-5 text-[11.5px] leading-relaxed text-ink-3">
            {RISK_NOTICE} Nothing on this page is financial advice.
          </p>
        </div>
      </section>
    </PageContainer>
  );
}
