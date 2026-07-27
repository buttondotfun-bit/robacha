#!/usr/bin/env node
/**
 * Live round and keeper status.
 *
 * Exists because decoding `getRound` with shell tools kept going wrong: cast
 * annotates large numbers as `1785195466 [1.785e9]`, and splitting that on
 * commas or spaces silently shifts every field after it. Reading `state` from
 * the wrong offset turns "Closed, waiting on randomness" into "Open, still
 * filling", which is the opposite diagnosis. Decode through the ABI instead.
 *
 *   node scripts/round-status.mjs
 */
import { createPublicClient, http, formatEther } from "viem";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const RPC = env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const GACHA = env.ROBACHA_GACHA;
const CR = env.NEXT_PUBLIC_ROBACHA_RANDOMNESS_SENDER_ADDRESS || env.ROBACHA_RANDOMNESS_SENDER;
const KEEPER = "0x86C9DD84fd3b51f5f26c17C0713B92833Ddb46D8";

const STATE = [
  "None", "Open", "Closed", "RandomnessRequested", "CrossChainPending",
  "VRFPending", "ResultReturning", "RandomnessReceived", "Settled",
  "Failed", "Refundable", "Cancelled",
];

const roundOut = [
  "poolId", "version", "openedAt", "closesAt", "closedAt", "randomnessRequestedAt",
  "state", "entryCount", "settledCount", "refundedCount", "baseSpinPriceWei",
  "randomnessSurchargeWei", "requestId", "randomWord", "escrowWei",
].map((name, i) => ({
  name,
  type: [
    "uint256","uint256","uint64","uint64","uint64","uint64","uint8","uint16",
    "uint16","uint16","uint256","uint256","bytes32","uint256","uint256",
  ][i],
}));

const gachaAbi = [
  { type: "function", name: "nextRoundId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "randomnessTimeout", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "getRound", stateMutability: "view", inputs: [{ type: "uint256" }],
    outputs: [{ type: "tuple", components: roundOut }] },
];
const crAbi = [
  { type: "function", name: "nextUnused", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "availableCommitments", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalRevealed", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalMissed", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "revealWindow", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "bond", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
];

const client = createPublicClient({ transport: http(RPC) });
const now = Math.floor(Date.now() / 1000);

const [nextRoundId, timeout, nonce, keeperBal] = await Promise.all([
  client.readContract({ address: GACHA, abi: gachaAbi, functionName: "nextRoundId" }),
  client.readContract({ address: GACHA, abi: gachaAbi, functionName: "randomnessTimeout" }),
  client.getTransactionCount({ address: KEEPER }),
  client.getBalance({ address: KEEPER }),
]);

const [nextUnused, available, revealed, missed, revealWindow, bond] = await Promise.all(
  ["nextUnused", "availableCommitments", "totalRevealed", "totalMissed", "revealWindow", "bond"].map((fn) =>
    client.readContract({ address: CR, abi: crAbi, functionName: fn }),
  ),
);

console.log(`\nkeeper   nonce ${nonce}   balance ${formatEther(keeperBal)} ETH`);
console.log(
  `randomness  nextUnused ${nextUnused}  available ${available}  revealed ${revealed}  missed ${missed}  ` +
  `revealWindow ${Number(revealWindow) / 60}m  bond ${formatEther(bond)} ETH`,
);
console.log("");

const mins = (s) => `${Math.round(s / 60)}m`;

for (let id = 1n; id < nextRoundId; id += 1n) {
  const r = await client.readContract({ address: GACHA, abi: gachaAbi, functionName: "getRound", args: [id] });
  const state = STATE[Number(r.state)] ?? r.state;
  if (state === "None") continue;

  const bits = [
    `r${id}`.padEnd(4),
    `v${r.version}`,
    state.padEnd(20),
    `${r.entryCount} entries`,
    `${r.settledCount} settled`,
    `escrow ${formatEther(r.escrowWei)}`,
  ];

  // What is this round waiting on, and what is the deadline that matters?
  let waiting = "";
  if (state === "Open") {
    const left = Number(r.closesAt) - now;
    waiting = left > 0 ? `closes in ${mins(left)}` : "window elapsed — needs closeRound";
  } else if (state === "Closed") {
    waiting = "needs requestRoundRandomness";
  } else if (state.includes("Pending") || state === "RandomnessRequested") {
    const left = Number(r.closedAt) + Number(timeout) - now;
    waiting = `needs reveal — refundable in ${mins(left)}`;
  } else if (state === "RandomnessReceived") {
    waiting = "needs settleEntries";
  }

  console.log("  " + bits.join("  ") + (waiting ? `  <- ${waiting}` : ""));
}
console.log("");
