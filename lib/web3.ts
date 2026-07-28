import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
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

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected()],
  transports: { [robinhoodChain.id]: http(RPC_URL) },
  ssr: true,
});

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
