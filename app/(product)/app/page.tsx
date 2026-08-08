import { pageMeta, PAGE_SEO } from "@/lib/seo";
import { PageContainer } from "@/components/shared/primitives";
import { chainConfig } from "@/lib/config";
import { AppClient } from "./AppClient";

export const metadata = pageMeta(PAGE_SEO.spin);

export default function AppPage() {
  return (
    <PageContainer width="wide" className="pb-24 pt-5 lg:pb-10">
      <h1 className="sr-only">
        Take a spin and pull a random memecoin on {chainConfig.name}
      </h1>
      <AppClient />
    </PageContainer>
  );
}
