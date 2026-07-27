#!/usr/bin/env node
/**
 * Prepares the two keeper secret values for the hosting dashboard.
 *
 * Run this yourself and paste the output into Vercel. Nothing is transmitted,
 * nothing is written back to disk, and the values never leave your machine.
 * Do not paste them into a chat, a commit, or a log.
 *
 * Why this exists: commitment secrets used to be written to
 * `keeper-secrets.json`. That cannot work on a serverless host — the
 * filesystem is read-only, every invocation is a fresh container, and the file
 * is untracked so it is not even deployed. Worse, the write happened after the
 * commitments were already posted on chain, so a failure there posted
 * commitments whose secrets were gone forever.
 *
 * Secrets are now DERIVED: secret(i) = keccak256(seed, i). Nothing to store.
 * The 50 commitments posted under the old scheme were random, so they cannot
 * be derived and must be carried across explicitly until the queue consumes
 * them.
 *
 *   node scripts/keeper-secrets-migrate.mjs
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const seed = "0x" + randomBytes(32).toString("hex");

console.log("");
console.log("=".repeat(72));
console.log("  Set these in Vercel → Settings → Environment Variables");
console.log("  Never commit them. Never paste them into a chat.");
console.log("=".repeat(72));
console.log("");
console.log("KEEPER_COMMITMENT_SEED");
console.log(seed);
console.log("");
console.log("  ^ Every future commitment secret is derived from this. Losing it");
console.log("    means losing the ability to reveal every commitment posted after");
console.log("    now, so keep a copy somewhere safe as well as in Vercel.");
console.log("");

const legacyPath = join(process.cwd(), "keeper-secrets.json");
if (!existsSync(legacyPath)) {
  console.log("No keeper-secrets.json found — nothing to migrate.");
  console.log("If commitments were already posted from another machine, run this there.");
  console.log("");
  process.exit(0);
}

const legacy = JSON.parse(readFileSync(legacyPath, "utf8"));
const indices = Object.keys(legacy)
  .map(Number)
  .sort((a, b) => a - b);

console.log("KEEPER_LEGACY_SECRETS");
console.log(JSON.stringify(legacy));
console.log("");
console.log(
  `  ^ ${indices.length} secrets for commitment indices ${indices[0]}..${indices[indices.length - 1]}.`,
);
console.log("    These were posted before derivation existed and cannot be");
console.log("    recomputed. The commitment queue is first-in-first-out, so they");
console.log("    are consumed before any derived ones — the keeper cannot reveal");
console.log("    a single round without them.");
console.log("");
console.log("    Once nextUnused passes " + (indices[indices.length - 1] + 1) + ", this variable can be deleted.");
console.log("");
