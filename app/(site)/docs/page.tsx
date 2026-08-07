import type { Metadata } from "next";
import { Info, TriangleAlert } from "lucide-react";
import { ContractDirectory } from "@/components/docs/ContractDirectory";
import { DocsNav } from "@/components/docs/DocsNav";
import { PageContainer } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { DOC_SECTIONS, type DocBlock } from "@/data/docs";
import { chainConfig } from "@/lib/config";
import { RISK_NOTICE } from "@/lib/constants";

/**
 * Re-rendered periodically so the contract table can follow the chain.
 *
 * The security section resolves the live randomness adapter from the gacha, and
 * a fully static page would freeze whatever was true at build time — which is
 * the same staleness the chain read exists to avoid, just moved to a different
 * layer. Five minutes is far quicker than any adapter swap.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How Robacha spins resolve, how randomness is sourced, how odds and fees are published, and what the contracts can and cannot do.",
};

export default function DocsPage() {
  return (
    <PageContainer width="wide" className="pb-12 pt-10">
      <header className="mb-10 max-w-[62ch]">
        <p className="micro">Documentation</p>
        <h1 className="text-page-title mt-2.5">
          How ROBACHA works, in detail.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          The mechanics of a spin, where randomness comes from, how odds and
          fees are published, and what privilege exists in the contracts. Every
          behaviour described here is enforced in code on {chainConfig.name} —
          where something is not built yet, this page says so.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <ButtonLink href="/app" variant="primary" size="md">
            Launch App
          </ButtonLink>
          <ButtonLink href="/faq" variant="secondary" size="md">
            Read the FAQ
          </ButtonLink>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <DocsNav sections={DOC_SECTIONS} />

        <div className="min-w-0">
          {DOC_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 border-t border-[rgb(var(--line-rgb)_/_0.08)] py-9 first:border-t-0 first:pt-0"
            >
              <h2 className="text-section-title text-[24px]">{section.title}</h2>
              <p className="mt-2 text-[13.5px] text-ink-3">{section.summary}</p>

              <div className="mt-5 space-y-4">
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}

                {/* The contract directory reads live config rather than prose. */}
                {section.id === "security" ? <ContractDirectory /> : null}
              </div>
            </section>
          ))}

          <footer className="border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-8">
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              {RISK_NOTICE}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <ButtonLink href="/legal/risk" variant="secondary" size="sm">
                Risk Disclosure
              </ButtonLink>
              <ButtonLink href="/legal/terms" variant="secondary" size="sm">
                Terms
              </ButtonLink>
            </div>
          </footer>
        </div>
      </div>
    </PageContainer>
  );
}

function Block({ block }: { block: DocBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="max-w-[68ch] text-[14.5px] leading-relaxed text-ink-2">
          {block.text}
        </p>
      );

    case "list":
      return (
        <ul className="max-w-[68ch] space-y-2">
          {block.items.map((item, index) => (
            <li
              key={index}
              className="relative pl-5 text-[14.5px] leading-relaxed text-ink-2"
            >
              <span
                className="absolute left-0 top-[0.62em] h-1.5 w-1.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.24)]"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      );

    case "steps":
      return (
        <ol className="max-w-[68ch] space-y-3">
          {block.items.map((item, index) => (
            <li key={index} className="glass-card flex gap-3.5 rounded-[18px] p-4">
              <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(204,255,0,0.4)] text-[12px] font-semibold text-accent-ink">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold tracking-[-0.02em]">
                  {item.title}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                  {item.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      );

    case "table":
      return (
        <div className="glass-card overflow-x-auto rounded-[18px]">
          <table className="w-full min-w-[420px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-[rgb(var(--line-rgb)_/_0.08)]">
                {block.head.map((cell) => (
                  <th
                    key={cell}
                    scope="col"
                    className="micro px-4 py-3 font-medium"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-[rgb(var(--line-rgb)_/_0.05)] last:border-b-0"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-3 ${cellIndex === 0 ? "font-medium text-ink" : "text-ink-2"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "note": {
      const warn = block.tone === "warn";
      const Icon = warn ? TriangleAlert : Info;
      return (
        <div
          className={`flex max-w-[68ch] gap-3 rounded-[16px] border px-4 py-3.5 ${
            warn
              ? "border-[rgba(190,140,60,0.32)] bg-[rgba(255,248,235,0.72)]"
              : "border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--edge-rgb)_/_0.55)]"
          }`}
        >
          <Icon
            className={`mt-0.5 h-4 w-4 shrink-0 ${warn ? "text-[#9a6b1e]" : "text-ink-3"}`}
            aria-hidden="true"
          />
          <p
            className={`text-[13.5px] leading-relaxed ${warn ? "text-[#7d5716]" : "text-ink-2"}`}
          >
            {block.text}
          </p>
        </div>
      );
    }

    case "code":
      return (
        <pre className="glass-quiet overflow-x-auto rounded-[16px] px-4 py-3.5">
          <code className="num block whitespace-pre text-[12.5px] leading-relaxed text-ink-2">
            {block.text}
          </code>
        </pre>
      );
  }
}
