import { PageContainer } from "@/components/shared/primitives";
import { StockMachinePreview } from "@/components/machines/StockMachinePreview";
import { StockMachineLive } from "@/components/machines/StockMachineLive";
import { JsonLd } from "@/components/seo/JsonLd";
import { isStockMachineLive } from "@/lib/config";
import { breadcrumbJsonLd, pageMeta, PAGE_SEO } from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.stockMachine);

/**
 * The Stock Machine. Coming-soon preview until a tokenized-stock pool is
 * deployed and funded on chain (isStockMachineLive) — at which point the same
 * verified spin experience runs against it. The switch is real config, never a
 * frontend claim.
 */
export default function StockMachinePage() {
  if (isStockMachineLive) {
    return (
      <PageContainer width="wide" className="pb-24 pt-5 lg:pb-10">
        <StockMachineLive />
      </PageContainer>
    );
  }

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Machines", path: "/machines" },
          { name: "Stock Machine", path: "/machines/tokenized-stocks" },
        ])}
      />
      <StockMachinePreview />
    </>
  );
}
