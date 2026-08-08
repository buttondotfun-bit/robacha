import Image from "next/image";
import { ArrowUpRight, Lock } from "lucide-react";
import { MintFollowCta } from "@/components/nft/MintFollowCta";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import {
  NFT_MINT_PRICE_USD,
  NFT_TIERS,
  NFT_TOTAL_SUPPLY,
  vaultAt,
} from "@/data/nft";

/**
 * The capsule drop, teased on the landing page.
 *
 * Deliberately not a second copy of the mint page. It carries only the four
 * things that make someone click — how many exist, what one costs, that three
 * are Grails, and where the date will be announced — and sends them to /mint
 * for the rest.
 * Repeating the full pitch here would mean two places to keep honest, and the
 * numbers on this page are the ones most likely to be quoted back at us.
 *
 * Reads from the same data file as the mint page, so the supply, the price and
 * the date can never drift between the two.
 */
export function NftPreview() {
  const grail = NFT_TIERS.find((tier) => tier.key === "grail");

  return (
    <section className="relative py-11 sm:py-14" aria-label="Capsule NFT drop">
      <PageContainer width="wide">
        <Reveal className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[32px] p-3 sm:p-4">
          <span className="noise-overlay" aria-hidden="true" />

          <div className="relative grid gap-3 lg:grid-cols-[1.05fr_1fr]">
            {/* ---- artwork ---- */}
            {/* The render, full bleed. It carries its own pink-to-cream
                background, so the glass-quiet surface and rarity glow that used
                to sit behind the drawn glyphs would only have shown as a border
                of unrelated texture. Cropped by object-cover on this non-square
                panel, which the composition survives — the capsule is centred. */}
            {/* Square until the two-column layout kicks in. The render is
                square, and forcing it into a 656x280 band cropped the capsule
                off at both poles. Above lg the artwork column is stretched to
                the pitch beside it, which is near enough square that cover
                barely trims. */}
            <div className="relative aspect-square overflow-hidden rounded-[24px] lg:aspect-auto lg:min-h-[280px]">
              <Image
                src="/nft.png"
                alt="A Robacha capsule: a glossy pink and white sphere with a lit centre button, floating among smaller capsules"
                fill
                sizes="(max-width: 1024px) 100vw, 680px"
                className="object-cover"
              />
            </div>

            {/* ---- pitch ---- */}
            <div className="p-4 sm:p-5">
              <span className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-ink-2">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Minting soon
              </span>

              <h2 className="text-section-title mt-4">
                {NFT_TOTAL_SUPPLY} capsules. Three of them Grails.
              </h2>

              <p className="mt-3 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-2">
                Mint a capsule for ${NFT_MINT_PRICE_USD}, trade it like any NFT,
                or hand a Legendary back to the machine and spin it against a
                deeper pool. {grail ? `Only ${grail.supply} Grails will ever exist` : ""}
                {grail ? ", and they draw from the deepest pool there is." : ""}
              </p>

              <dl className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Supply", value: String(NFT_TOTAL_SUPPLY) },
                  { label: "Mint price", value: `$${NFT_MINT_PRICE_USD}` },
                  { label: "Grails", value: String(grail?.supply ?? 3) },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="micro">{stat.label}</dt>
                    <dd className="num mt-1 text-[20px] font-semibold tracking-[-0.03em]">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
                At half sold, about ${vaultAt(0.5).toLocaleString()} goes into
                the prize vault — 85% of every mint, the same split the machine
                already runs on.
              </p>

              <div className="mt-5 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4">
                <MintFollowCta />
              </div>

              <ButtonLink href="/mint" variant="primary" size="lg" className="mt-5">
                See the drop
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </PageContainer>
    </section>
  );
}
