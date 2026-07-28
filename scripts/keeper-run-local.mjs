#!/usr/bin/env node
/**
 * Runs the keeper once, from your machine, using .env.local.
 *
 * Same logic as /api/keeper — request randomness for closed rounds, reveal
 * them, settle them — but driven locally so a broken deployment or scheduler
 * cannot leave paid rounds sitting. It is also the cleanest way to tell those
 * two failures apart: if this works and the hosted keeper does not, the logic
 * is fine and the problem is plumbing.
 *
 * Needs KEEPER_PRIVATE_KEY in .env.local (gitignored). The key is read from
 * that file and used to sign locally; it is never printed or transmitted.
 *
 *   node scripts/keeper-run-local.mjs           # act
 *   node scripts/keeper-run-local.mjs --dry     # report only
 */
import { readFileSync } from "node:fs";
import {
  createPublicClient, createWalletClient, http, keccak256, encodeAbiParameters, formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const DRY = process.argv.includes("--dry");

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const RPC = env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const GACHA = env.ROBACHA_GACHA;
const CR = env.NEXT_PUBLIC_ROBACHA_RANDOMNESS_SENDER_ADDRESS || env.ROBACHA_RANDOMNESS_SENDER;

if (!env.KEEPER_PRIVATE_KEY && !DRY) {
  console.error("\nKEEPER_PRIVATE_KEY is not in .env.local.");
  console.error("Add it there (the file is gitignored) and run again, or use --dry to just look.\n");
  process.exit(1);
}

/** Same derivation the hosted keeper uses; legacy indices come from the map. */
function secretFor(index) {
  if (env.KEEPER_LEGACY_SECRETS) {
    try {
      const map = JSON.parse(env.KEEPER_LEGACY_SECRETS);
      if (map[String(index)]) return map[String(index)];
    } catch { /* fall through to derivation */ }
  }
  if (!env.KEEPER_COMMITMENT_SEED) return null;
  return keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [env.KEEPER_COMMITMENT_SEED, BigInt(index)]),
  );
}

const STATE = ["None","Open","Closed","RandomnessRequested","CrossChainPending","VRFPending",
  "ResultReturning","RandomnessReceived","Settled","Failed","Refundable","Cancelled"];

const roundComponents = [
  ["poolId","uint256"],["version","uint256"],["openedAt","uint64"],["closesAt","uint64"],
  ["closedAt","uint64"],["randomnessRequestedAt","uint64"],["state","uint8"],["entryCount","uint16"],
  ["settledCount","uint16"],["refundedCount","uint16"],["baseSpinPriceWei","uint256"],
  ["randomnessSurchargeWei","uint256"],["requestId","bytes32"],["randomWord","uint256"],["escrowWei","uint256"],
].map(([name, type]) => ({ name, type }));

const gachaAbi = [
  { type:"function", name:"nextRoundId", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}] },
  { type:"function", name:"getRound", stateMutability:"view", inputs:[{type:"uint256"}],
    outputs:[{ type:"tuple", components: roundComponents }] },
  { type:"function", name:"closeRound", stateMutability:"nonpayable", inputs:[{type:"uint256"}], outputs:[] },
  { type:"function", name:"requestRoundRandomness", stateMutability:"nonpayable", inputs:[{type:"uint256"}], outputs:[] },
  { type:"function", name:"settleEntries", stateMutability:"nonpayable", inputs:[{type:"uint256"},{type:"uint16"}], outputs:[] },
];
const crAbi = [
  { type:"function", name:"pending", stateMutability:"view", inputs:[{type:"uint256"}],
    outputs:[{type:"bytes32"},{type:"uint256"},{type:"uint64"},{type:"bool"},{type:"bool"}] },
  { type:"function", name:"reveal", stateMutability:"nonpayable", inputs:[{type:"uint256"},{type:"bytes32"}], outputs:[] },
];

const client = createPublicClient({ transport: http(RPC) });
const account = env.KEEPER_PRIVATE_KEY ? privateKeyToAccount(env.KEEPER_PRIVATE_KEY) : null;
const wallet = account ? createWalletClient({ account, transport: http(RPC) }) : null;

if (account) {
  console.log(`\nsigner ${account.address}  balance ${formatEther(await client.getBalance({ address: account.address }))} ETH`);
}
console.log(DRY ? "DRY RUN — nothing will be sent\n" : "");

/** Simulate first; a call that would revert is reported, not sent. */
async function send(label, params) {
  try {
    const { request } = await client.simulateContract({ ...params, account: account ?? undefined });
    if (DRY) { console.log(`  ${label}: would succeed`); return true; }
    const hash = await wallet.writeContract(request);
    await client.waitForTransactionReceipt({ hash });
    console.log(`  ${label}: sent ${hash}`);
    return true;
  } catch (e) {
    console.log(`  ${label}: skipped — ${String(e.message).split("\n")[0].slice(0, 110)}`);
    return false;
  }
}

const nextRoundId = await client.readContract({ address: GACHA, abi: gachaAbi, functionName: "nextRoundId" });
const now = Math.floor(Date.now() / 1000);

for (let id = 1n; id < nextRoundId; id += 1n) {
  const r = await client.readContract({ address: GACHA, abi: gachaAbi, functionName: "getRound", args: [id] });
  const state = STATE[Number(r.state)];
  if (["None","Settled","Refundable","Cancelled","Failed"].includes(state)) continue;

  console.log(`round ${id} (${state}, ${r.entryCount} entries)`);

  if (state === "Open" && now >= Number(r.closesAt) && r.entryCount > 0) {
    await send("closeRound", { address: GACHA, abi: gachaAbi, functionName: "closeRound", args: [id] });
    continue;
  }

  if (state === "Closed" && r.entryCount > 0) {
    await send("requestRoundRandomness", { address: GACHA, abi: gachaAbi, functionName: "requestRoundRandomness", args: [id] });
    // The reveal needs the commitment index, which only exists after the
    // request lands, so it happens on the next pass rather than here.
    continue;
  }

  if (["RandomnessRequested","CrossChainPending","VRFPending","ResultReturning"].includes(state)) {
    const p = await client.readContract({ address: CR, abi: crAbi, functionName: "pending", args: [id] });
    const [, commitmentIndex, , revealed] = p;
    if (revealed) { console.log("  already revealed, waiting on settlement"); continue; }
    const secret = secretFor(Number(commitmentIndex));
    if (!secret) { console.log(`  no secret available for commitment ${commitmentIndex}`); continue; }
    await send("reveal", { address: CR, abi: crAbi, functionName: "reveal", args: [id, secret] });
    continue;
  }

  if (state === "RandomnessReceived") {
    await send("settleEntries", { address: GACHA, abi: gachaAbi, functionName: "settleEntries", args: [id, 25] });
  }
}

console.log("\nRun again to carry each round to its next step.\n");
