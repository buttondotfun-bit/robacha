import "server-only";
import { isAddress, type Address } from "viem";

/**
 * Server-only environment.
 *
 * The `server-only` import makes a client-component import a build error, which
 * is the mechanism that keeps these values out of the bundle. Nothing here is
 * ever mirrored into a `NEXT_PUBLIC_` variable, and nothing here is ever
 * returned by an API route.
 *
 * Every value is optional at load time and validated on read. A missing value
 * is reported through `serverEnvIssues` and disables the feature that needs it;
 * it never falls back to a default that would make an unconfigured system look
 * configured.
 */

export const serverEnvIssues: string[] = [];

function optionalUrl(name: string): string | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).toString().replace(/\/$/, "");
  } catch {
    serverEnvIssues.push(`${name} is not a valid URL`);
    return null;
  }
}

function optionalAddress(name: string): Address | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  if (!isAddress(raw)) {
    serverEnvIssues.push(`${name} is not a valid address`);
    return null;
  }
  return raw;
}

function optionalBytes32(name: string): `0x${string}` | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    serverEnvIssues.push(`${name} is not a 32-byte hex value`);
    return null;
  }
  return raw as `0x${string}`;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    serverEnvIssues.push(`${name} is not a non-negative integer`);
    return fallback;
  }
  return parsed;
}

/** Addresses that hold privilege or receive funds. Never signing material. */
export const roles = {
  deployer: optionalAddress("ROBACHA_DEPLOYER_ADDRESS"),
  admin: optionalAddress("ROBACHA_ADMIN_ADDRESS"),
  treasury: optionalAddress("ROBACHA_TREASURY_ADDRESS"),
  operationsTreasury: optionalAddress("ROBACHA_OPERATIONS_TREASURY"),
  rewardReserveTreasury: optionalAddress("ROBACHA_REWARD_RESERVE_TREASURY"),
  randomnessTreasury: optionalAddress("ROBACHA_RANDOMNESS_TREASURY"),
} as const;

/**
 * Server-side RPC endpoints.
 *
 * `robinhoodRpcUrl` is the authenticated production endpoint. The public URL in
 * the client config is a health-check fallback and is deliberately not reused
 * here as a primary: an unauthenticated endpoint has no rate-limit guarantees
 * and no archive depth.
 */
export const rpc = {
  robinhood: optionalUrl("ROBINHOOD_RPC_URL"),
  robinhoodWs: optionalUrl("ROBINHOOD_WS_URL"),
  /** Archive-capable endpoint. Required for historical event indexing. */
  robinhoodArchive: optionalUrl("ROBINHOOD_ARCHIVE_RPC_URL"),
  ethereum: optionalUrl("ETHEREUM_RPC_URL"),
  ethereumWs: optionalUrl("ETHEREUM_WS_URL"),
} as const;

/** Chainlink configuration. No address here has a default. */
export const chainlink = {
  vrfSubscriptionId: process.env.CHAINLINK_VRF_SUBSCRIPTION_ID?.trim() || null,
  vrfCoordinator: optionalAddress("CHAINLINK_VRF_COORDINATOR"),
  vrfKeyHash: optionalBytes32("CHAINLINK_VRF_KEY_HASH"),
  ccipRouterRobinhood: optionalAddress("CHAINLINK_CCIP_ROUTER_ROBINHOOD"),
  ccipRouterEthereum: optionalAddress("CHAINLINK_CCIP_ROUTER_ETHEREUM"),
  ccipEthereumSelector: process.env.CHAINLINK_CCIP_ETHEREUM_SELECTOR?.trim() || null,
  ccipRobinhoodSelector: process.env.CHAINLINK_CCIP_ROBINHOOD_SELECTOR?.trim() || null,
} as const;

export const database = {
  url: process.env.DATABASE_URL?.trim() || null,
} as const;

export const indexer = {
  /** Blocks behind head before a log is treated as final. */
  confirmationDepth: optionalInt("INDEXER_CONFIRMATION_DEPTH", 12),
  priceIndexerUrl: optionalUrl("PRICE_INDEXER_URL"),
  /** How far behind head the indexer may fall before data is withheld. */
  maxLagBlocks: optionalInt("INDEXER_MAX_LAG_BLOCKS", 200),
} as const;

/**
 * The server-side half of the paid-spins switch.
 *
 * Both this and the client flag must be true, and the contract must be
 * unpaused, before a paid spin can go through. Defaults to disabled.
 */
export const PUBLIC_PAID_SPINS_ENABLED =
  process.env.PUBLIC_PAID_SPINS_ENABLED?.trim() === "true";

/** Jurisdictions where the operator has chosen not to offer paid spins. */
export const restrictedJurisdictions = (
  process.env.ROBACHA_RESTRICTED_JURISDICTIONS ?? ""
)
  .split(",")
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

/**
 * A one-line answer to "is the backend configured?", used by `/api/health`.
 * Reports booleans only — no URL, key or identifier is ever returned.
 */
export function serverEnvSummary() {
  return {
    rolesConfigured: {
      admin: Boolean(roles.admin),
      treasury: Boolean(roles.treasury),
      operationsTreasury: Boolean(roles.operationsTreasury),
      rewardReserveTreasury: Boolean(roles.rewardReserveTreasury),
    },
    rpcConfigured: {
      robinhood: Boolean(rpc.robinhood),
      robinhoodWs: Boolean(rpc.robinhoodWs),
      robinhoodArchive: Boolean(rpc.robinhoodArchive),
      ethereum: Boolean(rpc.ethereum),
    },
    chainlinkConfigured: {
      vrfSubscription: Boolean(chainlink.vrfSubscriptionId),
      vrfCoordinator: Boolean(chainlink.vrfCoordinator),
      vrfKeyHash: Boolean(chainlink.vrfKeyHash),
      ccipRouterRobinhood: Boolean(chainlink.ccipRouterRobinhood),
      ccipRouterEthereum: Boolean(chainlink.ccipRouterEthereum),
    },
    databaseConfigured: Boolean(database.url),
    indexer: {
      confirmationDepth: indexer.confirmationDepth,
      maxLagBlocks: indexer.maxLagBlocks,
      priceIndexerConfigured: Boolean(indexer.priceIndexerUrl),
    },
    publicPaidSpinsEnabled: PUBLIC_PAID_SPINS_ENABLED,
    restrictedJurisdictionCount: restrictedJurisdictions.length,
    issues: serverEnvIssues,
  };
}

/**
 * Keeper credentials.
 *
 * A round does not advance itself. `closeRound`, `requestRoundRandomness` and
 * `settleEntries` are permissionless by design — anyone may call them — but
 * "anyone" turned out to mean "nobody", and paid rounds sat unsettled until
 * their refund timeout. This is the account that actually does it.
 *
 * The key is read from the process environment only. It is never sent to the
 * browser, never logged, never included in a response, and must be set in the
 * hosting provider's dashboard rather than any file in this repository.
 */
export const keeper = {
  /** Hex private key for the keeper account. Server-only. */
  privateKey: process.env.KEEPER_PRIVATE_KEY ?? null,
  /** Shared secret the scheduler must present. */
  cronSecret: process.env.CRON_SECRET ?? null,
  /**
   * Master seed for commitment secrets.
   *
   * Secrets are DERIVED from this, never stored: secret(i) = keccak256(seed, i).
   * The previous design wrote them to a JSON file, which cannot work on a
   * serverless host — the filesystem is read-only, every invocation is a fresh
   * container, and the write happened *after* the commitments were already
   * posted on chain. That combination posts commitments and then loses their
   * secrets forever, and every one of them later binds to a round that can
   * never be revealed. Derivation removes the storage problem entirely.
   */
  commitmentSeed: process.env.KEEPER_COMMITMENT_SEED ?? null,
  /**
   * Secrets for commitments posted before derivation existed, as a JSON map of
   * index to secret. The queue is FIFO so these must stay revealable until
   * they have all been consumed; after that this can be removed.
   */
  legacySecrets: process.env.KEEPER_LEGACY_SECRETS ?? null,
  get configured(): boolean {
    return Boolean(this.privateKey && this.cronSecret && this.commitmentSeed);
  },
};
