import { StockMachinePreview } from "@/components/machines/StockMachinePreview";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pageMeta, PAGE_SEO } from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.stockMachine);

export default function StockMachinePage() {
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
