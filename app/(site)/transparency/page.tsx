import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { TransparencyClient } from "@/components/transparency/TransparencyClient";

export const metadata = pageMeta(PAGE_SEO.transparency);

export default function TransparencyPage() {
  return <TransparencyClient />;
}
