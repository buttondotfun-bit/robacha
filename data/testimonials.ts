/**
 * Things real people have said about Robacha in public.
 *
 * Every entry is transcribed verbatim from a post that exists, with a link to
 * it so anyone can check. Nothing here is written by us, paraphrased, trimmed
 * to change its meaning, or attributed to a person who did not say it — a
 * fabricated endorsement would undermine the one thing this whole product is
 * built on, which is that everything on the site can be verified.
 *
 * Because these are snapshots rather than live embeds, they can go stale: if
 * the author deletes or edits their post, this copy keeps rendering. That is
 * the trade for not loading a third-party tracking script on the landing page.
 * The rule that follows is that anything listed here must be re-checked before
 * it is relied on, and removed promptly if the original goes away.
 *
 * The avatar is stored locally for the same reason — no request to a
 * third-party CDN on page load.
 */
export interface Testimonial {
  /** Display name exactly as shown on the source platform. */
  name: string;
  handle: string;
  avatar: string;
  /** Verbatim. Never edited for tone or length. */
  quote: string;
  url: string;
  /** ISO date of the original post. */
  postedAt: string;
  /** True only where the platform itself shows a verification badge. */
  verified: boolean;
  /** What the post was replying to or quoting, when that is the context. */
  context?: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "VonDoom",
    handle: "@CryptoVonDoom",
    avatar: "/testimonials/cryptovondoom.jpg",
    quote:
      "It’s good to see fun stuff being built again.\n\nThese guys snuck into my dm’s - smart concept, some solid relationships and actually might be actually addictive AF.",
    url: "https://x.com/CryptoVonDoom/status/2082576730519404582",
    postedAt: "2026-07-29",
    verified: true,
    context: "Quoting our launch post",
  },
];
