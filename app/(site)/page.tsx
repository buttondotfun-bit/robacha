import { ActivityPreview } from "@/components/landing/ActivityPreview";
import { FaqPreview } from "@/components/landing/FaqPreview";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LivePoolPreview } from "@/components/landing/LivePoolPreview";
import { RewardTiers } from "@/components/landing/RewardTiers";
import { WhyRobacha } from "@/components/landing/WhyRobacha";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <RewardTiers />
      <LivePoolPreview />
      <WhyRobacha />
      <ActivityPreview />
      <FaqPreview />
      <FinalCta />
    </>
  );
}
