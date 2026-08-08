import { Check } from "lucide-react";
import { ChainBadge } from "@/components/app-shell/NetworkBadge";
import { PageContainer } from "@/components/shared/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { HeroConsole } from "./HeroConsole";

const TRUST = [
  "Real tokens",
  "Odds shown upfront",
  "Claim straight away",
  "Built on Robinhood Chain",
];

export function Hero() {
  return (
    // overflow-x-clip lets the console and its panels break the grid without
    // ever producing a horizontal scrollbar.
    <section className="relative overflow-x-clip pb-16 pt-6 sm:pb-20 sm:pt-10">
      <PageContainer width="wide">
        {/* The console column is allowed to overflow its track so the product
            visual breaks the grid instead of sitting inside a neat box. */}
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-10 xl:gap-14">
          <div className="relative z-10 max-w-[42rem]">
            <ChainBadge />

            <h1 className="text-display mt-6">
              Rob the <span className="text-gradient-accent">Gacha.</span>
            </h1>

            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">
              It&rsquo;s a capsule machine for memecoins. Take a spin, and you
              pull a random token from whatever&rsquo;s loaded in the machine
              right now.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/app" variant="primary" size="lg">
                Launch App
              </ButtonLink>
              <ButtonLink href="/app" variant="secondary" size="lg">
                Explore Rewards
              </ButtonLink>
            </div>

            <p className="mt-4 text-[13px] font-medium tracking-[-0.01em] text-ink-3">
              Spin. Pull. Rob.
            </p>

            <ul className="mt-9 flex flex-wrap gap-2">
              {TRUST.map((item) => (
                <li
                  key={item}
                  className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-ink-2"
                >
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-accent-ink"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative lg:-mr-2 xl:-mr-6">
            <HeroConsole />
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
