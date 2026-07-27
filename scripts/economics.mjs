#!/usr/bin/env node
/**
 * Pool economics model.
 *
 * Reads the live pool from chain, live token prices from the running app's
 * market route, and the live CCIP fee from the randomness sender, then reports
 * expected payout, margin and inventory runway.
 *
 * Nothing here is assumed: every input is fetched. Run it before changing a
 * pool's price, surcharge or reward amounts.
 *
 *   node scripts/economics.mjs [entriesPerRound]
 */
import { createPublicClient, http, formatEther, formatUnits } from "viem";

const RPC = process.env.ROBINHOOD_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com";
const REGISTRY = process.env.ROBACHA_POOL_REGISTRY;
const SENDER = process.env.ROBACHA_RANDOMNESS_SENDER;
const VAULT = process.env.ROBACHA_REWARD_VAULT;
const POOL_ID = BigInt(process.env.ROBACHA_POOL_ID ?? "1");
const APP = process.env.ROBACHA_APP_URL ?? "http://localhost:3000";

if (!REGISTRY || !SENDER || !VAULT) {
  console.error("Set ROBACHA_POOL_REGISTRY, ROBACHA_RANDOMNESS_SENDER and ROBACHA_REWARD_VAULT.");
  process.exit(1);
}

const client = createPublicClient({ transport: http(RPC) });

const registryAbi = [
  { type: "function", name: "currentPoolVersion", stateMutability: "view",
    inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }, { type: "bool" }] },
  { type: "function", name: "getVersion", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "uint256" }],
    outputs: [{ type: "tuple", components: [
      { name: "poolId", type: "uint256" }, { name: "version", type: "uint256" },
      { name: "name", type: "string" }, { name: "baseSpinPriceWei", type: "uint256" },
      { name: "randomnessSurchargeWei", type: "uint256" },
      { name: "protocolFeeBps", type: "uint16" }, { name: "operationsFeeBps", type: "uint16" },
      { name: "rewardReserveBps", type: "uint16" }, { name: "maxEntriesPerRound", type: "uint16" },
      { name: "roundDuration", type: "uint32" }, { name: "maxQuantityPerTx", type: "uint16" },
      { name: "maxQuantityPerWallet", type: "uint16" }, { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" }, { name: "active", type: "bool" },
      { name: "closed", type: "bool" }, { name: "lockedAt", type: "uint64" },
      { name: "configured", type: "bool" }] }] },
  { type: "function", name: "getProbabilities", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "uint256" }], outputs: [{ type: "uint16[]" }] },
  { type: "function", name: "getRewards", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "uint256" }],
    outputs: [{ type: "tuple[]", components: [
      { name: "token", type: "address" }, { name: "tierIndex", type: "uint8" },
      { name: "minAmount", type: "uint256" }, { name: "maxAmount", type: "uint256" }] }] },
];
const senderAbi = [{ type: "function", name: "estimateRequestFee", stateMutability: "view",
  inputs: [], outputs: [{ type: "uint256" }] }];
const erc20Abi = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
];

const usd = (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

async function ethUsd() {
  const r = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
  return Number((await r.json()).data.amount);
}

async function tokenPrices(addresses) {
  const r = await fetch(`${APP}/api/tokens?addresses=${addresses.join(",")}`);
  const body = await r.json();
  const map = new Map();
  for (const t of body.tokens) map.set(t.address.toLowerCase(), t);
  return map;
}

const [version] = await client.readContract({
  address: REGISTRY, abi: registryAbi, functionName: "currentPoolVersion", args: [POOL_ID] });
if (version === 0n) { console.error("No active pool."); process.exit(1); }

const [pv, probs, slots, feeWei, eth] = await Promise.all([
  client.readContract({ address: REGISTRY, abi: registryAbi, functionName: "getVersion", args: [POOL_ID, version] }),
  client.readContract({ address: REGISTRY, abi: registryAbi, functionName: "getProbabilities", args: [POOL_ID, version] }),
  client.readContract({ address: REGISTRY, abi: registryAbi, functionName: "getRewards", args: [POOL_ID, version] }),
  client.readContract({ address: SENDER, abi: senderAbi, functionName: "estimateRequestFee" }),
  ethUsd(),
]);

const tokens = [...new Set(slots.map((s) => s.token.toLowerCase()))];
const prices = await tokenPrices(tokens);

const meta = new Map();
for (const t of tokens) {
  const [decimals, symbol, vaultBal] = await Promise.all([
    client.readContract({ address: t, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: t, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [VAULT] }),
  ]);
  meta.set(t, { decimals, symbol, vaultBal, price: prices.get(t)?.price ?? null });
}

const baseUsd = Number(formatEther(pv.baseSpinPriceWei)) * eth;
const surchargeUsd = Number(formatEther(pv.randomnessSurchargeWei)) * eth;
const feeUsd = Number(formatEther(feeWei)) * eth;

// Expected value: pick a tier by its published probability, then a slot
// uniformly within that tier, then an amount uniformly in the slot's range.
let ev = 0;
const rows = [];
probs.forEach((bps, tier) => {
  const tierSlots = slots.filter((s) => s.tierIndex === tier);
  if (!tierSlots.length) return;
  const pTier = bps / 10_000;
  for (const s of tierSlots) {
    const m = meta.get(s.token.toLowerCase());
    const avg = (Number(formatUnits(s.minAmount, m.decimals)) + Number(formatUnits(s.maxAmount, m.decimals))) / 2;
    const value = m.price === null ? null : avg * m.price;
    const contribution = value === null ? 0 : (pTier / tierSlots.length) * value;
    ev += contribution;
    rows.push({ tier, symbol: m.symbol, pct: (pTier / tierSlots.length) * 100, avg,
                value, contribution, priced: m.price !== null });
  }
});

const N = Number(process.argv[2] ?? pv.maxEntriesPerRound);

console.log(`\n=== ${pv.name}  (pool ${pv.poolId} v${pv.version})`);
console.log(`ETH $${eth.toFixed(2)}   CCIP fee/round ${formatEther(feeWei)} ETH (${usd(feeUsd)})`);
console.log(`lockedAt ${pv.lockedAt}  ${pv.lockedAt === 0n ? "(economics still editable)" : "(LOCKED)"}\n`);

console.log("Per entry:");
console.log(`  base price        ${formatEther(pv.baseSpinPriceWei)} ETH   ${usd(baseUsd)}`);
console.log(`  surcharge         ${formatEther(pv.randomnessSurchargeWei)} ETH   ${usd(surchargeUsd)}`);
console.log(`  total paid        ${formatEther(pv.baseSpinPriceWei + pv.randomnessSurchargeWei)} ETH   ${usd(baseUsd + surchargeUsd)}\n`);

console.log("Reward slots:");
for (const r of rows) {
  const v = r.priced ? usd(r.value) : "unpriced";
  console.log(`  tier ${r.tier}  ${String(r.pct.toFixed(2)).padStart(6)}%  avg ${r.avg.toLocaleString()} ${r.symbol.padEnd(8)} = ${v.padStart(11)}  -> EV ${usd(r.contribution)}`);
}

const payoutRatio = (ev / baseUsd) * 100;
console.log(`\nExpected reward value : ${usd(ev)} per spin`);
console.log(`Payout ratio          : ${payoutRatio.toFixed(2)}% of base price   (industry-sane target 70-80%)`);

console.log(`\nAt ${N} entries per round:`);
const randPerEntry = feeUsd / N;
const surplus = surchargeUsd - randPerEntry;
console.log(`  randomness / entry  ${usd(randPerEntry)}   surcharge covers it: ${surplus >= 0 ? "yes" : "NO, short " + usd(-surplus)}`);
console.log(`  protocol  (12%)     ${usd(baseUsd * pv.protocolFeeBps / 10_000)}`);
console.log(`  operations (3%)     ${usd(baseUsd * pv.operationsFeeBps / 10_000)}`);
console.log(`  reward reserve(85%) ${usd(baseUsd * pv.rewardReserveBps / 10_000)}`);
console.log(`  reward paid out     ${usd(ev)}`);
const net = baseUsd + surchargeUsd - ev - randPerEntry;
console.log(`  NET per entry       ${usd(net)}   (${((net / (baseUsd + surchargeUsd)) * 100).toFixed(1)}% of what the user paid)`);

const breakeven = feeUsd / surchargeUsd;
console.log(`\nRandomness break-even : ${breakeven.toFixed(2)} entries per round`);

console.log("\nInventory:");
let invUsd = 0;
for (const [addr, m] of meta) {
  const bal = Number(formatUnits(m.vaultBal, m.decimals));
  const v = m.price === null ? null : bal * m.price;
  if (v !== null) invUsd += v;
  console.log(`  ${m.symbol.padEnd(9)} ${bal.toLocaleString().padStart(14)}  ${v === null ? "unpriced" : usd(v)}`);
}
console.log(`  total               ${usd(invUsd)}`);
console.log(`  runway at current EV: ${ev > 0 ? Math.floor(invUsd / ev).toLocaleString() : "n/a"} spins`);
const target = baseUsd * 0.75;
console.log(`  runway at 75% payout: ${Math.floor(invUsd / target).toLocaleString()} spins   (would need ${usd(target)} per spin)`);
console.log(`  multiplier to reach 75% payout: ${(target / ev).toFixed(1)}x current reward amounts\n`);
