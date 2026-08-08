import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/shared/primitives";
import { LEGAL_DOCS, LEGAL_SLUGS } from "@/data/legal";
import { pageMeta } from "@/lib/seo";

export function generateStaticParams() {
  return LEGAL_SLUGS.map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  const entry = LEGAL_DOCS[doc];
  if (!entry) return { title: "Not found", robots: { index: false, follow: false } };
  return pageMeta({
    title: `${entry.title} | Robacha`,
    description: entry.summary,
    path: `/legal/${doc}`,
  });
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const entry = LEGAL_DOCS[doc];
  if (!entry) notFound();

  return (
    <PageContainer width="narrow" className="pb-8 pt-10">
      <header className="mb-8">
        <p className="micro">Legal</p>
        <h1 className="text-page-title mt-2.5">{entry.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          {entry.summary}
        </p>
      </header>

      <div className="mb-8 flex items-start gap-3 rounded-[14px] border border-[#f0e2bb] bg-[#fdf8ec] px-4 py-3.5">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-[#96620f]"
          aria-hidden="true"
        />
        <p className="text-[12.5px] leading-relaxed text-[#7c5514]">
          <strong className="font-semibold">Placeholder document.</strong> This
          is a drafting outline for the ROBACHA MVP, not reviewed legal text and
          not legal advice. It must be replaced with a counsel-approved version
          before any public launch.
        </p>
      </div>

      <article className="space-y-8">
        {entry.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
              {section.heading}
            </h2>
            <div className="mt-2.5 space-y-2.5">
              {section.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="text-[14px] leading-relaxed text-ink-2"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </article>

      <nav
        aria-label="Other legal documents"
        className="mt-12 flex flex-wrap gap-1.5 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-6"
      >
        {LEGAL_SLUGS.filter((slug) => slug !== entry.slug).map((slug) => (
          <Link
            key={slug}
            href={`/legal/${slug}`}
            className="inline-flex h-8 items-center rounded-full border border-[rgb(var(--edge-rgb)_/_0.8)] bg-surface/60 px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-[rgb(var(--line-rgb)_/_0.14)] hover:text-ink"
          >
            {LEGAL_DOCS[slug].title}
          </Link>
        ))}
        <Link
          href="/faq"
          className="inline-flex h-8 items-center rounded-full border border-[rgb(var(--edge-rgb)_/_0.8)] bg-surface/60 px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-[rgb(var(--line-rgb)_/_0.14)] hover:text-ink"
        >
          FAQ
        </Link>
      </nav>
    </PageContainer>
  );
}
