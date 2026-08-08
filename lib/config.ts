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
  // The live Meebit raffle. Carries a default so ticket sales open on a build
  // without depending on a NEXT_PUBLIC env var being set and the site rebuilt in
  // the right order — the build-time gotcha that leaves a var "set" but not
  // compiled in. An env var still wins if provided, so a future raffle can point
  // elsewhere without a code change.
  //
  // The address is filled in once a raffle is deployed at the correct ticket
  // price. It is empty here on purpose after the first deploy came out at ~$5
  // (the default assumed $3,600/ETH; ETH was ~$1,900), so the page stays on its
  // "opens soon" state rather than selling a mispriced ticket.
  raffle: readAddress(
    process.env.NEXT_PUBLIC_ROBACHA_RAFFLE_ADDRESS,
    "NEXT_PUBLIC_ROBACHA_RAFFLE_ADDRESS",
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
