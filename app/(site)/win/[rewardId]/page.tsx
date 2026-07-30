import type { Metadata } from "next";
import { redirect } from "next/navigation";

/**
 * The page a shared pull points at.
 *
 * X and every other unfurler read Open Graph tags from a URL — they will not
 * accept a bare image link in a post. So a share needs a page whose metadata
 * points at the generated card, which is what this is.
 *
 * It has no content of its own and sends visitors straight to the machine. The
 * card is the payload; this exists so the card can travel.
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

export default function WinPage() {
  redirect("/app");
}
