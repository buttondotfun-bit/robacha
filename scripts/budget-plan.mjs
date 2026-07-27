#!/usr/bin/env node
/**
 * What a fixed budget actually supports.
 *
 * The dominant cost is cross-chain randomness, and it is charged per ROUND, not
 * per entry. That single fact drives everything: a round with one entry costs
 * the same to settle as a round with twenty-five. Any plan that ignores it will
 * burn the budget on randomness before rewards ever matter.
 *
 *   node scripts/budget-plan.mjs [budgetUsd]
 */
import { createPublicClient, http, formatEther, formatUnits, parseEther } from "viem";

const RPC = process.env.ROBINHOOD_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com";
const SENDER = process.env.ROBACHA_RANDOMNESS_SENDER;
const VAULT = process.env.ROBACHA_REWARD_VAULT;
const APP = process.env.ROBACHA_APP_URL ?? "http://localhost:3000";
const CASHCAT = "0x020bfC650A365f8BB26819deAAbF3E21291018b4";

const BUDGET = Number(process.argv[2] ?? 50);
/** Share of the base price returned as expected reward value. */
const PAYOUT = Number(process.env.TARGET_PAYOUT ?? 0.75);

const client = createPublicClient({ transport: http(RPC) });
const usd = (n) => `$${n.toFixed(2)}`;

const eth = Number((await (await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot")).json()).data.amount);
const feeWei = await client.readContract({
  address: SENDER,
  abi: [{ type: "function", name: "estimateRequestFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
  functionName: "estimateRequestFee",
});
const feeUsd = Number(formatEther(feeWei)) * eth;

const market = await (await fetch(`${APP}/api/tokens?addresses=${CASHCAT}`)).json();
const cashcat = market.tokens[0].price;

const floatWei = await client.getBalance({ address: SENDER });
const floatUsd = Number(formatEther(floatWei)) * eth;

const vaultBal = await client.readContract({
  address: CASHCAT,
  abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }],
  functionName: "balanceOf", args: [VAULT],
});
const invUsd = Number(formatUnits(vaultBal, 18)) * cashcat;

console.log(`\n=== Budget plan: ${usd(BUDGET)}`);
console.log(`ETH $${eth.toFixed(2)}   CASHCAT $${cashcat}   CCIP $${feeUsd.toFixed(2)} per ROUND`);
console.log(`Already on hand: float ${usd(floatUsd)}  •  vault inventory ${usd(invUsd)}\n`);

console.log("The structural problem — randomness is a per-round cost:");
for (const n of [1, 2, 3, 5, 10, 25]) {
  console.log(`   ${String(n).padStart(2)} entries/round -> ${usd(feeUsd / n).padStart(7)} per entry`);
}
console.log("  A one-entry round costs the same to settle as a full one.\n");

// Candidate base prices. The surcharge is set to break even at `target` entries.
const scenarios = [
  { label: "current v1 price", baseEth: 0.0005, breakEvenAt: 3 },
  { label: "half price",       baseEth: 0.00025, breakEvenAt: 3 },
  { label: "quarter price",    baseEth: 0.000125, breakEvenAt: 3 },
];

console.log("Scenarios — surcharge sized to break even at 3 entries/round:\n");
console.log("  price        base    surcharge   total    reward EV   inv/spin   spins from budget");
console.log("  " + "-".repeat(88));

const results = [];
for (const s of scenarios) {
  const baseUsd = s.baseEth * eth;
  const surchargeUsd = feeUsd / s.breakEvenAt;
  const surchargeEth = surchargeUsd / eth;
  const totalUsd = baseUsd + surchargeUsd;
  const rewardUsd = baseUsd * PAYOUT;

  // Split the budget: enough float to settle the rounds those spins produce,
  // the remainder into inventory.
  const perSpinFloat = feeUsd / s.breakEvenAt;      // float burn per entry at target fill
  const perSpinTotal = perSpinFloat + rewardUsd;    // what each spin costs us to serve
  const spins = Math.floor((BUDGET + floatUsd + invUsd) / perSpinTotal);
  const floatNeed = (spins * perSpinFloat) - floatUsd;
  const invNeed = (spins * rewardUsd) - invUsd;

  results.push({ ...s, baseUsd, surchargeEth, surchargeUsd, totalUsd, rewardUsd, spins, floatNeed, invNeed });
  console.log(
    `  ${s.label.padEnd(16)} ${usd(baseUsd).padStart(6)} ${usd(surchargeUsd).padStart(9)} ${usd(totalUsd).padStart(8)} ` +
    `${usd(rewardUsd).padStart(10)} ${usd(rewardUsd).padStart(10)} ${String(spins).padStart(10)}`
  );
}

console.log("\nRevenue check — does it sustain itself once running?");
for (const r of results) {
  // Reward reserve is 85% of base; it refills inventory through the AutoBuyer.
  const reserve = r.baseUsd * 0.85;
  const net = reserve - r.rewardUsd;
  const surchargeNet = r.surchargeUsd - (feeUsd / r.breakEvenAt);
  console.log(
    `  ${r.label.padEnd(16)} reserve in ${usd(reserve)} vs rewards out ${usd(r.rewardUsd)} ` +
    `-> ${net >= 0 ? "+" : ""}${usd(net)}/spin   surcharge net ${surchargeNet >= 0 ? "+" : ""}${usd(surchargeNet)}/spin`
  );
}

const pick = results[0];
console.log(`\n--- Recommended split of ${usd(BUDGET)} (${pick.label}, payout ${(PAYOUT * 100).toFixed(0)}%) ---`);
const floatShare = Math.min(BUDGET * 0.5, Math.max(0, pick.floatNeed));
const invShare = BUDGET - floatShare;
console.log(`  CCIP float top-up : ${usd(floatShare)}  = ${(floatShare / eth).toFixed(5)} ETH  -> ~${Math.floor((floatUsd + floatShare) / feeUsd)} rounds`);
console.log(`  Reward inventory  : ${usd(invShare)}  = ${(invShare / cashcat).toFixed(0)} CASHCAT`);
console.log(`  Runway            : ~${Math.floor((invUsd + invShare) / pick.rewardUsd)} spins of rewards`);
console.log(`  Surcharge for v2  : ${pick.surchargeEth.toFixed(6)} ETH  (${usd(pick.surchargeUsd)})\n`);
