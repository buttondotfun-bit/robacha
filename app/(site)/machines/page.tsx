import { MachinesClient } from "@/components/machines/MachinesClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, pageMeta, PAGE_SEO } from "@/lib/seo";

export const metadata = pageMeta(PAGE_SEO.machines);

export default function MachinesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Machines", path: "/machines" },
        ])}
      />
      <MachinesClient />
    </>
  );
}
