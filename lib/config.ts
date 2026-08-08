import { isAddress, type Address } from "viem";

/**
 * Client-safe configuration.
 *
 * Only `NEXT_PUBLIC_*` values are read here, so this module is safe to import
 * from a component. Server-only credentials live in `lib/env/server.ts`, which
 * refuses to load in the browser.
 *
 * Network defaults are Robinhood Chain mainnet, verified against the node
 * (`eth_chainId` → `0x1237`). Contract addresses have no defaults: an unset or
 * malformed address resolves to `null`, and every feature that needs it
 * degrades to an explicit unavailable state rather than guessing.
 */

const MAINNET = {
  id: 4663,
  name: "Robinhood Chain",
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  nativeSymbol: "ETH",
} as const;

/** Collected during module init; exposed through `/api/health`. */
export const configErrors: string[] = [];

function readAddress(value: string | undefined, label: string): Address | null {
  if (!value || value.trim() === "") return null;
  const trimmed = value.trim();
  if (!isAddress(trimmed)) {
    configErrors.push(`${label} is not a valid address: "${trimmed}"`);
    return null;
  }
  return trimmed;
}

function readUrl(value: string | undefined, fallback: string, label: string) {
  if (!value || value.trim() === "") return fallback;
  try {
    return new URL(value.trim()).toString().replace(/\/$/, "");
  } catch {
    configErrors.push(`${label} is not a valid URL: "${value}"`);
    return fallback;
  }
}

function readOptionalUrl(value: string | undefined, label: string) {
  if (!value || value.trim() === "") return null;
  try {
    return new URL(value.trim()).toString().replace(/\/$/, "");
  } catch {
    configErrors.push(`${label} is not a valid URL: "${value}"`);
    return null;
  }
}

const envChainId = Number.parseInt(
  process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID ?? "",
  10,
);

export const chainConfig = {
  id: Number.isFinite(envChainId) && envChainId > 0 ? envChainId : MAINNET.id,
  name: process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_NAME?.trim() || MAINNET.name,
  rpcUrl: readUrl(
    process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL,
    MAINNET.rpcUrl,
    "NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL",
  ),
  wsUrl: readOptionalUrl(
    process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_WS_URL,
    "NEXT_PUBLIC_ROBINHOOD_CHAIN_WS_URL",
  ),
  explorerUrl: readUrl(
    process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_EXPLORER_URL,
    MAINNET.explorerUrl,
    "NEXT_PUBLIC_ROBINHOOD_CHAIN_EXPLORER_URL",
  ),
  nativeSymbol:
    process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_NATIVE_SYMBOL?.trim() ||
    MAINNET.nativeSymbol,
} as const;

export const contracts = {
  gacha: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_GACHA_ADDRESS,
    "NEXT_PUBLIC_ROBACHA_GACHA_ADDRESS",
  ),
  poolRegistry: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_POOL_REGISTRY_ADDRESS,
    "NEXT_PUBLIC_ROBACHA_POOL_REGISTRY_ADDRESS",
  ),
  rewardVault: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_REWARD_VAULT_ADDRESS,
    "NEXT_PUBLIC_ROBACHA_REWARD_VAULT_ADDRESS",
  ),
  feeRouter: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_FEE_ROUTER_ADDRESS,
    "NEXT_PUBLIC_ROBACHA_FEE_ROUTER_ADDRESS",
  ),
  randomnessReceiver: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_RANDOMNESS_RECEIVER_ADDRESS,
    "NEXT_PUBLIC_ROBACHA_RANDOMNESS_RECEIVER_ADDRESS",
  ),
  randomnessSender: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_RANDOMNESS_SENDER_ADDRESS,
    "NEXT_PUBLIC_ROBACHA_RANDOMNESS_SENDER_ADDRESS",
  ),
  // The featured raffle contract on Robinhood Chain — the one that sells tickets
  // for whatever NFT the /raffle page currently features. It is the Chimpers
  // #2272 raffle, live and pinned.
  //
  // Pinned to the deployed address (env still overrides). Verified on chain:
  // ticketPriceWei 5206650000000000 (≈ $10 at deploy), TICKET_CAP 200,
  // MAX_PER_WALLET 25, a 24h window (closesAt − openAt = 86400), drawing from
  // the same StonkPit conductor as the gacha. Deliberately NOT the previous
  // Meebit contract (0x8BEe0584c4932fAEdcB0084844F328606cC95AaC): that is a
  // separate, standalone raffle whose own buyers settle or refund on it
  // directly. When this raffle ends, clear this line rather than repointing it.
  raffle: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_CHIMPERS_RAFFLE_ADDRESS ??
      "0x6676D4Bda98716e386B271eF06b5Ee1dE460772a",
    "NEXT_PUBLIC_ROBACHA_CHIMPERS_RAFFLE_ADDRESS",
  ),
  // The earlier Meebit raffle, still live on chain and kept on the site while it
  // winds down. A standalone RobachaRaffle at 0x8BEe…95AaC: verified 200/25 caps,
  // ticketPriceWei 5225848089821876 (≈ $10), 24h window. It sells and, if it
  // doesn't sell out, refunds every ticket in full (markRefundable is
  // permissionless once the window elapses). Pinned so its own buyers keep a
  // live UI to track it and pull refunds; clear this line once it's fully
  // settled and every refund is withdrawn.
  raffleMeebit: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_MEEBIT_RAFFLE_ADDRESS ??
      "0x8BEe0584c4932fAEdcB0084844F328606cC95AaC",
    "NEXT_PUBLIC_ROBACHA_MEEBIT_RAFFLE_ADDRESS",
  ),
  // The permissionless NFT-raffle launchpad. Read from the env var: unset until
  // the hub is deployed, at which point the launchpad opens. Until then every
  // launchpad surface degrades to an honest "not live yet" state.
  raffleHub: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_RAFFLE_HUB_ADDRESS,
    "NEXT_PUBLIC_ROBACHA_RAFFLE_HUB_ADDRESS",
  ),
} as const;

/**
 * The pool the app shows. Defaults to pool 1, which is the first pool the
 * registry issues; it is configurable so a later pool can take over without a
 * redeploy.
 */
const envPoolId = Number.parseInt(process.env.NEXT_PUBLIC_ROBACHA_POOL_ID ?? "", 10);
export const ACTIVE_POOL_ID = BigInt(
  Number.isFinite(envPoolId) && envPoolId > 0 ? envPoolId : 1,
);

/** True only when both the gacha and the registry are present and well-formed. */
export const isGachaConfigured =
  contracts.gacha !== null && contracts.poolRegistry !== null;

/**
 * The Stock Machine's pool id — the switch that makes the tokenized-stock gacha
 * real.
 *
 * Unset until the operator deploys and funds a tokenized-stock pool on chain
 * (see contracts/script/PublishStockPool.s.sol: create the pool version,
 * allowlist the token addresses, set economics/odds, fund the reward vault, then
 * activate). Until then the Stock Machine stays a locked coming-soon preview —
 * there is nothing to spin. Pointing NEXT_PUBLIC_ROBACHA_STOCK_POOL_ID at the
 * deployed pool id flips the same spin UI live for that pool. Nothing here can
 * conjure inventory: if the pool isn't funded, the gacha's own readiness check
 * keeps the spin button honest.
 */
// Pinned to 2 in code (env still overrides) because the tokenized-stock pool is
// live: registry pool 2, version 2, active and inventory-solvent, verified on
// chain with the five confirmed stocks at 70/25/5. Same reasoning as the pinned
// raffle address — a known-good, verified value wins over an unset env var. To
// move or retire the machine, set NEXT_PUBLIC_ROBACHA_STOCK_POOL_ID or clear
// this fallback.
const envStockPoolId = Number.parseInt(process.env.NEXT_PUBLIC_ROBACHA_STOCK_POOL_ID ?? "", 10);
export const STOCK_POOL_ID: bigint | null =
  Number.isFinite(envStockPoolId) && envStockPoolId > 0 ? BigInt(envStockPoolId) : 2n;

/** Whether the Stock Machine is live (a pool id is configured and the gacha is up). */
export const isStockMachineLive = STOCK_POOL_ID !== null && isGachaConfigured;

/**
 * The operator's deliberate switch for public paid spins.
 *
 * This is one control among several, never the only one — the gacha contract's
 * own pause and the fail-closed readiness checks apply regardless. It defaults
 * to disabled so a fresh deployment cannot take money by accident.
 */
export const PUBLIC_PAID_SPINS_ENABLED =
  process.env.NEXT_PUBLIC_PUBLIC_PAID_SPINS_ENABLED?.trim() === "true";

export const services = {
  walletConnectProjectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || "",
} as const;

/** Blocks from head treated as final before an event is shown as settled. */
export const CONFIRMATIONS = 2;

export function explorerUrl(
  kind: "tx" | "address" | "token" | "block",
  value: string | number,
): string | null {
  if (value === "" || value === undefined || value === null) return null;
  return `${chainConfig.explorerUrl}/${kind}/${value}`;
}

/**
 * Startup summary used by `/api/health`. Reports what is configured without
 * ever asserting a capability the chain does not back.
 */
export function configSummary() {
  return {
    chain: {
      id: chainConfig.id,
      name: chainConfig.name,
      rpcConfigured: Boolean(chainConfig.rpcUrl),
      wsConfigured: Boolean(chainConfig.wsUrl),
      explorerConfigured: Boolean(chainConfig.explorerUrl),
    },
    contracts,
    flags: {
      publicPaidSpinsEnabled: PUBLIC_PAID_SPINS_ENABLED,
      walletConnectConfigured: Boolean(services.walletConnectProjectId),
    },
    errors: configErrors,
  };
}
