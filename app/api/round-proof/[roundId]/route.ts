import { NextResponse } from "next/server";
import {
  decodeFunctionData,
  encodeAbiParameters,
  keccak256,
  parseAbiItem,
  type Address,
} from "viem";
import {
  ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
  ROBACHA_GACHA_ABI,
} from "@/lib/abi";
import { chainConfig, contracts } from "@/lib/config";
import { publicClient } from "@/lib/server/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proof that a round's number was not chosen after the fact.
 *
 * The site claims we cannot pick your reward. That claim rests on a sequence
 * anyone can check, and until now nobody could check it without writing their
 * own script — which is the same as asking people to take our word for it.
 *
 * This route re-derives the winning number from published inputs and reports
 * every step, including the ones that fail. It is not a badge that says
 * "verified": each check carries the values it used, so the answer can be
 * recomputed by hand or by someone else's code. A verifier only worth anything
 * if it can come back false.
 *
 * The four links in the chain:
 *
 *   1. The commitment was posted before the round opened. This is the one that
 *      matters — a sealed number chosen after entries were visible would be no
 *      commitment at all. The contract enforces it on reveal; this shows it.
 *   2. The revealed secret hashes to that commitment, so it is the number that
 *      was sealed rather than a convenient one produced later.
 *   3. Entrant entropy folds every entrant's address into the seed, so the
 *      operator alone cannot determine the outcome even holding the secret.
 *   4. The final number recomputes exactly from those inputs.
 *
 * The secret is read from the reveal transaction's own calldata. It is public
 * the moment it is used — that is what makes the scheme checkable — and no
 * secret that has not yet been revealed is ever read or exposed here.
 */

const REVEALED = parseAbiItem(
  "event Revealed(uint256 indexed roundId, bytes32 indexed requestId, uint256 randomWord)",
);

/** Matches MAX_ENTRY_SCAN in the randomness contract. */
const MAX_ENTRY_SCAN = 64;

export interface ProofCheck {
  id: string;
  label: string;
  passed: boolean | null;
  detail: string;
}

export interface RoundProof {
  roundId: number;
  state: string;
  available: boolean;
  reason?: string;
  checks: ProofCheck[];
  values: Record<string, string | number | null>;
}

const STATE_NAME: Record<number, string> = {
  0: "None", 1: "Open", 2: "Closed", 3: "RandomnessRequested", 4: "CrossChainPending",
  5: "VRFPending", 6: "ResultReturning", 7: "RandomnessReceived", 8: "Settled",
  9: "Failed", 10: "Refundable", 11: "Cancelled",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roundId: string }> },
) {
  const { roundId: raw } = await params;

  if (!contracts.gacha || !contracts.randomnessSender) {
    return NextResponse.json({ reason: "not-configured" }, { status: 503 });
  }

  const gacha = contracts.gacha;
  const randomness = contracts.randomnessSender;
  const client = publicClient();

  let roundId = Number(raw);

  // "latest" resolves to the newest round that has actually been revealed, so
  // the page opens on something worth reading rather than an empty form. The
  // newest round overall is usually still open and has nothing to prove yet.
  if (raw === "latest") {
    try {
      const next = (await client.readContract({
        address: gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName: "nextRoundId",
      })) as bigint;

      roundId = 0;
      for (let id = Number(next) - 1; id >= 1 && id > Number(next) - 40; id -= 1) {
        const p = (await client.readContract({
          address: randomness,
          abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
          functionName: "pending",
          args: [BigInt(id)],
        })) as readonly [`0x${string}`, bigint, bigint, boolean, boolean];
        if (p[3]) {
          roundId = id;
          break;
        }
      }
      if (roundId === 0) {
        return NextResponse.json({
          roundId: 0,
          state: "None",
          available: false,
          reason: "No round has been revealed yet.",
          checks: [],
          values: {},
        } satisfies RoundProof);
      }
    } catch {
      return NextResponse.json({ reason: "chain-unavailable" }, { status: 503 });
    }
  }

  if (!Number.isInteger(roundId) || roundId <= 0) {
    return NextResponse.json({ error: "roundId required" }, { status: 400 });
  }

  try {
    const round = (await client.readContract({
      address: gacha,
      abi: ROBACHA_GACHA_ABI,
      functionName: "getRound",
      args: [BigInt(roundId)],
    })) as { state: number; openedAt: bigint; entryCount: number; randomWord: bigint };

    const state = Number(round.state);
    const base = {
      roundId,
      state: STATE_NAME[state] ?? String(state),
      checks: [] as ProofCheck[],
      values: {} as Record<string, string | number | null>,
    };

    if (state === 0) {
      return NextResponse.json({
        ...base,
        available: false,
        reason: "That round does not exist yet.",
      } satisfies RoundProof);
    }

    // Nothing to prove until the number has actually been revealed.
    const p = (await client.readContract({
      address: randomness,
      abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
      functionName: "pending",
      args: [BigInt(roundId)],
    })) as readonly [`0x${string}`, bigint, bigint, boolean, boolean];

    const [requestId, commitmentIndex, requestedAt, revealed, missed] = p;

    if (!revealed) {
      return NextResponse.json({
        ...base,
        available: false,
        reason: missed
          ? "The reveal was missed for this round, so it was cancelled and refunded. There is no number to check."
          : "This round has not been revealed yet. Come back once it settles.",
      } satisfies RoundProof);
    }

    const commitment = (await client.readContract({
      address: randomness,
      abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
      functionName: "commitments",
      args: [commitmentIndex],
    })) as readonly [`0x${string}`, bigint, boolean];

    const [commitHash, postedAt] = commitment;
    const openedAt = Number(round.openedAt);

    // ---- 1. Sealed before the round opened ----
    const sealedFirst = Number(postedAt) < openedAt;
    base.checks.push({
      id: "sealed-first",
      label: "The number was sealed before the round opened",
      passed: sealedFirst,
      detail: sealedFirst
        ? `Sealed at ${new Date(Number(postedAt) * 1000).toISOString()}, ${openedAt - Number(postedAt)}s before the round opened. Nobody had entered yet.`
        : `Commitment timestamp ${postedAt} is not earlier than the round's ${openedAt}.`,
    });

    // ---- The secret, taken from the reveal transaction's own calldata ----
    const logs = await client.getLogs({
      address: randomness,
      event: REVEALED,
      args: { roundId: BigInt(roundId) },
      fromBlock: 0n,
      toBlock: "latest",
    });

    const log = logs[0];
    const emittedWord = log ? ((log.args as { randomWord?: bigint }).randomWord ?? null) : null;

    let secret: `0x${string}` | null = null;
    if (log?.transactionHash) {
      try {
        const tx = await client.getTransaction({ hash: log.transactionHash });
        const decoded = decodeFunctionData({
          abi: ROBACHA_COMMIT_REVEAL_RANDOMNESS_ABI,
          data: tx.input,
        });
        if (decoded.functionName === "reveal" && Array.isArray(decoded.args)) {
          secret = decoded.args[1] as `0x${string}`;
        }
      } catch {
        /* leave the check unknown rather than claiming it passed */
      }
    }

    // ---- 2. The secret matches what was sealed ----
    const secretMatches = secret ? keccak256(secret) === commitHash : null;
    base.checks.push({
      id: "secret-matches",
      label: "The revealed secret is the one that was sealed",
      passed: secretMatches,
      detail:
        secret === null
          ? "Could not read the secret from the reveal transaction, so this step is unchecked."
          : secretMatches
            ? "keccak256(secret) equals the commitment posted earlier."
            : "keccak256(secret) does not equal the commitment. This should be impossible on chain.",
    });

    // ---- 3. Entrants are folded into the seed ----
    const scanned = Math.min(Number(round.entryCount), MAX_ENTRY_SCAN);
    let entropy: `0x${string}` =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    for (let i = 0; i < scanned; i += 1) {
      const entry = (await client.readContract({
        address: gacha,
        abi: ROBACHA_GACHA_ABI,
        functionName: "getEntry",
        args: [BigInt(roundId), BigInt(i)],
      })) as { user: Address };
      entropy = keccak256(
        encodeAbiParameters(
          [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }],
          [entropy, BigInt(i), entry.user],
        ),
      );
    }
    base.checks.push({
      id: "entrant-entropy",
      label: "Everyone who entered is mixed into the result",
      passed: scanned > 0,
      detail:
        scanned > 0
          ? `${scanned} ${scanned === 1 ? "entrant is" : "entrants are"} folded into the seed, so the secret alone does not decide the outcome.`
          : "This round had no entries.",
    });

    // ---- 4. The number recomputes ----
    let recomputed: bigint | null = null;
    if (secret) {
      recomputed = BigInt(
        keccak256(
          encodeAbiParameters(
            [
              { type: "bytes32" },
              { type: "uint256" },
              { type: "address" },
              { type: "uint256" },
              { type: "bytes32" },
            ],
            [secret, BigInt(chainConfig.id), randomness, BigInt(roundId), entropy],
          ),
        ),
      );
    }

    const matches =
      recomputed !== null && emittedWord !== null ? recomputed === emittedWord : null;
    base.checks.push({
      id: "number-recomputes",
      label: "The winning number recomputes from those inputs",
      passed: matches,
      detail:
        matches === null
          ? "Not enough published data to recompute the number independently."
          : matches
            ? "Recomputing keccak256(secret, chain id, contract, round, entrants) reproduces the number the contract used, exactly."
            : "The recomputed number does not match the one the contract used.",
    });

    base.values = {
      commitment: commitHash,
      commitmentIndex: Number(commitmentIndex),
      commitmentPostedAt: Number(postedAt),
      roundOpenedAt: openedAt,
      requestedAt: Number(requestedAt),
      requestId,
      secret,
      entrantEntropy: entropy,
      entrantsFolded: scanned,
      randomWordOnChain: emittedWord !== null ? emittedWord.toString() : null,
      randomWordRecomputed: recomputed !== null ? recomputed.toString() : null,
      revealTx: log?.transactionHash ?? null,
      chainId: chainConfig.id,
      randomnessContract: randomness,
    };

    return NextResponse.json(
      { ...base, available: true } satisfies RoundProof,
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        reason: "chain-unavailable",
        error: error instanceof Error ? error.message : "chain read failed",
      },
      { status: 503 },
    );
  }
}
