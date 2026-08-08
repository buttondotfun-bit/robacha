"use client";

import { ImageIcon } from "lucide-react";
import type { Address } from "viem";
import { useNftMetadata } from "@/lib/use-nft-metadata";
import { cn } from "@/lib/utils";

/**
 * A token's picture, pulled from its own on-chain metadata.
 *
 * next/image is deliberately not used here: the source is an arbitrary,
 * user-listed collection's metadata (often IPFS), which the image optimizer
 * can't be allow-listed for. A plain <img> that falls back to a neutral
 * placeholder when the metadata has no resolvable image keeps the card honest —
 * it shows the real token art or nothing pretending to be it.
 */
export function NftThumb({
  nft,
  tokenId,
  className,
  rounded = "rounded-[16px]",
}: {
  nft: Address;
  tokenId: bigint;
  className?: string;
  rounded?: string;
}) {
  const { image, isLoading } = useNftMetadata(nft, tokenId);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[rgb(var(--ink-rgb)_/_0.05)]",
        rounded,
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-ink-3">
          {!isLoading ? <ImageIcon className="h-8 w-8 opacity-40" aria-hidden="true" /> : null}
        </div>
      )}
    </div>
  );
}
