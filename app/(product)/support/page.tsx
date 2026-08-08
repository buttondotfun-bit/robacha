import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { SupportClient } from "@/components/support/SupportClient";

export const metadata = pageMeta(PAGE_SEO.support);

export default function SupportPage() {
  return <SupportClient />;
}
