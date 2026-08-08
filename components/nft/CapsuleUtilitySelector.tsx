"use client";

import { useState } from "react";
import { ArrowUpRight, Repeat, Sparkles, Wallet } from "lucide-react";
import { NFT_TIERS, type NftTier } from "@/data/nft";
import { CapsuleGlyph } from "./CapsuleGlyph";
import { cn } from "@/lib/utils";

/**
 * "What can my capsule do?" — pick a tier, see the real utility.
 *
 * The abilities are derived from the collection's own config: every capsule can
 * be kept and traded, and the two tiers marked spendable can additionally be
 * committed to the machine. Nothing here is asserted beyond what data/nft.ts
 * defines, and the machine-spend line is only shown for the tiers that carry it.
 */
export function CapsuleUtilitySelector() {
  const [key, setKey] = useState<NftTier["key"]>("common");
  const tier = NFT_TIERS.find((t) => t.key === key) ?? NFT_TIERS[0];

  const abilities = [
    { icon: <Wallet className="h-4 w-4" aria-hidden="true" />, title: "Keep", body: "Hold it in your own wallet. We can't move it or take it back." },
    { icon: <Repeat className="h-4 w-4" aria-hidden="true" />, title: "Trade", body: "Buy, sell or gift it like any NFT on Robinhood Chain." },
    ...(tier.spendable
      ? [{
          icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
          title: "Spend in the machine",
          body:
            tier.key === "grail"
              ? "Commit it for a pull against the deepest pool the machine can hold. The capsule is spent — the pull is what you keep."
              : "Commit it for a pull from a deeper pool than a standard spin reaches. The capsule is spent for the pull.",
        }]
      : []),
  ];

  return (
    <div className="glass-panel rounded-[24px] p-5 sm:p-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a tier">
        {NFT_TIERS.map((t) => {
          const active = t.key === key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              data-rarity={t.key}
              onClick={() => setKey(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                active ? "text-[color:var(--rarity-fg)]" : "glass-chip text-ink-2 hover:text-ink",
              )}
              style={active ? { background: "var(--rarity-bg)", border: "1px solid var(--rarity-bd)" } : undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? "var(--rarity-dot)" : "currentColor" }} aria-hidden="true" />
              {t.name}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,160px)_1fr] sm:items-center">
        <div className="grid place-items-center rounded-[18px] bg-[rgb(var(--ink-rgb)_/_0.03)] py-6" data-rarity={tier.key}>
          <CapsuleGlyph id={`util-${tier.key}`} className="h-20 w-20 drop-shadow-[0_8px_18px_rgb(var(--rarity-glow)_/_0.4)]" />
        </div>
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.01em]">
            You minted a <span data-rarity={tier.key} className="text-[color:var(--rarity-fg)]">{tier.name}</span>.
          </p>
          <p className="mt-0.5 num text-[12px] text-ink-3">{tier.supply} of the collection · {tier.spendable ? "machine-eligible" : "collectible"}</p>
          <ul className="mt-3 space-y-2">
            {abilities.map((a) => (
              <li key={a.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(204,255,0,0.14)] text-accent-ink">{a.icon}</span>
                <div>
                  <p className="text-[13px] font-semibold">{a.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{a.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {tier.spendable ? (
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-3">
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          Spend odds and prize ranges are published on chain before minting opens.
        </p>
      ) : null}
    </div>
  );
}
