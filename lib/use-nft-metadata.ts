"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { ERC721_MIN_ABI } from "./use-raffle-hub";
import { chainConfig } from "./config";

/**
 * A token's own metadata, read from its `tokenURI` on chain and resolved.
 *
 * The image is taken from the collection's metadata rather than anything the
 * lister typed, so a raffle can't advertise a picture the token doesn't have.
 * Everything here is best-effort: a token with no resolvable image simply
 * returns `image: null`, and the UI shows a neutral placeholder instead of a
 * broken or borrowed one.
 */

export interface NftMetadata {
  image: string | null;
  name: string | null;
  collectionName: string | null;
  isLoading: boolean;
}

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

function resolveUri(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return IPFS_GATEWAY + uri.slice("ipfs://".length).replace(/^ipfs\//, "");
  }
  return uri;
}

export function useNftMetadata(nft: Address | null, tokenId: bigint | null): NftMetadata {
  const publicClient = usePublicClient({ chainId: chainConfig.id });
  const [meta, setMeta] = useState<NftMetadata>({ image: null, name: null, collectionName: null, isLoading: false });

  useEffect(() => {
    if (!nft || tokenId === null || !publicClient) {
      setMeta({ image: null, name: null, collectionName: null, isLoading: false });
      return;
    }

    let cancelled = false;
    setMeta((m) => ({ ...m, isLoading: true }));

    (async () => {
      let collectionName: string | null = null;
      let image: string | null = null;
      let name: string | null = null;

      try {
        collectionName = (await publicClient.readContract({
          address: nft, abi: ERC721_MIN_ABI, functionName: "name", args: [],
        })) as string;
      } catch {
        // A collection without name() is fine; it just stays null.
      }

      try {
        const uri = (await publicClient.readContract({
          address: nft, abi: ERC721_MIN_ABI, functionName: "tokenURI", args: [tokenId],
        })) as string;

        let json: Record<string, unknown> | null = null;
        if (uri.startsWith("data:application/json")) {
          const comma = uri.indexOf(",");
          const payload = uri.slice(comma + 1);
          const decoded = uri.includes(";base64,") ? atob(payload) : decodeURIComponent(payload);
          json = JSON.parse(decoded);
        } else {
          const res = await fetch(resolveUri(uri));
          json = await res.json();
        }

        if (json) {
          if (typeof json.image === "string") image = resolveUri(json.image);
          else if (typeof json.image_url === "string") image = resolveUri(json.image_url as string);
          if (typeof json.name === "string") name = json.name as string;
        }
      } catch {
        // Unresolvable metadata → no image; the card falls back to a placeholder.
      }

      if (!cancelled) setMeta({ image, name, collectionName, isLoading: false });
    })();

    return () => { cancelled = true; };
  }, [nft, tokenId, publicClient]);

  return meta;
}
