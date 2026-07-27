/** Compact token amounts: 18500 -> "18,500", 1240000 -> "1.24M" */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000)
    return `${trimZeros((value / 1_000_000).toFixed(2))}M`;
  return Math.round(value).toLocaleString("en-US");
}

/** Grid-friendly compact form used inside chips and stat tiles. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trimZeros((value / 1_000_000).toFixed(2))}M`;
  if (abs >= 1_000) return `${trimZeros((value / 1_000).toFixed(1))}K`;
  return String(Math.round(value));
}

export function formatUsd(value: number, opts?: { compact?: boolean }): string {
  if (!Number.isFinite(value)) return "—";
  if (opts?.compact) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `$${trimZeros((value / 1_000_000).toFixed(2))}M`;
    if (abs >= 1_000) return `$${trimZeros((value / 1_000).toFixed(1))}K`;
  }
  if (Math.abs(value) < 1)
    return `$${value.toFixed(value < 0.01 ? 4 : 3)}`;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Odds always render with two decimals so columns stay aligned. */
export function formatOdds(percent: number): string {
  if (!Number.isFinite(percent)) return "—";
  if (percent > 0 && percent < 0.01) return "<0.01%";
  return `${percent.toFixed(2)}%`;
}

export function formatPercent(percent: number, digits = 1): string {
  return `${percent.toFixed(digits)}%`;
}

export function formatRange(min: number, max: number): string {
  if (min === max) return formatAmount(min);
  return `${formatCompact(min)} – ${formatCompact(max)}`;
}

export function shortAddress(address: string, size = 4): string {
  if (!address) return "—";
  if (address.length <= size * 2 + 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function shortHash(hash: string): string {
  if (!hash) return "—";
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/** "1m ago" / "3h ago" / "2d ago" from a whole-minute age. */
export function formatAge(minutesAgo: number): string {
  const m = Math.max(0, Math.round(minutesAgo));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Countdown copy for the pool refresh: "1h 24m" */
export function formatCountdown(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem}m`;
  return `${h}h ${rem}m`;
}

/** Absolute date for reward rows — fixed locale so SSR and client agree. */
export function formatDate(epochMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(epochMs));
}

function trimZeros(value: string): string {
  return value.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}
