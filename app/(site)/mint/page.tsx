import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { NftTeaser } from "@/components/nft/NftTeaser";

export const metadata = pageMeta(PAGE_SEO.mint);

export default function NftPage() {
  return <NftTeaser />;
}
