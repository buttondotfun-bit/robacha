import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";

/**
 * The page a shared pull points at.
 *
 * X and every other unfurler read Open Graph tags from a URL — they will not
 * accept a bare image link in a post. So a share needs a page whose metadata
 * points at the generated card, which is what this is.
 *
 * It used to `redirect()` to the app, on the theory that the card is the
 * payload and the page is just a vehicle. That theory failed in practice: a
 * redirect() is a real HTTP 307, crawlers follow it, and X ended up reading
 * the app page's metadata instead — whose fallback image it cannot render.
 * Every shared win unfurled imageless, which on a product whose growth
 * channel is people showing off pulls is not a cosmetic bug.
 *
 * So it is a real 200 page now. Crawlers get the card metadata; the person
 * who clicked through gets the same card at full width and one button into
 * the machine — which is a better landing than being teleported to a page
 * with no trace of the win they clicked on.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ rewardId: string }>;
}): Promise<Metadata> {
  const { rewardId } = await params;
  const image = `/api/win-card/${encodeURIComponent(rewardId)}`;

  return {
    title: "A pull on ROBACHA",
    description:
      "A real pull from the Robacha capsule machine, settled on Robinhood Chain.",
    openGraph: {
      title: "A pull on ROBACHA",
      description:
        "A real pull from the Robacha capsule machine, settled on Robinhood Chain.",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "A pull on ROBACHA",
      description:
        "A real pull from the Robacha capsule machine, settled on Robinhood Chain.",
      images: [image],
    },
  };
}

export default async function WinPage({
  params,
}: {
  params: Promise<{ rewardId: string }>;
}) {
  const { rewardId } = await params;

  return (
    <PageContainer width="narrow" className="pb-16 pt-10">
      <div className="glass-panel glass-reflection glass-highlight overflow-hidden rounded-[28px] p-3 sm:p-4">
        {/* The same card the unfurl shows, so the page and the post agree. */}
        <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-[18px]">
          <Image
            src={`/api/win-card/${encodeURIComponent(rewardId)}`}
            alt="A pull from the Robacha capsule machine"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-[13px] leading-relaxed text-ink-2">
            A real pull, settled on Robinhood Chain. Every draw is provable —
            and the machine is open.
          </p>
          <ButtonLink href="/app" variant="primary" size="lg">
            Spin the machine
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </PageContainer>
  );
}
