import { ActivityPreview } from "@/components/landing/ActivityPreview";
import { FaqPreview } from "@/components/landing/FaqPreview";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LivePoolPreview } from "@/components/landing/LivePoolPreview";
import { NextRelease } from "@/components/landing/NextRelease";
import { RewardTiers } from "@/components/landing/RewardTiers";
import { Testimonials } from "@/components/landing/Testimonials";
import { TokenLineup } from "@/components/landing/TokenLineup";
import { WhyRobacha } from "@/components/landing/WhyRobacha";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <RewardTiers />
      <LivePoolPreview />
      <TokenLineup />
      <NextRelease />
      <WhyRobacha />
      <Testimonials />
      <ActivityPreview />
      <FaqPreview />
      <FinalCta />
    </>
  );
}
