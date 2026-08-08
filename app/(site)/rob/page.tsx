import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { RobPage } from "@/components/rob/RobPage";

export const metadata = pageMeta(PAGE_SEO.rob);

export default function RobTokenPage() {
  return <RobPage />;
}
