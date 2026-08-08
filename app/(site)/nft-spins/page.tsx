import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { NftSpinsTeaser } from "@/components/nft/NftSpinsTeaser";

export const metadata = pageMeta(PAGE_SEO.nftSpins);

export default function NftSpinsPage() {
  return <NftSpinsTeaser />;
}
