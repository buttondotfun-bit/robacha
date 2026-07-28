"use client";

import { useCallback } from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { formatUnits } from "viem";
import { CHAIN_ID } from "./web3";

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  /** True when the wallet is on a chain other than Robinhood Chain. */
  wrongNetwork: boolean;
  /** True when the browser exposes an injected wallet at all. */
  hasWallet: boolean;
  /** Native balance on Robinhood Chain, formatted. */
  balance: string | null;
  /**
   * The same balance unformatted, so callers can compare it against a cost.
   * Null while unknown — which is not the same as zero, and a "you can't
   * afford this" message must never be shown on the strength of a pending read.
   */
  balanceWei: bigint | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  error: string | null;
}

/**
 * The wallet surface for the whole app: a real injected wallet on Robinhood
 * Chain. No simulated address — if nothing is connected, nothing is connected.
 */
export function useWallet(): WalletState {
  const account = useAccount();
  const { connectAsync, connectors, isPending, error } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const onRightChain = account.chainId === CHAIN_ID;

  const { data: balance } = useBalance({
    address: account.address,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(account.address) && onRightChain },
  });

  const connector = connectors[0];

  const connect = useCallback(async () => {
    if (!connector) return;
    await connectAsync({ connector, chainId: CHAIN_ID });
  }, [connectAsync, connector]);

  const switchNetwork = useCallback(async () => {
    await switchChainAsync({ chainId: CHAIN_ID });
  }, [switchChainAsync]);

  return {
    address: account.address ?? null,
    isConnected: account.isConnected,
    isConnecting: isPending || account.isConnecting,
    wrongNetwork: account.isConnected && !onRightChain,
    hasWallet: Boolean(connector),
    balance: balance
      ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}`
      : null,
    balanceWei: balance ? balance.value : null,
    connect,
    disconnect: async () => {
      await disconnectAsync();
    },
    switchNetwork,
    error: error ? error.message : null,
  };
}
