import { NextResponse } from "next/server";
import { ROBACHA_GACHA_ABI } from "@/lib/abi";
import { ACTIVE_POOL_ID, chainConfig, configSummary, contracts } from "@/lib/config";
import { database, serverEnvSummary } from "@/lib/env/server";
import { hasArchiveRpc, publicClient, usingFallbackRpc } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Production health.
 *
 * Every check performs a real call. Nothing is reported healthy because it is
 * configured — an address is only "deployed" once bytecode is read back from
 * it, and randomness is only "available" when the contract itself says so.
 *
 * The response is deliberately free of secrets: booleans, block numbers, chain
 * ids and public addresses only.
 */
export async function GET() {
  const started = Date.now();

  /**
   * `required` checks decide the HTTP status: if one fails, the site genuinely
   * cannot serve its core function. `optional` checks are reported but never
   * fail the endpoint — an unbuilt subsystem is a known gap, not an outage, and
   * returning 503 for it would make every uptime monitor read a working
   * deployment as down.
   */
  const checks: Record<
    string,
    { ok: boolean; required: boolean; detail?: string }
  > = {};

  // ---- 1. RPC reachable and on the expected chain ----
  let headBlock: number | null = null;
  try {
    const client = publicClient();
    const [id, block] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
    ]);
    headBlock = Number(block);
    checks.rpc = {
      ok: id === chainConfig.id,
      required: true,
      detail:
        id === chainConfig.id
          ? `chain ${id}, head ${headBlock}`
          : `RPC reports chain ${id}, expected ${chainConfig.id}`,
    };
  } catch (error) {
    checks.rpc = {
      ok: false,
      required: true,
      detail: error instanceof Error ? error.message : "RPC unreachable",
    };
  }

  checks.productionRpc = {
    ok: !usingFallbackRpc,
    required: false,
    detail: usingFallbackRpc
      ? "ROBINHOOD_RPC_URL is unset; falling back to the public endpoint, which is a health-check fallback only"
      : "authenticated endpoint configured",
  };

  checks.archiveRpc = {
    ok: hasArchiveRpc,
    required: false,
    detail: hasArchiveRpc
      ? "archive endpoint configured"
      : "ROBINHOOD_ARCHIVE_RPC_URL is unset; historical indexing is unavailable",
  };

  // ---- 2. Contracts actually deployed ----
  const deployed: Record<string, boolean> = {};
  for (const [name, address] of Object.entries(contracts)) {
    if (!address) {
      deployed[name] = false;
      continue;
    }
    try {
      const code = await publicClient().getCode({ address });
      deployed[name] = Boolean(code && code !== "0x");
    } catch {
      deployed[name] = false;
    }
  }
  const allDeployed = Object.values(deployed).every(Boolean);
  checks.contracts = {
    ok: allDeployed,
    required: true,
    detail: allDeployed
      ? "bytecode present at every configured address"
      : `missing bytecode: ${Object.entries(deployed)
          .filter(([, ok]) => !ok)
          .map(([name]) => name)
          .join(", ")}`,
  };

  // ---- 3. Spin readiness, straight from the contract ----
  let spinReady = false;
  let randomnessReason = "gacha contract not configured";
  if (contracts.gacha && deployed.gacha) {
    try {
      const readiness = (await publicClient().readContract({
        address: contracts.gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName: "spinReadiness",
        args: [ACTIVE_POOL_ID],
      })) as readonly [boolean, boolean, boolean, boolean, bigint, bigint, bigint, string];

      spinReady = readiness[0];
      randomnessReason = readiness[7] || (spinReady ? "ready" : "pool not open");
    } catch (error) {
      randomnessReason =
        error instanceof Error ? error.message : "spinReadiness call failed";
    }
  }
  checks.spins = { ok: spinReady, required: true, detail: randomnessReason };

  // ---- 4. Database ----
  checks.database = {
    ok: Boolean(database.url),
    required: false,
    detail: database.url
      ? "DATABASE_URL configured"
      : "DATABASE_URL is unset; the indexer and indexed history are unavailable",
  };

  // ---- 5. Configuration parse errors ----
  const config = configSummary();
  const server = serverEnvSummary();
  checks.configuration = {
    ok: config.errors.length === 0 && server.issues.length === 0,
    required: true,
    detail: [...config.errors, ...server.issues].join("; ") || "no parse errors",
  };

  const entries = Object.values(checks);
  // Only a failing required check is an outage.
  const healthy = entries.filter((c) => c.required).every((c) => c.ok);
  const degraded = entries.some((c) => !c.required && !c.ok);

  return NextResponse.json(
    {
      // "healthy" means every required dependency answered. "degraded" adds
      // that an optional subsystem is unconfigured; the site still works.
      status: !healthy ? "unhealthy" : degraded ? "degraded" : "healthy",
      // "healthy" here means every dependency answered. Paid spins additionally
      // require the operator's own flag, which is reported separately.
      publicPaidSpinsEnabled:
        config.flags.publicPaidSpinsEnabled && server.publicPaidSpinsEnabled,
      chainId: chainConfig.id,
      headBlock,
      checks,
      contracts: config.contracts,
      contractsDeployed: deployed,
      server,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    },
    { status: healthy ? 200 : 503 },
  );
}
