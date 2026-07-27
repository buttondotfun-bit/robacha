export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[];

/** Minimal class joiner — keeps the bundle free of a utility dependency. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value && value !== 0) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }
  return out.join(" ");
}

/**
 * Deterministic 32-bit PRNG (mulberry32). Every piece of seeded content
 * runs through this so server and client render byte-identical output.
 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Shortest signed distance between two indices on a ring of length `len`. */
export function ringDelta(from: number, to: number, len: number): number {
  const raw = ((to - from) % len + len) % len;
  return raw > len / 2 ? raw - len : raw;
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
