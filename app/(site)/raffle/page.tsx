import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { RaffleGallery } from "@/components/raffle/RaffleGallery";

export const metadata = pageMeta(PAGE_SEO.raffle);

export default function RafflePage() {
  return <RaffleGallery />;
}
