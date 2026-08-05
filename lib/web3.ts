import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain as defineAppKitChain } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { http } from "wagmi";
import { defineChain } from "viem";

/**
 * ────────────────────────────────────────────────────────────────────────
 *  ROBINHOOD CHAIN — network configuration
 *
 *  These are the live mainnet parameters. Verified against the node itself:
 *  eth_chainId returns 0x1237 (4663) and the chain is producing blocks.
 *  Every value can be overridden from the environment for a private RPC,
 *  a testnet, or a fork.
 * ────────────────────────────────────────────────────────────────────────
 */

const MAINNET = {
  id: 4663,
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  explorerUrl: "https://robinhoodchain.blockscout.com",
} as const;

const envChainId = Number.parseInt(
  process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID ?? "",
  10,
);

export const CHAIN_ID =
  Number.isFinite(envChainId) && envChainId > 0 ? envChainId : MAINNET.id;

const RPC_URL =
  process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL || MAINNET.rpcUrl;

export const EXPLORER_URL = (
  process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_EXPLORER_URL || MAINNET.explorerUrl
).replace(/\/$/, "");

export const robinhoodChain = defineChain({
  id: CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "Blockscout", url: EXPLORER_URL },
  },
  // Multicall3 is deployed at its canonical address on this chain (verified on
  // chain: 3809 bytes, aggregate3 answers). Without declaring it here viem
  // refuses every `multicall`, which is what made My Bag report "the indexer is
  // not reachable" for a wallet whose rewards were sitting on chain.
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
});

/**
 * Reown project id.
 *
 * Public by design — it ships in the client bundle and identifies the app to
 * Reown's relay, which is why it is a NEXT_PUBLIC value and not a secret. It
 * is rate-limited per domain rather than authenticated, so the protection is
 * the allowed-origins list in the Reown dashboard, not keeping this string
 * private.
 */
export const REOWN_PROJECT_ID =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() || "";

/**
 * Robinhood Chain, described for AppKit.
 *
 * AppKit ships a network list and this chain is not on it, so it is defined
 * here from the same values the viem chain uses. Both must agree: the viem
 * one is what server reads and contract calls go through, the AppKit one is
 * what the wallet modal offers and asks wallets to switch to.
 */
export const robinhoodAppKitNetwork = defineAppKitChain({
  id: CHAIN_ID,
  caipNetworkId: `eip155:${CHAIN_ID}`,
  chainNamespace: "eip155",
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Blockscout", url: EXPLORER_URL } },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
}) as AppKitNetwork;

/**
 * The wagmi config, now built by Reown's adapter rather than by hand.
 *
 * The reason is mobile. The old config carried a single `injected()`
 * connector, which only exists when a wallet has put a provider on the page —
 * true for a desktop extension, false for mobile Safari or Chrome. There was
 * no connector to offer, so `hasWallet` was false and the button could not do
 * anything. The adapter brings WalletConnect with it, which is how a phone
 * connects at all: the modal deep links into the wallet app, or shows a QR for
 * a wallet on another device.
 *
 * The transport and the multicall3 declaration are passed through unchanged.
 * Losing the latter is what once made My Bag report an unreachable indexer for
 * a wallet whose rewards were sitting on chain.
 */
export const wagmiAdapter = new WagmiAdapter({
  networks: [robinhoodAppKitNetwork],
  projectId: REOWN_PROJECT_ID,
  ssr: true,
  transports: { [CHAIN_ID]: http(RPC_URL) },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

/** Explorer deep links. */
export function explorerUrl(
  kind: "tx" | "address" | "token",
  value: string,
): string | null {
  if (!value) return null;
  const segment =
    kind === "tx" ? "tx" : kind === "address" ? "address" : "token";
  return `${EXPLORER_URL}/${segment}/${value}`;
}

export const NETWORK_LABEL = "Robinhood Chain";
export const NATIVE_SYMBOL = "ETH";
