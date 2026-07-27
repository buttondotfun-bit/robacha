import { LightField } from "@/components/shared/AmbientBackground";
import { PageContainer, Pill, SectionHeader } from "@/components/shared/primitives";

/**
 * What changes in pool v2, stated as a plan rather than a promise.
 *
 * Pool v1 is locked on chain: its price, odds and reward amounts can never be
 * edited. Every improvement below therefore requires a *new pool version*, which
 * does not exist yet. Nothing here is read from chain, because there is nothing
 * to read — so nothing here is presented as live, and no date is given.
 *
 * The `from` values are v1's on-chain configuration, which is immutable and so
 * safe to state. The `to` values are targets: the surcharge tracks the live
 * Chainlink fee and the reward sizing tracks live token prices, both of which
 * are only fixed at the moment the pool is created. They are labelled as such
 * here and in the footnote, and must not be presented as committed figures.
 */
const CHANGES = [
  {
    title: "Grab 5 at once",
    body: "Today you can only pull 2 at a time. Soon you can pull 5 — enough to fill a whole round on your own.",
    from: "2 a go",
    to: "5 a go",
    icon: <StackGlyph />,
  },
  {
    title: "Barely any waiting",
    body: "A round pops the moment it's full. Smaller rounds fill faster, so you find out what you got in minutes.",
    from: "25 to fill",
    to: "5 to fill",
    icon: <RoundGlyph />,
  },
  {
    title: "Cheaper to play",
    body: "There's a small fee on top that pays for the random draw. It's coming down.",
    from: "0.0007 ETH",
    to: "≈0.00059 ETH",
    toIsTarget: true,
    icon: <LinkGlyph />,
  },
  {
    title: "Way more in the capsule",
    body: "Most of what you pay goes straight back into the prize stash — so there's a lot more waiting inside.",
    to: "75% into prizes",
    toIsTarget: true,
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
          eyebrow="Coming next"
          title="v2 is coming. It's a big one."
          description="Five pulls at a time. Rounds that finish fast. And a whole lot more packed into every capsule."
          className="mb-4"
          action={<Pill tone="neutral">Not live yet</Pill>}
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

              <div className="mt-5 flex items-center gap-2 border-t border-[rgba(20,24,18,0.07)] pt-4">
                {change.from ? (
                  <>
                    <span className="num text-[12.5px] text-ink-3 line-through decoration-ink-3/40">
                      {change.from}
                    </span>
                    <ArrowGlyph />
                  </>
                ) : null}
                <span className="num text-[13px] font-semibold text-accent-ink">
                  {change.to}
                </span>
                {change.toIsTarget ? (
                  <span
                    className="text-[11px] text-ink-3"
                    title="Finalised when the pool is created"
                  >
                    target
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-[86ch] text-[12.5px] leading-relaxed text-ink-3">
          None of this is live yet and we&rsquo;re not putting a date on it —
          it ships when it&rsquo;s ready. Anything marked{" "}
          <span className="text-ink-2">target</span>{" "}
          isn&rsquo;t final; those
          numbers get set from real prices on the day v2 launches, so they will
          move. The pool running today keeps running exactly as it is until
          then. And every spin is chance — you might pull something small, you
          might pull something big. You&rsquo;ll always see the odds and the
          full price before you approve anything, and token rewards go up and
          down in value.
        </p>
      </PageContainer>
    </section>
  );
}

/* Monoline glyphs drawn here rather than pulled from an icon set, so they share
   the rounded language used by the other landing sections. Each carries one
   accent-green detail that names the thing the card is about: the fifth
   capsule, the filled arc, the VRF spark, the reward inside the shell. */

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

/** Two chain links with a spark — the Chainlink cost the surcharge pays. */
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

function ArrowGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0 text-ink-3"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8h9m0 0-3.2-3.2M12 8l-3.2 3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
