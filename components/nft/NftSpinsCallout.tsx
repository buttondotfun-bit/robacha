import { ArrowUpRight } from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { CapsuleGlyph } from "./CapsuleGlyph";

/**
 * One line and a link to the NFT-spins teaser.
 *
 * Shared by the landing page and the mint page rather than written twice,
 * because a duplicated pitch is two places to keep honest. Deliberately
 * small: the teaser page carries the idea and the candidate reel; this only
 * says it exists.
 */
export function NftSpinsCallout({ className }: { className?: string }) {
  return (
    <PageContainer width="wide" className={className ?? "pb-16"}>
      <Reveal className="glass-card relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[24px] p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" data-rarity="grail">
            <CapsuleGlyph id="spins-callout" className="capsule-float h-11 w-11" />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
              Next up: NFT spins
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              A machine where the capsule that drops holds an NFT. Coming soon.
            </p>
          </div>
        </div>
        <ButtonLink href="/nft-spins" variant="secondary" size="md">
          See the teaser
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </Reveal>
    </PageContainer>
  );
}
