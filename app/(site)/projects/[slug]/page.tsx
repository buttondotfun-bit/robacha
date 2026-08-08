import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isAddress } from "viem";
import { ProjectClient } from "@/components/projects/ProjectClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { projectBySlug, PROJECTS } from "@/data/projects";
import { breadcrumbJsonLd, canonicalUrl, pageMeta } from "@/lib/seo";

// Pre-render the curated projects that have their own generic page ($ROB has a
// dedicated /rob hub and is excluded); raw-address pages render on demand.
export function generateStaticParams() {
  return PROJECTS.filter((p) => !p.href).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projectBySlug(slug);

  if (project?.href) {
    return {
      title: `${project.name} | Robacha`,
      alternates: { canonical: canonicalUrl(project.href) },
    };
  }
  if (project) {
    return pageMeta({
      title: `${project.name} on Robacha | $${project.ticker}`,
      description:
        project.blurb ??
        `Explore ${project.name} inside Robacha on Robinhood Chain. View its current machine, reward pool, published odds, inventory and discovery activity.`,
      path: `/projects/${project.slug}`,
      ogTitle: project.name,
      ogTag: "Inside the machine",
    });
  }
  if (isAddress(slug)) {
    // Unlisted reward token — thin and machine-derived; keep it out of the index.
    return pageMeta(
      {
        title: "Project on Robacha",
        description:
          "A reward token in the Robacha ecosystem on Robinhood Chain, with onchain discovery activity.",
        path: `/projects/${slug}`,
      },
      { robots: "noindex,follow" },
    );
  }
  return { title: "Not found", robots: { index: false, follow: false } };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (project?.href) redirect(project.href);

  const address = project?.address ?? (isAddress(slug) ? slug : null);
  if (!address) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Discover", path: "/discover" },
          { name: project?.name ?? "Project", path: `/projects/${slug}` },
        ])}
      />
      <ProjectClient address={address} />
    </>
  );
}
