import { NextResponse } from "next/server";
import { ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI, ROBACHA_GACHA_ABI } from "@/lib/abi";
import { ACTIVE_POOL_ID, chainConfig, configSummary, contracts } from "@/lib/config";
import { database, keeper, serverEnvSummary } from "@/lib/env/server";
import { hasArchiveRpc, publicClient, usingFallbackRpc } from "@/lib/server/chain";
import {
  activeRandomnessAdapter,
  activeRandomnessReceiver,
} from "@/lib/server/randomness-adapter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The StonkPit entropy adapter's surface, and only what this file reads.
 *
 * `conductor` doubles as the detector: the commit-reveal contract has no such
 * function, so a successful call identifies the implementation before anything
 * implementation-specific is asked of it.
 */
const ENTROPY_ADAPTER_ABI = [
  { type: "function", name: "conductor", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "runwayRounds", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "isReady", stateMutability: "view", inputs: [],
    outputs: [{ type: "bool" }, { type: "string" }],
  },
] as const;

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

  /**
   * The adapter the gacha actually routes to.
   *
   * Resolved once and used for both the readiness check and the published
   * contract map. The map is what the docs page renders as "verify this
   * address", so serving it from configuration means a stale env var puts a
   * retired contract in front of players as the thing securing their draw.
   */
  const [activeRandomness, activeReceiver] = await Promise.all([
    activeRandomnessAdapter(publicClient()).catch(() => contracts.randomnessSender ?? null),
    activeRandomnessReceiver(publicClient()).catch(() => contracts.randomnessReceiver ?? null),
  ]);

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

  // ---- 5. Keeper ----
  //
  // A round does not advance itself, so a silently dead keeper looks exactly
  // like a quiet day until someone's money is stuck. This reports whether it
  // *could* run: credentials present, commitments in the queue, bond posted,
  // and gas in the wallet.
  //
  // Booleans only for anything secret. The seed and the signing key are never
  // read, echoed or hinted at here — this endpoint is public.
  {
    const missing: string[] = [];
    if (!keeper.privateKey) missing.push("KEEPER_PRIVATE_KEY");
    if (!keeper.cronSecret) missing.push("CRON_SECRET");
    if (!keeper.commitmentSeed) missing.push("KEEPER_COMMITMENT_SEED");

    // Shape, never value. A key pasted without its 0x is present but useless,
    // and that failure surfaced as an opaque 500 rather than anything a log
    // could be read for.
    const hex32 = /^0x[0-9a-fA-F]{64}$/;
    const malformed: string[] = [];
    if (keeper.privateKey && !hex32.test(keeper.privateKey.trim())) malformed.push("KEEPER_PRIVATE_KEY");
    if (keeper.commitmentSeed && !hex32.test(keeper.commitmentSeed.trim())) malformed.push("KEEPER_COMMITMENT_SEED");
    missing.push(...malformed.map((n) => `${n} (malformed — expected 0x + 64 hex)`));

    let detail: string;
    let ok = missing.length === 0;

    if (!ok) {
      detail = `not configured: ${missing.join(", ")} unset`;
    } else {
      const rpc = publicClient();
      const randomness = activeRandomness;

      if (!randomness) {
        ok = false;
        detail = "randomness contract address is not configured";
      } else {
        try {
          // Which implementation is wired? Only the StonkPit adapter answers
          // `conductor`, and the two share no other surface — every reading
          // below is specific to one of them, so asking the wrong one reverts
          // rather than degrades. That is what made this check report a raw
          // revert string from the moment the source was switched.
          const conductor = await rpc
            .readContract({ address: randomness, abi: ENTROPY_ADAPTER_ABI, functionName: "conductor" })
            .catch(() => null);

          if (conductor) {
            const [runway, ready, float] = (await Promise.all([
              rpc.readContract({ address: randomness, abi: ENTROPY_ADAPTER_ABI, functionName: "runwayRounds" }),
              rpc.readContract({ address: randomness, abi: ENTROPY_ADAPTER_ABI, functionName: "isReady" }),
              rpc.getBalance({ address: randomness }),
            ])) as [bigint, readonly [boolean, string], bigint];

            ok = ready[0];
            detail = ok
              ? `configured; StonkPit entropy, ${runway.toString()} rounds of runway, float ${float.toString()} wei`
              : `randomness not ready: ${ready[1] || "unknown"}; ${runway.toString()} rounds of runway`;
          } else {
            const [available, bond, ready] = (await Promise.all([
              rpc.readContract({
                address: randomness,
                abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
                functionName: "availableCommitments",
              }),
              rpc.readContract({
                address: randomness,
                abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
                functionName: "bond",
              }),
              rpc.readContract({
                address: randomness,
                abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
                functionName: "isReady",
              }),
            ])) as [bigint, bigint, readonly [boolean, string]];

            const commitments = Number(available);
            ok = ready[0] && commitments > 0;
            detail = ok
              ? `configured; ${commitments} commitments queued, bond ${bond.toString()} wei`
              : `randomness not ready: ${ready[1] || "unknown"}; ${commitments} commitments queued`;
          }
        } catch (error) {
          ok = false;
          detail = error instanceof Error ? error.message : "randomness read failed";
        }
      }
    }

    checks.keeper = { ok, required: false, detail };
  }

  // ---- 6. Configuration parse errors ----
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
      // Both randomness entries are one contract in the current design, and
      // both are overridden with what the gacha names rather than what the
      // environment claims.
      contracts: {
        ...config.contracts,
        ...(activeRandomness ? { randomnessSender: activeRandomness } : {}),
        ...(activeReceiver ? { randomnessReceiver: activeReceiver } : {}),
      },
      contractsDeployed: deployed,
      server,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    },
    { status: healthy ? 200 : 503 },
  );
}
