import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MachineDetail } from "@/components/machines/MachineDetail";
import { JsonLd } from "@/components/seo/JsonLd";
import { MACHINES, machineBySlug } from "@/data/machines";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export function generateStaticParams() {
  // The Stock Machine has its own dedicated static route
  // (machines/tokenized-stocks) — exclude it so the two don't collide.
  return MACHINES.filter((m) => m.slug !== "tokenized-stocks").map((m) => ({
    slug: m.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const machine = machineBySlug(slug);
  if (!machine) return { title: "Not found", robots: { index: false, follow: false } };
  return pageMeta({
    title: `${machine.name} on Robinhood Chain | Robacha`,
    description: machine.description,
    path: `/machines/${machine.slug}`,
    ogTitle: machine.name,
    ogTag: machine.status === "live" ? "Live machine" : "Coming soon",
  });
}

export default async function MachinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const machine = machineBySlug(slug);
  if (!machine) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Machines", path: "/machines" },
          { name: machine.name, path: `/machines/${machine.slug}` },
        ])}
      />
      <MachineDetail machine={machine} />
    </>
  );
}
