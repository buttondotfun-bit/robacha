import { ActivityPreview } from "@/components/landing/ActivityPreview";
import { EcosystemMap } from "@/components/landing/EcosystemMap";
import { FaqPreview } from "@/components/landing/FaqPreview";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LivePoolPreview } from "@/components/landing/LivePoolPreview";
import { NftPreview } from "@/components/landing/NftPreview";
import { RafflePromo } from "@/components/raffle/RafflePromo";
import { PageContainer } from "@/components/shared/primitives";
import { RewardTiers } from "@/components/landing/RewardTiers";
import { RobToken } from "@/components/landing/RobToken";
import { Testimonials } from "@/components/landing/Testimonials";
import { TokenLineup } from "@/components/landing/TokenLineup";
import { WhyRobacha } from "@/components/landing/WhyRobacha";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, pageMeta, PAGE_SEO, websiteJsonLd } from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.home);

/**
 * The homepage, ordered as one story rather than a list of features:
 *
 *   hero → live raffle → how it works → odds + pool → inside the machine →
 *   the real $ROB → Capsules → the wider ecosystem → why it's a discovery
 *   machine → word of mouth → live activity → the closing spin → the FAQ.
 *
 * Capsules sit mid-page (a major expansion shouldn't arrive last), the closing
 * CTA lands before the FAQ tail rather than after it, and the old "next
 * release" teaser and NFT-spins callout are folded into one ecosystem map so
 * the expansion is told once.
 */
export default function LandingPage() {
  return (
    <>
      <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
      <Hero />

      {/* Live featured raffle, front and centre for arriving visitors as a full
          banner. Renders nothing when no raffle is open, so the funnel stays
          clean. */}
      <PageContainer width="wide" className="pb-2">
        <RafflePromo variant="banner" />
      </PageContainer>

      <HowItWorks />

      {/* Odds then the live pool they belong to — read together as "here are
          the tiers, here's what's actually inside". */}
      <RewardTiers />
      <LivePoolPreview />

      {/* Inside the machine — the loaded assets as a compact strip. */}
      <TokenLineup />

      {/* The real $ROB: contract, utility and burn in one transparency beat. */}
      <RobToken />

      {/* Capsules — the collectible expansion, mid-page rather than buried. */}
      <NftPreview />

      {/* One machine, the ways to play it, each with its real status. */}
      <EcosystemMap />

      {/* The positioning: a discovery machine, not a lottery. */}
      <WhyRobacha />

      {/* Real, public, linked quotes — self-hides when there are none. */}
      <Testimonials />

      {/* Live on-chain activity: the strongest proof the machine is running. */}
      <ActivityPreview />

      {/* The closing spin, before the FAQ tail. */}
      <FinalCta />

      <FaqPreview />
    </>
  );
}
