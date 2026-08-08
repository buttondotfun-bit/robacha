import { PoolsClient } from "@/components/pools/PoolsClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pageMeta, PAGE_SEO } from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.pools);

export default function PoolsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pools", path: "/pools" },
        ])}
      />
      <PoolsClient />
    </>
  );
}
