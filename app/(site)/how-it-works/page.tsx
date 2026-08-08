import { JsonLd } from "@/components/seo/JsonLd";
import { HowItWorksClient } from "@/components/how-it-works/HowItWorksClient";
import { DEEP_DIVE } from "@/data/how-it-works";
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  pageMeta,
  PAGE_SEO,
  webApplicationJsonLd,
} from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.howItWorks);

/**
 * How Robacha works — the product walkthrough.
 *
 * The visual experience lives in HowItWorksClient (so it can show live pool
 * odds, the current round and the $ROB burn from the same canonical hooks as
 * the rest of the app). This shell adds the SEO metadata and structured data;
 * the FAQ schema is built from the same DEEP_DIVE answers the page renders, so
 * they can never drift.
 */
export default function HowItWorksPage() {
  return (
    <>
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
          faqPageJsonLd(DEEP_DIVE.map((d) => ({ question: d.q, answer: d.a }))),
        ]}
      />
      <HowItWorksClient />
    </>
  );
}
