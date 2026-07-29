import Image from "next/image";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { XIcon } from "@/components/brand/XIcon";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { TESTIMONIALS } from "@/data/testimonials";
import { cn } from "@/lib/utils";

/**
 * What people have actually said, in public, with their name on it.
 *
 * Rendered from stored copies rather than the official embed script, which
 * would put a third-party tracker on the landing page of a site whose whole
 * argument is that you can check everything yourself. Each card links to the
 * original instead, so the claim is verifiable without us being trusted.
 *
 * Quotes are complete and verbatim. Cropping a sentence to the flattering half
 * is the ordinary way testimonials become dishonest, and it is not worth it —
 * a real person's real words are the entire value of the section.
 *
 * The section renders nothing at all when there is nothing to show. An empty
 * "what people say" heading is worse than no heading.
 */
export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20" aria-label="What people are saying">
      <PageContainer width="wide">
        <SectionHeader
          eyebrow="Word of mouth"
          title="What people are saying."
          description="Unpaid, unprompted and posted in public. Every quote links to the original — read it there if you'd rather."
          className="mb-6"
        />

        {/* A single card stretched across a three-column grid reads as a
            broken row rather than a deliberate one, so the layout follows the
            number of quotes there actually are. */}
        <ul
          className={cn(
            "grid gap-4",
            TESTIMONIALS.length === 1
              ? "max-w-[560px]"
              : TESTIMONIALS.length === 2
                ? "sm:grid-cols-2"
                : "sm:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {TESTIMONIALS.map((item) => (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="glass-card group flex h-full flex-col rounded-[20px] p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={item.avatar}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full border border-[rgba(255,255,255,0.85)] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-[13.5px] font-semibold tracking-[-0.02em]">
                      {item.name}
                      {item.verified ? (
                        <BadgeCheck
                          className="h-3.5 w-3.5 shrink-0 text-[#4a87c4]"
                          aria-label="Verified account"
                        />
                      ) : null}
                    </p>
                    <p className="num truncate text-[11.5px] text-ink-3">{item.handle}</p>
                  </div>
                  <XIcon
                    className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-ink"
                    aria-hidden="true"
                  />
                </div>

                {/* whitespace-pre-line keeps the author's own line breaks. */}
                <blockquote className="mt-3.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">
                  {item.quote}
                </blockquote>

                <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-[11px] text-ink-3">
                  <span>
                    {item.context ? `${item.context} · ` : ""}
                    <time dateTime={item.postedAt}>
                      {new Date(item.postedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </span>
                  <span className="inline-flex items-center gap-1 transition-colors group-hover:text-ink-2">
                    Read it on X
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[11.5px] leading-relaxed text-ink-3">
          These are other people&rsquo;s opinions, not a promise from us. Every
          spin is chance, token values move, and nothing on this page changes
          the odds published on the pool.
        </p>
      </PageContainer>
    </section>
  );
}
