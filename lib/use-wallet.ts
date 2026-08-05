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
import { appKitModal } from "./appkit";
import { CHAIN_ID, REOWN_PROJECT_ID } from "./web3";

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  /** True when the wallet is on a chain other than Robinhood Chain. */
  wrongNetwork: boolean;
  /**
   * True when connecting is possible at all.
   *
   * Used to be "is there an injected provider", which is false on every mobile
   * browser and is what made the connect button do nothing on a phone. With
   * the wallet modal there is always a route in — an extension, a deep link
   * into a wallet app, or a QR for a wallet on another device — so this is now
   * about whether the modal is configured rather than whether the page happens
   * to have a provider on it.
   */
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
 * The wallet surface for the whole app, on Robinhood Chain. No simulated
 * address — if nothing is connected, nothing is connected.
 *
 * Connecting goes through Reown's modal rather than straight at
 * `connectors[0]`. That call assumed an injected provider existed, which is
 * true of a desktop extension and false of mobile Safari or Chrome, so phone
 * users had a button that could not connect anything. The modal handles the
 * cases a phone actually needs: opening the wallet app by deep link, or
 * showing a QR to scan from another device.
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

  // Kept for the in-wallet browser case: when someone opens the site inside
  // MetaMask or Rainbow there is an injected provider already, and connecting
  // straight to it is one tap instead of a modal.
  const injectedConnector = connectors.find(
    (c: { type: string }) => c.type === "injected",
  );

  const connect = useCallback(async () => {
    // Ask whether a provider is actually there before trying to use it.
    // `connectors` always contains an injected entry whether or not anything
    // injected itself, so its mere presence proves nothing — and on a phone,
    // where nothing has, connecting to it stalls and only then rejects. That
    // put a hang in front of the modal for exactly the users the modal exists
    // for. `getProvider()` is the question we actually mean to ask.
    if (injectedConnector) {
      const provider = await injectedConnector.getProvider().catch(() => undefined);
      if (provider) {
        try {
          await connectAsync({ connector: injectedConnector, chainId: CHAIN_ID });
          return;
        } catch {
          // A provider that is present but refused the request means the
          // person dismissed their extension, so stop here. Opening the modal
          // on top of that would be arguing with someone who just said no.
          return;
        }
      }
    }
    await appKitModal.open();
  }, [connectAsync, injectedConnector]);

  const switchNetwork = useCallback(async () => {
    await switchChainAsync({ chainId: CHAIN_ID });
  }, [switchChainAsync]);

  return {
    address: account.address ?? null,
    isConnected: account.isConnected,
    isConnecting: isPending || account.isConnecting,
    wrongNetwork: account.isConnected && !onRightChain,
    // The modal is always a route in, so this no longer depends on the page
    // having a provider injected into it.
    hasWallet: Boolean(REOWN_PROJECT_ID) || Boolean(injectedConnector),
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
