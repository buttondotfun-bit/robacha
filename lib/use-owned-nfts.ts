"use client";

import { useCallback, useEffect, useState } from "react";
import { isAddress, type Address } from "viem";
import { chainConfig } from "./config";

/**
 * The ERC-721s a wallet actually holds on Robinhood Chain, read from the
 * chain's own Blockscout indexer. This is real ownership data — the same the
 * explorer shows — so the raffle builder can offer a visual "pick your NFT"
 * instead of asking creators to paste a contract and token id.
 *
 * Everything degrades honestly: a wallet with no NFTs returns an empty list, a
 * failed request returns an error the UI can fall back on (manual entry), and a
 * token whose metadata has no image just carries a null image for a placeholder.
 */

export interface OwnedNft {
  contract: Address;
  tokenId: string;
  name: string | null;
  collectionName: string | null;
  symbol: string | null;
  image: string | null;
}

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

function resolveImage(item: Record<string, unknown>): string | null {
  const direct = item.image_url as string | undefined;
  if (direct) return direct;
  const media = item.media_url as string | undefined;
  if (media?.startsWith("ipfs://")) return IPFS_GATEWAY + media.slice("ipfs://".length).replace(/^ipfs\//, "");
  if (media) return media;
  const meta = item.metadata as Record<string, unknown> | undefined;
  const metaImg = meta?.image as string | undefined;
  if (metaImg?.startsWith("ipfs://")) return IPFS_GATEWAY + metaImg.slice("ipfs://".length).replace(/^ipfs\//, "");
  return metaImg ?? null;
}

function mapItem(item: Record<string, unknown>): OwnedNft | null {
  const token = item.token as Record<string, unknown> | undefined;
  const contract = token?.address_hash as string | undefined;
  const tokenId = item.id as string | undefined;
  if (!contract || !isAddress(contract) || tokenId === undefined) return null;
  const meta = item.metadata as Record<string, unknown> | undefined;
  return {
    contract: contract as Address,
    tokenId: String(tokenId),
    name: (meta?.name as string | undefined) ?? null,
    collectionName: (token?.name as string | undefined) ?? null,
    symbol: (token?.symbol as string | undefined) ?? null,
    image: resolveImage(item),
  };
}

export function useOwnedNfts(address: string | null | undefined) {
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!address || !isAddress(address)) {
      setNfts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const url = `${chainConfig.explorerUrl}/api/v2/addresses/${address}/nft?type=ERC-721`;
    fetch(url, { headers: { accept: "application/json" } })
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((data: { items?: Record<string, unknown>[] }) => {
        if (cancelled) return;
        const list = (data.items ?? []).map(mapItem).filter((n): n is OwnedNft => n !== null);
        setNfts(list);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNfts([]);
        setError("Couldn't load NFTs for this wallet. You can enter one manually.");
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, nonce]);

  return { nfts, isLoading, error, refetch };
}
