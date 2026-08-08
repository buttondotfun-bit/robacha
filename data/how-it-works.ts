/**
 * The full factual explainer for the How It Works page, preserved verbatim from
 * the original explainer. Kept in a plain (non-client) module so it can be
 * imported by both the server page (for FAQPage JSON-LD) and the client
 * walkthrough (for the deep-dive accordion) — the same words in both, so the
 * structured data can never drift from what's on screen.
 *
 * Every answer describes what the deployed contracts actually do. No mechanic
 * here is invented.
 */
export const DEEP_DIVE: { q: string; a: string }[] = [
  { q: "How exactly does a spin resolve?", a: "A spin picks a rarity tier using the odds shown on screen, then picks one prize in that tier, then picks how much you receive inside that prize's published range. Every spin stands on its own — past results never change your chances." },
  { q: "How do reward pools work?", a: "A pool is the set of tokens loaded in a machine, each with a tier, a probability and a reward range. The full inventory is readable before you spend anything. Once a pool starts selling, its prizes and odds are frozen for that version, so what you agreed to is what runs." },
  { q: "How are odds published?", a: "Rarity labels — common, rare, legendary — are derived from each tier's probability, and the exact percentages come from the pool contract. They're shown before you pay, and they're the same numbers the draw uses; there is no second set behind them." },
  { q: "How does a round settle?", a: "Spins are grouped into rounds. A round opens, collects entries, closes, requests randomness, and settles — assigning each entry its reward. A spin resolves once its round settles, not in the spin transaction. Closing, requesting and settling are permissionless: a keeper normally does them, and anyone can push a stuck round along." },
  { q: "Where does randomness come from?", a: "Each round's outcome is drawn from randomness committed before the round settles, so the result can be checked on chain rather than trusted. You can recompute the number that decided any round from its published inputs on the verify page." },
  { q: "How are rewards claimed?", a: "When a round settles, your reward is assigned to your wallet and waits there to be claimed. Claiming transfers the token to you. Everything you pull lives in your bag, with claim status for each reward." },
  { q: "What happens to spin payments?", a: "You pay the spin price plus a small fee that covers running the random draw; your wallet adds its own network fee, shown before you sign. Payments route through the protocol's fee split rather than to any individual, and a share funds the reward reserve." },
  { q: "When does a refund happen?", a: "If a round can't pay a prize in full — for example a tier is underfunded — that entry is refunded rather than paid short, and if a round fails to settle in time its entries become refundable. Refunds are withdrawable by the people owed them; the contract holds the money, not us." },
  { q: "What does $ROB do?", a: "$ROB is Robacha's official utility token on Robinhood Chain. You can spend it to spin — your wallet swaps it for exactly the ETH a spin costs — and protocol fees buy it back and burn it. Verify the official contract on the $ROB page." },
];
