import { DiscoverClient } from "@/components/discover/DiscoverClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pageMeta, PAGE_SEO } from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.discover);

export default function DiscoverPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Discover", path: "/discover" },
        ])}
      />
      <DiscoverClient />
    </>
  );
}
