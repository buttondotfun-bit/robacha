import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { PassportClient } from "@/components/passport/PassportClient";

export const metadata = pageMeta(PAGE_SEO.passport, { robots: "noindex,follow" });

export default function PassportPage() {
  return <PassportClient />;
}
