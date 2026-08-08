import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";

export const metadata = pageMeta(PAGE_SEO.leaderboard);

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
