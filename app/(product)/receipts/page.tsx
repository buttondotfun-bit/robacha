import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { ReceiptsClient } from "@/components/receipts/ReceiptsClient";

export const metadata = pageMeta(PAGE_SEO.receipts, { robots: "noindex,follow" });

export default function ReceiptsPage() {
  return <ReceiptsClient />;
}
