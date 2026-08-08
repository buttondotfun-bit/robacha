"use client";

import { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { ROBACHA_RAFFLE_HUB_ABI, HubRaffleState } from "./abi/robacha-raffle-hub";
import { chainConfig, contracts } from "./config";

/**
 * The launchpad hub, read straight from chain.
 *
 * Everything a launchpad surface shows — the list of raffles, each one's price,
 * caps, sold count, window, winner and the caller's own tickets — comes from
 * the hub contract, never from a data file. When no hub is deployed the hooks
 * report `configured: false` and the pages fall back to their "not live yet"
 * state, which is the honest thing to show before the contract exists.
 */

const ZERO = "0x0000000000000000000000000000000000000000";
const REFRESH = 10_000;

/** Minimal ERC-721 surface the create flow needs to escrow a token. */
export const ERC721_MIN_ABI = [
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "getApproved", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "isApprovedForAll", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "tokenURI", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "string" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

export interface HubRaffle {
  id: number;
  creator: Address;
  nft: Address;
  tokenId: bigint;
  ticketPriceWei: bigint;
  ticketCap: number;
  maxPerWallet: number;
  openAt: number;
  closesAt: number;
  ticketsSold: number;
  soldOutAt: number;
  winner: Address | null;
  drawRequestId: bigint;
  drawRequestedAt: number;
  totalEscrow: bigint;
  refundsOpen: boolean;
  cancelled: boolean;
  proceedsSettled: boolean;
  nftSettled: boolean;
  feeReclaimed: boolean;
  /** Derived exactly as the contract's state() does. */
  state: number;
}

type RawRaffle = {
  creator: Address;
  nft: Address;
  tokenId: bigint;
  ticketPriceWei: bigint;
  ticketCap: bigint;
  maxPerWallet: bigint;
  openAt: bigint;
  closesAt: bigint;
  ticketsSold: bigint;
  soldOutAt: bigint;
  winner: Address;
  drawRequestId: bigint;
  drawRequestedAt: bigint;
  totalEscrow: bigint;
  refundsOpen: boolean;
  cancelled: boolean;
  proceedsSettled: boolean;
  nftSettled: boolean;
  feeReclaimed: boolean;
};

function parseRaffle(id: number, r: RawRaffle): HubRaffle {
  const ticketsSold = Number(r.ticketsSold);
  const ticketCap = Number(r.ticketCap);
  const winner = r.winner && r.winner !== ZERO ? r.winner : null;

  // Mirror RobachaRaffleHub.state().
  let state: number = HubRaffleState.Open;
  if (r.cancelled) state = HubRaffleState.Cancelled;
  else if (winner) state = HubRaffleState.Complete;
  else if (r.refundsOpen) state = HubRaffleState.Refundable;
  else if (ticketsSold === ticketCap) state = HubRaffleState.AwaitingDraw;

  return {
    id,
    creator: r.creator,
    nft: r.nft,
    tokenId: r.tokenId,
    ticketPriceWei: r.ticketPriceWei,
    ticketCap,
    maxPerWallet: Number(r.maxPerWallet),
    openAt: Number(r.openAt),
    closesAt: Number(r.closesAt),
    ticketsSold,
    soldOutAt: Number(r.soldOutAt),
    winner,
    drawRequestId: r.drawRequestId,
    drawRequestedAt: Number(r.drawRequestedAt),
    totalEscrow: r.totalEscrow,
    refundsOpen: r.refundsOpen,
    cancelled: r.cancelled,
    proceedsSettled: r.proceedsSettled,
    nftSettled: r.nftSettled,
    feeReclaimed: r.feeReclaimed,
    state,
  };
}

// ------------------------------------------------------------------- hub status
export function useHubStatus() {
  const hub = contracts.raffleHub ?? undefined;
  const configured = Boolean(hub);
  const base = { address: hub, abi: ROBACHA_RAFFLE_HUB_ABI, chainId: chainConfig.id } as const;

  const countQ = useReadContract({ ...base, functionName: "raffleCount", query: { enabled: configured, refetchInterval: REFRESH } });
  const pausedQ = useReadContract({ ...base, functionName: "listingsPaused", query: { enabled: configured, refetchInterval: 60_000 } });
  const feeQ = useReadContract({ ...base, functionName: "PLATFORM_FEE_BPS", query: { enabled: configured } });

  return {
    configured,
    raffleCount: countQ.data !== undefined ? Number(countQ.data) : 0,
    listingsPaused: Boolean(pausedQ.data),
    feeBps: feeQ.data !== undefined ? Number(feeQ.data) : 1000,
    isLoading: configured && countQ.isLoading,
    refetch: countQ.refetch,
  };
}

// --------------------------------------------------------------- list raffles
/**
 * Every raffle the hub has ever created, newest first. Reads the count, then
 * one `getRaffle` per id in a single batch. Non-fatal by design: a hub with no
 * raffles yet returns an empty list, not an error.
 */
export function useHubRaffles(): { raffles: HubRaffle[]; isLoading: boolean; configured: boolean; refetch: () => void } {
  const hub = contracts.raffleHub ?? undefined;
  const { raffleCount, configured } = useHubStatus();

  const ids = useMemo(
    () => Array.from({ length: raffleCount }, (_, i) => raffleCount - i), // newest first
    [raffleCount],
  );

  const query = useReadContracts({
    allowFailure: true,
    query: { enabled: configured && ids.length > 0, refetchInterval: REFRESH },
    contracts: ids.map((id) => ({
      address: hub!,
      abi: ROBACHA_RAFFLE_HUB_ABI,
      functionName: "getRaffle" as const,
      args: [BigInt(id)] as const,
      chainId: chainConfig.id,
    })),
  });

  const raffles = useMemo(() => {
    if (!query.data) return [];
    const out: HubRaffle[] = [];
    query.data.forEach((res, i) => {
      if (res.status === "success" && res.result) {
        out.push(parseRaffle(ids[i], res.result as unknown as RawRaffle));
      }
    });
    return out;
  }, [query.data, ids]);

  return {
    raffles,
    configured,
    isLoading: configured && ids.length > 0 && query.isLoading,
    refetch: query.refetch,
  };
}

// --------------------------------------------------------------- one raffle
export type HubTxPhase = "idle" | "pending" | "error";

export function useHubRaffle(id: number | null) {
  const hub = contracts.raffleHub ?? undefined;
  const configured = Boolean(hub) && id !== null && id > 0;
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: chainConfig.id });
  const { writeContractAsync } = useWriteContract();

  const [phase, setPhase] = useState<HubTxPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const base = { address: hub, abi: ROBACHA_RAFFLE_HUB_ABI, chainId: chainConfig.id } as const;
  const live = { enabled: configured, refetchInterval: REFRESH } as const;
  const perWallet = { enabled: configured && Boolean(address), refetchInterval: REFRESH } as const;

  const raffleQ = useReadContract({ ...base, functionName: "getRaffle", args: id ? [BigInt(id)] : undefined, query: live });
  const myTixQ = useReadContract({ ...base, functionName: "ticketsOf", args: id && address ? [BigInt(id), address] : undefined, query: perWallet });
  const myPaidQ = useReadContract({ ...base, functionName: "paidWei", args: id && address ? [BigInt(id), address] : undefined, query: perWallet });
  const myRefundedQ = useReadContract({ ...base, functionName: "refunded", args: id && address ? [BigInt(id), address] : undefined, query: perWallet });

  const raffle = raffleQ.data ? parseRaffle(id!, raffleQ.data as unknown as RawRaffle) : null;

  const refetch = useCallback(() => {
    void raffleQ.refetch();
    void myTixQ.refetch();
    void myPaidQ.refetch();
    void myRefundedQ.refetch();
  }, [raffleQ, myTixQ, myPaidQ, myRefundedQ]);

  const write = useCallback(
    async (functionName: string, args: readonly unknown[], value?: bigint) => {
      setError(null);
      if (!hub || id === null) {
        setError("The launchpad is not live yet.");
        return;
      }
      try {
        setPhase("pending");
        const hash = await writeContractAsync({
          address: hub,
          abi: ROBACHA_RAFFLE_HUB_ABI,
          functionName: functionName as never,
          args: args as never,
          value,
          chainId: chainConfig.id,
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        setPhase("idle");
        refetch();
      } catch (caught) {
        setPhase("error");
        setError(cleanError(caught));
      }
    },
    [hub, id, writeContractAsync, publicClient, refetch],
  );

  const buy = useCallback(
    async (quantity: number) => {
      if (!raffle) return;
      await write("buyTicket", [BigInt(id!), quantity], raffle.ticketPriceWei * BigInt(quantity));
    },
    [write, raffle, id],
  );

  const actions = useMemo(
    () => ({
      buy,
      refund: () => write("withdrawRefund", [BigInt(id!)]),
      markRefundable: () => write("markRefundable", [BigInt(id!)]),
      requestDraw: () => write("requestDraw", [BigInt(id!)]),
      claimPrize: () => write("claimPrize", [BigInt(id!)]),
      claimProceeds: () => write("claimProceeds", [BigInt(id!)]),
      reclaimNft: () => write("reclaimNft", [BigInt(id!)]),
      cancel: () => write("cancelRaffle", [BigInt(id!)]),
    }),
    [buy, write, id],
  );

  return {
    configured,
    raffle,
    isLoading: configured && raffleQ.isLoading,
    myTickets: myTixQ.data !== undefined ? Number(myTixQ.data) : 0,
    myPaidWei: (myPaidQ.data as bigint | undefined) ?? 0n,
    myRefunded: Boolean(myRefundedQ.data),
    phase,
    error,
    reset: () => { setPhase("idle"); setError(null); },
    refetch,
    ...actions,
  };
}

// --------------------------------------------------------------- create flow
export type CreateStep = "idle" | "approving" | "creating" | "error" | "done";

export interface CreateRaffleInput {
  nft: Address;
  tokenId: bigint;
  ticketPriceWei: bigint;
  ticketCap: number;
  maxPerWallet: number;
  /** Seconds. */
  duration: number;
  /** Unix seconds, or 0 for "now". */
  openAt?: number;
}

/**
 * The two-step listing flow: approve the hub for the token, then create the
 * raffle (which pulls the NFT into escrow). Returns the new raffle id.
 */
export function useCreateRaffle() {
  const hub = contracts.raffleHub ?? undefined;
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: chainConfig.id });
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<CreateStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [newId, setNewId] = useState<number | null>(null);

  const create = useCallback(
    async (input: CreateRaffleInput): Promise<number | null> => {
      setError(null);
      setNewId(null);
      // Every early-out flips step to "error" too, so the surfacing UI (which
      // gates on step === "error") actually shows the reason instead of the
      // click looking like it did nothing.
      if (!hub) { setStep("error"); setError("The launchpad is not live yet."); return null; }
      if (!address || !publicClient) { setStep("error"); setError("Connect your wallet first."); return null; }

      try {
        // Verify ownership before anything, so a wrong token id fails clearly.
        const owner = (await publicClient.readContract({
          address: input.nft, abi: ERC721_MIN_ABI, functionName: "ownerOf", args: [input.tokenId],
        })) as Address;
        if (owner.toLowerCase() !== address.toLowerCase()) {
          setStep("error");
          setError("You don't own this token with the connected wallet — connect the wallet that holds it, or check the collection and id.");
          return null;
        }

        // Approve only if not already approved (either single or operator).
        const [approved, forAll] = await Promise.all([
          publicClient.readContract({ address: input.nft, abi: ERC721_MIN_ABI, functionName: "getApproved", args: [input.tokenId] }) as Promise<Address>,
          publicClient.readContract({ address: input.nft, abi: ERC721_MIN_ABI, functionName: "isApprovedForAll", args: [address, hub] }) as Promise<boolean>,
        ]);
        if (approved.toLowerCase() !== hub.toLowerCase() && !forAll) {
          setStep("approving");
          const approveHash = await writeContractAsync({
            address: input.nft, abi: ERC721_MIN_ABI, functionName: "approve", args: [hub, input.tokenId], chainId: chainConfig.id,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        setStep("creating");
        const createHash = await writeContractAsync({
          address: hub,
          abi: ROBACHA_RAFFLE_HUB_ABI,
          functionName: "createRaffle",
          args: [
            input.nft,
            input.tokenId,
            input.ticketPriceWei,
            input.ticketCap,
            input.maxPerWallet,
            BigInt(input.openAt ?? 0),
            BigInt(input.duration),
          ],
          chainId: chainConfig.id,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

        // Pull the new id from the RaffleCreated event's first indexed topic.
        let created: number | null = null;
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === hub.toLowerCase() && log.topics[1]) {
            created = Number(BigInt(log.topics[1]));
            break;
          }
        }
        setNewId(created);
        setStep("done");
        return created;
      } catch (caught) {
        setStep("error");
        setError(cleanError(caught));
        return null;
      }
    },
    [hub, address, publicClient, writeContractAsync],
  );

  return { create, step, error, newId, reset: () => { setStep("idle"); setError(null); setNewId(null); } };
}

function cleanError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : "The transaction was not sent.";
  if (/user rejected|denied|rejected the request/i.test(message)) return "Transaction rejected in wallet.";
  return message.split("\n")[0];
}

export { HubRaffleState };
