"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Rarity } from "@/types/token";

/**
 * Reveal audio, synthesised rather than sampled.
 *
 * A gacha is half sound — the crank, the rattle, the crack — and this had none.
 * Every cue below is generated with the Web Audio API instead of shipping mp3s,
 * for three reasons: no asset weight on a page that already loads token art, no
 * licensing question over sounds we did not make, and cues that scale with
 * rarity by changing numbers rather than by needing a new file per tier.
 *
 * Off by default and stored per browser. Sound that plays uninvited on a page
 * about money is hostile, and browsers block it anyway until the user has
 * interacted. Nothing here autoplays: every cue is downstream of a click or of
 * a settlement the user paid for.
 *
 * `prefers-reduced-motion` is respected too. People who set it are frequently
 * asking for less sensory load in general, and the reveal's audio is part of
 * the same flourish as its animation.
 */

const KEY = "robacha.sound";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

/** Silent on the server, and on the first client render, so the two agree. */
function serverSnapshot(): boolean {
  return false;
}

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    // Browsers suspend the context until a gesture; resuming is a no-op when
    // it is already running.
    void context.resume().catch(() => {});
    return context;
  } catch {
    return null;
  }
}

interface Tone {
  freq: number;
  /** Seconds from now. */
  at: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  /** Slide to this frequency across the note. */
  glideTo?: number;
}

function play(tones: Tone[]) {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;

  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = tone.type ?? "triangle";
    osc.frequency.setValueAtTime(tone.freq, now + tone.at);
    if (tone.glideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(tone.glideTo, 1),
        now + tone.at + tone.duration,
      );
    }

    // Short attack, exponential decay. A raw gate would click.
    const peak = tone.gain ?? 0.08;
    amp.gain.setValueAtTime(0.0001, now + tone.at);
    amp.gain.exponentialRampToValueAtTime(peak, now + tone.at + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + tone.at + tone.duration);

    osc.connect(amp).connect(ctx.destination);
    osc.start(now + tone.at);
    osc.stop(now + tone.at + tone.duration + 0.02);
  }
}

/** Rarity decides how much of a fanfare the reveal gets. */
const REVEAL: Record<string, Tone[]> = {
  common: [{ freq: 523.25, at: 0, duration: 0.14, gain: 0.05 }],
  uncommon: [
    { freq: 523.25, at: 0, duration: 0.12, gain: 0.05 },
    { freq: 659.25, at: 0.08, duration: 0.16, gain: 0.05 },
  ],
  rare: [
    { freq: 587.33, at: 0, duration: 0.12 },
    { freq: 739.99, at: 0.09, duration: 0.12 },
    { freq: 880.0, at: 0.18, duration: 0.22 },
  ],
  epic: [
    { freq: 659.25, at: 0, duration: 0.12 },
    { freq: 830.61, at: 0.09, duration: 0.12 },
    { freq: 987.77, at: 0.18, duration: 0.14 },
    { freq: 1318.51, at: 0.28, duration: 0.3, gain: 0.1 },
  ],
  legendary: [
    { freq: 523.25, at: 0, duration: 0.12 },
    { freq: 659.25, at: 0.08, duration: 0.12 },
    { freq: 783.99, at: 0.16, duration: 0.12 },
    { freq: 1046.5, at: 0.24, duration: 0.16 },
    { freq: 1318.51, at: 0.36, duration: 0.45, gain: 0.12 },
    { freq: 1567.98, at: 0.36, duration: 0.45, gain: 0.06, type: "sine" },
  ],
};

export function useSound() {
  const enabled = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const setEnabled = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      /* private mode; the preference just will not persist */
    }
    listeners.forEach((listener) => listener());
    // Unlock the context on the same gesture that switched it on, so the very
    // next cue is audible rather than silently suspended.
    if (next) audio();
  }, []);

  const quiet = useCallback(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /** The crank: a short descending rattle as the capsule is released. */
  const crank = useCallback(() => {
    if (!enabled || quiet()) return;
    play([
      { freq: 220, at: 0, duration: 0.07, type: "square", gain: 0.04 },
      { freq: 196, at: 0.07, duration: 0.07, type: "square", gain: 0.04 },
      { freq: 174.61, at: 0.14, duration: 0.09, type: "square", gain: 0.04 },
    ]);
  }, [enabled, quiet]);

  /** The crack: capsule opening, just before the prize is named. */
  const crack = useCallback(() => {
    if (!enabled || quiet()) return;
    play([
      { freq: 900, at: 0, duration: 0.06, type: "square", gain: 0.05, glideTo: 300 },
    ]);
  }, [enabled, quiet]);

  const reveal = useCallback(
    (rarity: Rarity | null) => {
      if (!enabled || quiet()) return;
      play(REVEAL[rarity ?? "common"] ?? REVEAL.common);
    },
    [enabled, quiet],
  );

  return { enabled, setEnabled, crank, crack, reveal };
}
