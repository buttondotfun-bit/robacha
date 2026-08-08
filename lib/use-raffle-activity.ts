"use client";

import { useEffect, useState } from "react";
import { parseAbiItem, type Address } from "viem";
import { usePublicClient } from "wagmi";
import { chainConfig, contracts } from "./config";
import { useRaffleConfig } from "./raffle-context";

/**
 * Recent ticket buys, read from the contract's own logs.
 *
 * Every row is a `TicketsBought` event — a real purchase, on chain, nothing
 * authored in the app. Polls rather than subscribes because the public RPC is
 * not guaranteed to hold a websocket, and a slow feed of real events beats a
 * fast feed of invented ones.
 */

export interface RaffleBuy {
  buyer: Address;
  quantity: number;
  ticketsSold: number;
  txHash: `0x${string}`;
  block: bigint;
}

const EVENT = parseAbiItem(
  "event TicketsBought(address indexed buyer, uint16 quantity, uint16 walletTotal, uint256 ticketsSold)",
);

/** A raffle is minutes-to-hours old, so a modest look-back covers its whole life. */
const LOOKBACK = 500_000n;
const POLL_MS = 12_000;

export function useRaffleActivity(
  limit = 8,
  addressOverride?: Address | null,
): { buys: RaffleBuy[]; isLoading: boolean } {
  const cfg = useRaffleConfig();
  const raffle = (addressOverride ?? cfg.address ?? contracts.raffle) ?? undefined;
  const publicClient = usePublicClient({ chainId: chainConfig.id });
  const [buys, setBuys] = useState<RaffleBuy[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!raffle || !publicClient) return;
    let alive = true;

    async function load() {
      try {
        const head = await publicClient!.getBlockNumber();
        const from = head > LOOKBACK ? head - LOOKBACK : 0n;
        const logs = await publicClient!.getLogs({
          address: raffle,
          event: EVENT,
          fromBlock: from,
          toBlock: "latest",
        });
        if (!alive) return;
        const rows = logs
          .slice(-limit)
          .reverse()
          .map((l) => ({
            buyer: l.args.buyer as Address,
            quantity: Number(l.args.quantity ?? 0),
            ticketsSold: Number(l.args.ticketsSold ?? 0),
            txHash: l.transactionHash,
            block: l.blockNumber,
          }));
        setBuys(rows);
      } catch {
        // A failed poll leaves the last good list rather than blanking it.
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [raffle, publicClient, limit]);

  return { buys, isLoading };
}
