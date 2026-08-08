import { AlertTriangle, BadgeCheck, HelpCircle } from "lucide-react";
import { checkCollection } from "@/data/collections";
import { cn } from "@/lib/utils";

/**
 * The collection-trust badge.
 *
 * Reads the verified-collections registry (data/collections) and renders one of
 * three honest states, keyed on the contract address:
 *   - verified: the address is a known canonical collection.
 *   - unverified: not on the list — shown as a caution, never neutral, because
 *     an unverified prize is a buyer-beware prize.
 *   - impersonator: not verified, but its on-chain name copies a verified
 *     collection — the most dangerous case, flagged hardest.
 *
 * `compact` is for cards (a small pill); the full variant carries the one-line
 * explanation for the detail page.
 */
export function CollectionBadge({
  nft,
  onchainName,
  compact = false,
  className,
}: {
  nft: string;
  onchainName?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const check = checkCollection(nft, onchainName);

  const config = {
    verified: {
      icon: BadgeCheck,
      label: "Verified collection",
      short: "Verified",
      tone: "text-[#3f7d17] bg-[rgba(142,197,0,0.16)] border-[rgba(142,197,0,0.4)]",
      detail: check.collection?.name
        ? `${check.collection.name} — a known collection on this chain, verified by contract address.`
        : "A known collection on this chain, verified by contract address.",
    },
    unverified: {
      icon: HelpCircle,
      label: "Unverified collection",
      short: "Unverified",
      tone: "text-[#8a6410] bg-[rgba(240,190,60,0.18)] border-[rgba(240,190,60,0.4)]",
      detail:
        "Not on Robacha's verified list. Anyone can raffle any NFT — check the contract address yourself before buying tickets.",
    },
    impersonator: {
      icon: AlertTriangle,
      label: `Impersonates ${check.impersonates?.name ?? "a verified collection"}`,
      short: "Impersonation risk",
      tone: "text-[#c0447a] bg-[rgba(192,68,122,0.14)] border-[rgba(192,68,122,0.4)]",
      detail: `This collection's name matches ${check.impersonates?.name ?? "a verified collection"} but its contract address is different. It is not the real collection.`,
    },
    denylisted: {
      icon: AlertTriangle,
      label: "Flagged by Robacha",
      short: "Flagged",
      tone: "text-[#c0447a] bg-[rgba(192,68,122,0.14)] border-[rgba(192,68,122,0.4)]",
      detail: "Robacha has flagged this collection as fraudulent. It stays on the chain, but we strongly advise against buying tickets.",
    },
  }[check.trust];

  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
          config.tone,
          className,
        )}
        title={config.detail}
      >
        <Icon className="h-3 w-3" aria-hidden="true" /> {config.short}
      </span>
    );
  }

  return (
    <div className={cn("flex items-start gap-2.5 rounded-[14px] border p-3", config.tone, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-[12.5px] font-semibold">{config.label}</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed opacity-90">{config.detail}</p>
      </div>
    </div>
  );
}
