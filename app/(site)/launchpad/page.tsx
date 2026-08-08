import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { LaunchpadClient } from "@/components/launchpad/LaunchpadClient";

export const metadata = pageMeta(PAGE_SEO.launchpad);

export default function LaunchpadPage() {
  return <LaunchpadClient />;
}
