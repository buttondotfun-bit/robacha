import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { SupportClient } from "@/components/support/SupportClient";
import { PageContainer } from "@/components/shared/primitives";

export const metadata = pageMeta(PAGE_SEO.support);

export default function SupportPage() {
  return (
    <PageContainer width="wide" className="pb-10 pt-6">
      <header className="mb-6 max-w-[56ch]">
        <p className="micro">Help</p>
        <h1 className="text-page-title mt-2.5">Something wrong?</h1>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
          Start here. Most problems are a round waiting on a step that anyone
          can trigger — including you — so this checks your spins against the
          contract and offers the fix directly.
        </p>
      </header>

      <SupportClient />
    </PageContainer>
  );
}
