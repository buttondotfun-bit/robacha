import { LightField } from "@/components/shared/AmbientBackground";
import { PageContainer, SectionHeader } from "@/components/shared/primitives";
import { cn } from "@/lib/utils";

/**
 * Each step sits 24px lower than the last, so the row reads as a descending
 * path. The connector line below is drawn from these exact offsets — change
 * one and the other has to follow.
 */
const STEP_STAGGER = ["lg:mt-0", "lg:mt-6", "lg:mt-12", "lg:mt-18"];
const STEP_DROP = 24;
const ICON_RADIUS = 28;

const STEPS = [
  {
    title: "Connect",
    body: "Link your Robinhood Chain-compatible wallet.",
    icon: <WalletGlyph />,
  },
  {
    title: "Pick",
    body: "Select the number of spins you want.",
    icon: <StackGlyph />,
  },
  {
    title: "Spin",
    body: "Pull a random reward from the live pool.",
    icon: <CapsuleGlyph />,
  },
  {
    title: "Claim",
    body: "Receive the tokens and track them in My Bag.",
    icon: <BagGlyph />,
  },
];

/**
 * A connected journey rather than four identical boxes: steps sit at staggered
 * depths along an illuminated path, with a capsule travelling the line.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-28 py-16 sm:py-20">
      <LightField
        tone="green"
        size={720}
        className="left-1/2 top-10 -translate-x-1/2 opacity-70"
      />

      <PageContainer width="wide" className="relative">
        <SectionHeader
          eyebrow="How it works"
          title="Four steps from wallet to reward."
          description="Every spin is a single transaction against the live pool. Odds are published before you spin, not after."
          className="mb-10"
        />

        <div className="relative">
          {/* Desktop path. The steps descend by exactly 28px each, so their
              icon centres fall on one straight line — this tracks it. */}
          <svg
            aria-hidden="true"
            viewBox={`0 0 100 ${ICON_RADIUS + STEP_DROP * 3 + 8}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 top-0 hidden w-full lg:block"
            style={{ height: ICON_RADIUS + STEP_DROP * 3 + 8 }}
          >
            <defs>
              <linearGradient id="robacha-path" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(16,17,15,0)" />
                <stop offset="14%" stopColor="rgba(16,17,15,0.13)" />
                <stop offset="50%" stopColor="rgba(140,180,0,0.6)" />
                <stop offset="86%" stopColor="rgba(16,17,15,0.13)" />
                <stop offset="100%" stopColor="rgba(16,17,15,0)" />
              </linearGradient>
            </defs>
            {/* Columns are quarters, so icon centres sit at 12.5% + 25%·i */}
            <line
              x1="12.5"
              y1={ICON_RADIUS}
              x2="87.5"
              y2={ICON_RADIUS + STEP_DROP * 3}
              stroke="url(#robacha-path)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            {[1, 2, 3].map((i) => (
              <circle
                key={i}
                cx={12.5 + 25 * i - 12.5}
                cy={ICON_RADIUS + STEP_DROP * (i - 0.5)}
                r="2"
                fill="rgba(16,17,15,0.14)"
              />
            ))}
          </svg>

          {/* Mobile: a vertical glass timeline. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-6 left-[27px] top-6 w-px bg-[linear-gradient(180deg,transparent,rgba(16,17,15,0.12)_10%,rgba(16,17,15,0.12)_90%,transparent)] lg:hidden"
          />

          <ol className="relative grid gap-6 lg:grid-cols-4 lg:items-start lg:gap-5">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className={cn(
                  "relative flex gap-5 lg:block lg:text-center",
                  // Staggered depth — the sequence reads as a path, not a row.
                  STEP_STAGGER[index],
                )}
              >
                {/* inline-block so the number badge anchors to the icon, not
                    to the full column width. */}
                <div className="relative inline-block shrink-0 lg:mb-5">
                  <span className="glass-card relative grid h-14 w-14 place-items-center rounded-2xl text-ink shadow-[0_1px_1px_rgba(255,255,255,0.8)_inset,0_10px_24px_-14px_rgba(16,17,15,0.45)]">
                    {step.icon}
                  </span>
                  <span className="glass-micro absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold">
                    {index + 1}
                  </span>
                </div>

                <div className="min-w-0 pb-2 lg:pb-0">
                  <h3 className="text-[17px] font-semibold tracking-[-0.025em]">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[30ch] text-[14px] leading-relaxed text-ink-2 lg:mx-auto">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </PageContainer>
    </section>
  );
}

/* Minimal original glyphs — drawn here rather than pulled from an icon set so
   they share the brand's rounded monoline language. */

function WalletGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="6"
        width="18"
        height="13"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3 10h18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="14.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function StackGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="10"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M17 7.5a3 3 0 0 1 3 3v6a3.5 3.5 0 0 1-3.5 3.5H10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CapsuleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <rect
        x="6"
        y="2.5"
        width="12"
        height="19"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M6 12h12" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="16.4" r="2.2" fill="#9bcc00" />
    </svg>
  );
}

function BagGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 8V6.5a3 3 0 1 1 6 0V8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
