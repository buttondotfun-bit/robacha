"use client";

import { TokenAvatar } from "@/components/brand/TokenAvatar";
import { chainConfig } from "@/lib/config";
import { NFT_MINT_PRICE_USD, NFT_PAYMENT_TOKENS } from "@/data/nft";
import { useEthPrice } from "@/lib/use-money";
import { useTokenMarket } from "@/lib/use-token-market";

/**
 * The mint price, and what it costs in each accepted token.
 *
 * Dollars lead because that is the number the price was set in — $50 is the
 * decision; every token figure is whatever that converts to on the day.
 * Leading with a token amount would imply that amount is fixed, and then every
 * move in the market would make the page look wrong.
 *
 * The rate is live, so this says "at today's rate" rather than presenting a
 * conversion as a commitment. When a feed is unreachable that token still shows
 * as accepted but without an amount, instead of falling back to a remembered
 * or guessed number — the same rule the currency toggle follows everywhere else
 * on the site.
 */

/** Enough precision to be useful without implying the amount is fixed. */
function amount(value: number): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toFixed(4);
}
export function MintPrice() {
  const ethUsd = useEthPrice();
  const market = useTokenMarket(
    NFT_PAYMENT_TOKENS.map((t) => t.address).filter((a): a is `0x${string}` => a !== null),
  );

  const priced = NFT_PAYMENT_TOKENS.map((token) => {
    if (token.address === null) {
      return { ...token, qty: ethUsd ? NFT_MINT_PRICE_USD / ethUsd : null, logoUrl: null };
    }
    const meta = market.get(token.address);
    // An unreliable price is treated exactly as no price.
    const usd = meta?.price != null && meta.priceReliable ? meta.price : null;
    return {
      ...token,
      qty: usd ? NFT_MINT_PRICE_USD / usd : null,
      logoUrl: meta?.logoUrl ?? null,
    };
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro">Mint price</p>
          <p className="num mt-1 text-[32px] font-semibold leading-none tracking-[-0.03em]">
            ${NFT_MINT_PRICE_USD}
          </p>
        </div>
        <p className="text-[11.5px] leading-snug text-ink-3">
          Per capsule
          <span className="block">On {chainConfig.name}</span>
        </p>
      </div>

      <div className="mt-4">
        <p className="micro mb-2">Pay with any of these</p>
        <ul className="grid grid-cols-2 gap-2">
          {priced.map((token) => (
            <li
              key={token.symbol}
              className="flex items-center gap-2 rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.04)] px-2.5 py-2"
            >
              <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-[rgb(var(--edge-rgb)_/_0.7)] [container-type:inline-size]">
                <TokenAvatar
                  address={token.address ?? "0x0000000000000000000000000000000000000000"}
                  symbol={token.symbol}
                  logoUrl={token.logoUrl}
                  size={24}
                  rounded="none"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="num block truncate text-[12px] font-medium text-ink">
                  {token.qty !== null ? amount(token.qty) : "—"}
                </span>
                <span className="num block truncate text-[10.5px] text-ink-3">
                  ${token.symbol}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
          Amounts convert at today&rsquo;s rate and move with the market. The
          price is ${NFT_MINT_PRICE_USD}; the exact token amount is fixed when
          you mint.
        </p>
      </div>
    </div>
  );
}
