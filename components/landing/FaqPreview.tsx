import { ArrowUpRight, BookOpen } from "lucide-react";
import { LightField } from "@/components/shared/AmbientBackground";
import { PageContainer } from "@/components/shared/primitives";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { GlassChip } from "@/components/ui/Glass";
import { FAQ_PREVIEW } from "@/data/faq";
import { NETWORK_LABEL } from "@/lib/web3";

/**
 * Split FAQ: the framing sits on the left as a sticky panel, the answers open
 * as layers inside the glass on the right.
 */
export function FaqPreview() {
  return (
    <section className="relative py-16 sm:py-20">
      <LightField
        tone="cool"
        size={680}
        className="right-[6%] top-[12%] opacity-60"
      />

      <PageContainer width="wide" className="relative">
        <div className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[32px] p-3 sm:p-4">
          <span className="noise-overlay" aria-hidden="true" />

          <div className="relative grid gap-3 lg:grid-cols-[0.82fr_1.18fr]">
            {/* Left — framing */}
            <div className="glass-quiet flex flex-col rounded-[24px] p-6 sm:p-7 lg:sticky lg:top-28 lg:self-start">
              <p className="micro">FAQ</p>
              <h2 className="text-section-title mt-3">
                Questions worth asking first.
              </h2>
              <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed text-ink-2">
                How spins resolve, how odds are published, and what this build
                does and does not do yet. The docs cover the same ground in
                depth, down to the contract level.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <GlassChip dot className="h-8">
                  {NETWORK_LABEL} · Live
                </GlassChip>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <ButtonLink href="/faq" variant="secondary" size="md">
                  All questions
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/docs" variant="secondary" size="md">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Read the docs
                </ButtonLink>
              </div>
            </div>

            {/* Right — answers */}
            <div className="glass-card rounded-[24px] px-5 sm:px-7">
              <Accordion items={FAQ_PREVIEW} defaultOpen={0} />
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
