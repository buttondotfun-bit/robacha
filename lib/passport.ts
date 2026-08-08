import type { WalletHistory } from "@/app/api/wallet/[address]/history/route";

/**
 * The Robacha passport — achievements derived, never awarded.
 *
 * Every badge is a pure function of what a wallet has actually done on chain
 * (its WalletHistory), so there is nothing to grant, store or fake: the same
 * inputs always produce the same badges, and a wallet that has done nothing
 * honestly earns nothing. Thresholds are deliberately built only on unambiguous
 * signals — spins, rewards received, distinct projects discovered, rounds,
 * claims — and never on tier names, which depend on pool config we shouldn't
 * assert here.
 */

export interface Achievement {
  key: string;
  title: string;
  desc: string;
  earned: boolean;
  /** Progress toward the badge, 0..1, for the locked state. */
  progress: number;
  /** e.g. "12 / 25" — the honest current-vs-target readout. */
  readout: string;
}

interface Tier {
  key: string;
  title: string;
  desc: string;
  target: number;
  value: (h: WalletHistory) => number;
}

const TIERS: Tier[] = [
  { key: "first-spin", title: "First spin", desc: "Put your first entry into the machine.", target: 1, value: (h) => h.spins },
  { key: "warmed-up", title: "Warmed up", desc: "Ten spins in.", target: 10, value: (h) => h.spins },
  { key: "regular", title: "Regular", desc: "Fifty spins through the machine.", target: 50, value: (h) => h.spins },
  { key: "machinist", title: "Machinist", desc: "A hundred spins deep.", target: 100, value: (h) => h.spins },

  { key: "first-reward", title: "First pull", desc: "Landed your first reward.", target: 1, value: (h) => h.rewardCount },
  { key: "stacking", title: "Stacking", desc: "Ten rewards pulled.", target: 10, value: (h) => h.rewardCount },

  { key: "discoverer", title: "Discoverer", desc: "Pulled three different projects.", target: 3, value: (h) => h.rewards.length },
  { key: "curator", title: "Curator", desc: "Discovered five different projects.", target: 5, value: (h) => h.rewards.length },
  { key: "cartographer", title: "Cartographer", desc: "Ten distinct projects discovered.", target: 10, value: (h) => h.rewards.length },

  { key: "rounds-10", title: "In the rounds", desc: "Entered ten rounds.", target: 10, value: (h) => h.rounds },
];

/** Distinct rewards fully claimed — a special (non-threshold) badge. */
function claimedSweep(h: WalletHistory): Achievement {
  const earned = h.rewardCount > 0 && h.unclaimedCount === 0;
  return {
    key: "swept",
    title: "Swept up",
    desc: "Claimed every reward you've been assigned.",
    earned,
    progress: h.rewardCount === 0 ? 0 : (h.rewardCount - h.unclaimedCount) / h.rewardCount,
    readout: h.rewardCount === 0 ? "0 rewards yet" : `${h.rewardCount - h.unclaimedCount} / ${h.rewardCount} claimed`,
  };
}

export function deriveAchievements(h: WalletHistory): Achievement[] {
  const threshold = TIERS.map((t) => {
    const v = t.value(h);
    return {
      key: t.key,
      title: t.title,
      desc: t.desc,
      earned: v >= t.target,
      progress: Math.max(0, Math.min(1, v / t.target)),
      readout: `${Math.min(v, t.target)} / ${t.target}`,
    };
  });
  return [...threshold, claimedSweep(h)];
}

export function achievementSummary(list: Achievement[]): { earned: number; total: number } {
  return { earned: list.filter((a) => a.earned).length, total: list.length };
}
