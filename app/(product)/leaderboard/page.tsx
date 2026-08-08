import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";
import { PageContainer } from "@/components/shared/primitives";

export const metadata = pageMeta(PAGE_SEO.leaderboard);

export default function LeaderboardPage() {
  return (
    <PageContainer width="wide" className="pb-10 pt-6">
      <header className="mb-6 max-w-[56ch]">
        <p className="micro">Hall of fame</p>
        <h1 className="text-page-title mt-2.5">Leaderboard</h1>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
          Every pull and every spin on this page happened on chain. Nothing is
          curated and nothing is invented — it is just what the contract has
          recorded.
        </p>
      </header>

      <LeaderboardClient />
    </PageContainer>
  );
}
