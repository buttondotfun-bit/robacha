import { ArrowUpRight, Lock } from "lucide-react";
import { CapsuleGlyph } from "@/components/nft/CapsuleGlyph";
import { MintCountdown } from "@/components/nft/MintCountdown";
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
 * are Grails, and how long is left — and sends them to /nft for the rest.
 * Repeating the full pitch here would mean two places to keep honest, and the
 * numbers on this page are the ones most likely to be quoted back at us.
 *
 * Reads from the same data file as the mint page, so the supply, the price and
 * the date can never drift between the two.
 */
export function NftPreview() {
  const grail = NFT_TIERS.find((tier) => tier.key === "grail");

  return (
    <section className="relative py-16 sm:py-20" aria-label="Capsule NFT drop">
      <PageContainer width="wide">
        <Reveal className="glass-panel glass-reflection glass-highlight relative overflow-hidden rounded-[32px] p-3 sm:p-4">
          <span className="noise-overlay" aria-hidden="true" />

          <div className="relative grid gap-3 lg:grid-cols-[1.05fr_1fr]">
            {/* ---- artwork ---- */}
            <div
              data-rarity="grail"
              className="glass-quiet relative grid min-h-[280px] place-items-center overflow-hidden rounded-[24px] p-6"
            >
              <div
                aria-hidden="true"
                className="rarity-breathe pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[6px]"
                style={{
                  background:
                    "radial-gradient(circle, rgb(var(--rarity-glow) / 0.3) 0%, transparent 68%)",
                }}
              />

              {/* One of each tier, the Grail leading. */}
              <div className="relative flex items-end gap-3">
                {NFT_TIERS.map((tier, index) => (
                  <span
                    key={tier.key}
                    data-rarity={tier.key}
                    className={
                      tier.key === "grail"
                        ? "capsule-float"
                        : index === 0
                          ? "capsule-drift-a opacity-70"
                          : index === 1
                            ? "capsule-drift-b opacity-70"
                            : "capsule-drift-c opacity-70"
                    }
                  >
                    <CapsuleGlyph
                      id={`home-${tier.key}`}
                      className={
                        tier.key === "grail"
                          ? "h-24 w-24 drop-shadow-[0_12px_28px_rgb(var(--rarity-glow)_/_0.45)]"
                          : "h-12 w-12 drop-shadow-[0_6px_14px_rgb(var(--rarity-glow)_/_0.3)]"
                      }
                    />
                  </span>
                ))}
              </div>

              <p className="absolute bottom-4 text-[11px] text-ink-3">
                Placeholder artwork — the real capsules are still being drawn.
              </p>
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
                <MintCountdown />
              </div>

              <ButtonLink href="/nft" variant="primary" size="lg" className="mt-5">
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
