import Image from "next/image";

/**
 * The capsule, large, as the hero of the mint page.
 *
 * This used to draw itself. The artwork did not exist, and a mockup dressed up
 * as a finished asset would have been selling something we had not made, so it
 * rendered the *form* — a capsule in the machine's own tier colours — and said
 * plainly underneath that it was a placeholder.
 *
 * The artwork exists now, so it is shown, and the placeholder caption is gone
 * with it. Leaving that line up would be the mirror of the original problem:
 * telling people the real thing is still coming while they are looking at it.
 *
 * Full bleed rather than floated on the glass. The render carries its own
 * background — a soft pink-to-cream wash — so the panel's grid, noise and
 * rarity glow would have shown as a rectangle of unrelated texture behind an
 * opaque square. The art is square and the frame is square; it fills it.
 *
 * `priority` because this is the largest element above the fold on the mint
 * page, and `sizes` so a phone is not handed the full 1254px render.
 */
export function CapsulePreview({ rarity = "grail" }: { rarity?: string }) {
  return (
    <div
      data-rarity={rarity}
      className="glass-panel glass-reflection relative aspect-square w-full overflow-hidden rounded-[28px]"
    >
      <Image
        src="/nft.png"
        alt="A Robacha capsule: a glossy pink and white sphere with a lit centre button, floating among smaller capsules"
        fill
        priority
        // The mint page is one column until lg, so anything narrower than that
        // gets the full viewport. Claiming 50vw below 1024px made the browser
        // fetch a 369px render for a 690px slot and the capsule came out soft.
        // 680px covers the widest measured slot (655px on the mint page).
        sizes="(max-width: 1024px) 100vw, 680px"
        className="object-cover"
      />
    </div>
  );
}
