import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { PageContainer } from "@/components/shared/primitives";
import { CreateRaffleForm } from "@/components/launchpad/CreateRaffleForm";

export const metadata = pageMeta(PAGE_SEO.createRaffle, { robots: "noindex,follow" });

export default function CreateRafflePage() {
  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      <CreateRaffleForm />
    </PageContainer>
  );
}
