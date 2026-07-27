import type { Rarity } from "@/types/token";

/**
 * Reveal audio hook. Intentionally a no-op in the MVP — the cue points exist
 * so a short sound file can be wired in later without touching the reveal
 * component. Nothing autoplays today.
 */
export function playRevealCue(rarity: Rarity): void {
  if (typeof window === "undefined") return;
  if (rarity !== "legendary" && rarity !== "epic") return;
  // Placeholder: attach an <audio> element or Web Audio cue here once assets
  // land, and gate it behind a user-controlled sound preference.
}
