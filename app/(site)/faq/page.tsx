import { JsonLd } from "@/components/seo/JsonLd";
import { FaqClient } from "@/components/faq/FaqClient";
import { FAQ_GROUPS } from "@/data/faq";
import { faqPageJsonLd, pageMeta, PAGE_SEO } from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.faq);

/**
 * The Robacha support / FAQ page.
 *
 * The interactive experience (search, category nav, deep-linkable accordions,
 * wallet-aware help) lives in FaqClient. This shell adds the SEO metadata and
 * the FAQPage structured data, built from the same FAQ_GROUPS the client
 * renders — the answers are the visible text, never schema-only content.
 */
export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(FAQ_GROUPS.flatMap((g) => g.items))} />
      <FaqClient />
    </>
  );
}
