import { GenesisPoolClient } from "@/components/pools/GenesisPoolClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pageMeta, PAGE_SEO } from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.genesisPool);

export default function GenesisPoolPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pools", path: "/pools" },
          { name: "Genesis Pool", path: "/pools/genesis" },
        ])}
      />
      <GenesisPoolClient />
    </>
  );
}
