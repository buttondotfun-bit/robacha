import { LightField } from "@/components/shared/AmbientBackground";
import { PageContainer, Pill, SectionHeader } from "@/components/shared/primitives";

/**
 * What the machine does today, and the one thing still ahead of it.
 *
 * No version numbers here on purpose. The pool's on-chain version is shown
 * where it is a fact — the hero and the live pool card read it from the
 * registry — but a newcomer meeting "v2" in marketing copy only wonders what
 * they missed. So this describes current behaviour rather than a changelog,
 * and there is no before-and-after to imply an earlier release.
 *
 * Every figure below is fixed in the contract for the running pool, which is
 * why it can be written here rather than read at runtime. Deliberately absent:
 * a payout percentage — it moves with the price of every reward token, so any
 * number written into the page is wrong within the hour. The reward reserve
 * share is stated instead, because that one cannot change on a live pool.
 */
const CHANGES = [
  {
    title: "Grab 5 at once",
    body: "Up to five spins in a single transaction — enough to fill a whole round yourself and get your results straight away.",
    stat: "5 a go",
    icon: <StackGlyph />,
  },
  {
    title: "Rounds finish fast",
    body: "A round holds five spins and closes the moment it fills, or after two minutes if it doesn't. No waiting around for strangers.",
    stat: "5 to fill",
    icon: <RoundGlyph />,
  },
  {
    title: "A tiny draw fee",
    body: "A small fee rides along with each spin to cover the random draw. That's the whole cost of making it fair — we keep none of it.",
    stat: "0.0001 ETH",
    icon: <LinkGlyph />,
  },
  {
    title: "Most of it goes to prizes",
    body: "85% of every spin price is reserved for buying what goes in the machine. That split is fixed in the contract and can't be edited once a pool is live.",
    stat: "85% into prizes",
    icon: <CapsuleGlyph />,
  },
];

export function NextRelease() {
  return (
    <section id="next" className="relative scroll-mt-28 py-16 sm:py-20">
      <LightField
        tone="green"
        size={640}
        className="right-0 top-16 opacity-50"
      />

      <PageContainer width="wide" className="relative">
        <SectionHeader
          eyebrow="How it plays"
          title="Five pulls at a time. Results in minutes."
          description="Most of what you spend goes straight back into the machine as prizes. Here's the whole shape of it."
          className="mb-4"
          action={
            <Pill tone="accent" dot>
              Live now
            </Pill>
          }
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHANGES.map((change) => (
            <li
              key={change.title}
              className="glass-card flex flex-col rounded-[18px] p-5"
            >
              {/* glass-micro is the dark chip and supplies its own white
                  foreground — do not override the colour here or the glyph
                  drops to unreadable contrast against it. */}
              <span className="glass-micro mb-4 grid h-11 w-11 place-items-center rounded-[14px]">
                {change.icon}
              </span>

              <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.02em]">
                {change.title}
              </h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-2">
                {change.body}
              </p>

              <div className="mt-5 border-t border-[rgba(20,24,18,0.07)] pt-4">
                <span className="num text-[13px] font-semibold text-accent-ink">
                  {change.stat}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* The only forward-looking claim on the page. Robinhood Chain does
            host tokenised equities, so this is grounded — but which ones we
            could stock, and where, is not settled, and the copy must not imply
            it is. */}
        <div className="mt-6 overflow-hidden rounded-[20px] border border-[#e2f5a8] bg-accent-soft px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex h-6 items-center rounded-full bg-white/70 px-2.5 text-[11px] font-medium text-accent-ink">
              Up next
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-accent-ink/70">
              Exploring
            </span>
          </div>

          <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.03em] text-ink sm:text-[22px]">
            Tokenised stocks in the machine.
          </h3>
          <p className="mt-2.5 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-2">
            Robinhood Chain was built around tokenised stocks, so that&rsquo;s
            where we want to take the machine next — pull a slice of a real
            company instead of a memecoin.
          </p>
          <p className="mt-2.5 max-w-[62ch] text-[12px] leading-relaxed text-accent-ink/80">
            We&rsquo;re exploring this, not announcing it. There&rsquo;s no date.
            Tokenised stocks are regulated differently to memecoins, so which
            ones we can put in a pool — and who can spin for them — depends on
            rules we don&rsquo;t set. We&rsquo;ll only ship it where it&rsquo;s
            allowed, and we&rsquo;ll say plainly what changed when we do.
          </p>
        </div>

        <p className="mt-6 max-w-[86ch] text-[12.5px] leading-relaxed text-ink-3">
          Every spin is chance — you might pull something small, you might pull
          something big. You&rsquo;ll always see the odds and the full price
          before you approve anything, and token rewards go up and down in
          value.
        </p>

      </PageContainer>
    </section>
  );
}

/* Monoline glyphs drawn here rather than pulled from an icon set, so they share
   the rounded language used by the other landing sections. Each carries one
   accent-green detail that names the thing the card is about: the fifth
   capsule, the filled arc, the draw fee, the reward inside the shell. */

const GLYPH = "h-[22px] w-[22px]";
const ACCENT = "#a8e000";

/** Three capsules, the last one accented — "more than one per transaction". */
function StackGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={GLYPH} fill="none" aria-hidden="true">
      <rect x="2.6" y="6" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.6" y="6" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="16.6" y="6" width="4.8" height="12" rx="2.4" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="19" cy="12" r="1.15" fill={ACCENT} />
    </svg>
  );
}

/** A ring filling toward completion — a round reaching its entry count. */
function RoundGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={GLYPH} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.5" opacity="0.34" />
      {/* Arc from 12 o'clock clockwise through 260°, ending at (3.73, 13.46).
          The remaining 100° gap is what makes this read as a round part-way
          filled rather than as a plain ring. */}
      <path
        d="M12 3.6A8.4 8.4 0 1 1 3.73 13.46"
        stroke={ACCENT}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
    </svg>
  );
}

/** Two links with a spark — the draw fee that rides along with a spin. */
function LinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={GLYPH} fill="none" aria-hidden="true">
      <path
        d="M9.6 13.4a3.4 3.4 0 0 0 4.8 0l2.4-2.4a3.4 3.4 0 0 0-4.8-4.8l-1.2 1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13.4 9.6a3.4 3.4 0 0 0-4.8 0l-2.4 2.4a3.4 3.4 0 0 0 4.8 4.8l1.2-1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M18.6 16.2v4M16.6 18.2h4"
        stroke={ACCENT}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The brand capsule, split, with the reward showing in the lower half. */
function CapsuleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={GLYPH} fill="none" aria-hidden="true">
      <rect x="6" y="2.6" width="12" height="18.8" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 12h12" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="16.4" r="2.4" fill={ACCENT} />
    </svg>
  );
}

