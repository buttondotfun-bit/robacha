import { ActivityPreview } from "@/components/landing/ActivityPreview";
import { FaqPreview } from "@/components/landing/FaqPreview";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LivePoolPreview } from "@/components/landing/LivePoolPreview";
import { NextRelease } from "@/components/landing/NextRelease";
import { NftPreview } from "@/components/landing/NftPreview";
import { NftSpinsCallout } from "@/components/nft/NftSpinsCallout";
import { RewardTiers } from "@/components/landing/RewardTiers";
import { RobToken } from "@/components/landing/RobToken";
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
      {/* Sits right after the lineup: both answer "which contract is the real
          one", and someone who has just read four reward-token addresses is
          already in the habit of checking. */}
      <RobToken />
      <NextRelease />
      <NftPreview />
      <NftSpinsCallout className="-mt-6 pb-4" />
      <WhyRobacha />
      <Testimonials />
      <ActivityPreview />
      <FaqPreview />
      <FinalCta />
    </>
  );
}
