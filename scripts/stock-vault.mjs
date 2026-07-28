#!/usr/bin/env node
/**
 * Buys reward inventory for every token the pool needs, using ETH sitting in
 * the AutoBuyer.
 *
 * The keeper's own restock only ever buys the single token the registry reports
 * as first unfunded, which is right for topping up a running pool but useless
 * for standing up a new one — an empty token takes a keeper tick per slot, with
 * "no token is short" reported in between. This spends a budget across every
 * token the pool needs in one pass.
 *
 * Every swap is quoted first and floored, exactly as the keeper does. A zero
 * floor is an unprotected market buy, and `swapAndFund` will happily accept
 * one.
 *
 *   node scripts/stock-vault.mjs --dry     # quote everything, send nothing
 *   node scripts/stock-vault.mjs           # buy
 */
import { readFileSync } from "node:fs";
import {
  createPublicClient, createWalletClient, http, formatEther, formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const DRY = process.argv.includes("--dry");

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const RPC = env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const AUTO_BUYER = env.ROBACHA_AUTO_BUYER;
const VAULT = env.ROBACHA_REWARD_VAULT;
const SWAP_ROUTER = "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba";
const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
const SLIPPAGE_BPS = 300n; // 3%

/**
 * The largest pull each token can produce, across every slot it appears in.
 * Solvency needs the vault to hold at least this much, so these are the numbers
 * the budget has to cover outright — not a share of it. Keep them in step with
 * the maxAmounts in ExpandGenesisPool.s.sol.
 *
 * Only the two the AutoBuyer can actually reach are here. It hardcodes one
 * Uniswap V2 router and a [WETH, token] path, and PONS, TENDIES, 4663 and
 * BRODIE are not usefully on it — see the header of ExpandGenesisPool.s.sol.
 */
const TARGETS = [
  { symbol: "CASHCAT", address: "0x020bfC650A365f8BB26819deAAbF3E21291018b4", maxNeeded: 131n },
  { symbol: "WOOD",    address: "0xF8BC08092C06dB6148114DCf82AF881F1085f92b", maxNeeded: 110n },
];

/**
 * Skip anything already holding this multiple of its maximum. Solvency only
 * needs 1x; the headroom is so a run of legendary pulls cannot drain a token
 * mid-round. Above it, spending more buys nothing the pool needs.
 */
const STOCKED_AT = 2n;

const erc20 = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
];
const routerAbi = [
  { type: "function", name: "getAmountsOut", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "address[]" }], outputs: [{ type: "uint256[]" }] },
  // Asking "how much ETH for exactly this many tokens" is the right question
  // here. Splitting the budget by guessed weights left the most valuable slot
  // short of its own maximum, which is precisely the thing that fails solvency.
  { type: "function", name: "getAmountsIn", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "address[]" }], outputs: [{ type: "uint256[]" }] },
];
const buyerAbi = [
  { type: "function", name: "swapAndFund", stateMutability: "payable",
    inputs: [{ type: "address" }, { type: "uint24" }, { type: "uint256" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }] },
];

const client = createPublicClient({ transport: http(RPC) });
const account = env.KEEPER_PRIVATE_KEY ? privateKeyToAccount(env.KEEPER_PRIVATE_KEY) : null;
const wallet = account ? createWalletClient({ account, transport: http(RPC) }) : null;

if (!AUTO_BUYER) {
  console.error("\nROBACHA_AUTO_BUYER is not in .env.local.\n");
  process.exit(1);
}
if (!account && !DRY) {
  console.error("\nKEEPER_PRIVATE_KEY is not in .env.local. Add it, or use --dry.\n");
  process.exit(1);
}

const budget = await client.getBalance({ address: AUTO_BUYER });
console.log(`\nAutoBuyer ${AUTO_BUYER}`);
console.log(`budget ${formatEther(budget)} ETH${DRY ? "   (DRY RUN)" : ""}\n`);

if (budget === 0n) {
  console.log("Nothing to spend. Send ETH to the AutoBuyer address above, then run again.\n");
  process.exit(0);
}

// Leave a sliver behind rather than trying to spend the balance to zero.
const spendable = (budget * 97n) / 100n;

// Price every token's requirement first, so the budget is shared by need
// rather than by a guess. Depth is then whatever the budget supports evenly —
// every token ends up stocked to the same multiple of its own maximum pull,
// which is the only shape that satisfies solvency for all of them at once.
const priced = [];
for (const t of TARGETS) {
  const held = await client.readContract({
    address: t.address, abi: erc20, functionName: "balanceOf", args: [VAULT],
  });
  const need = t.maxNeeded * 10n ** 18n;
  if (held >= need * STOCKED_AT) {
    console.log(
      `  ${t.symbol.padEnd(8)} holds ${Number(formatUnits(held, 18)).toLocaleString()} ` +
      `(${(Number(held) / Number(need)).toFixed(1)}x its max pull) — already stocked, skipping`,
    );
    continue;
  }
  try {
    const amounts = await client.readContract({
      address: SWAP_ROUTER, abi: routerAbi, functionName: "getAmountsIn",
      args: [need, [WETH, t.address]],
    });
    priced.push({ ...t, need, ethForOneMax: amounts[0] });
  } catch (e) {
    console.log(`  ${t.symbol.padEnd(8)} SKIPPED — cannot price: ${String(e.message).split("\n")[0].slice(0, 70)}`);
  }
}

if (priced.length === 0) {
  console.log("\nEverything is already stocked.\n");
  process.exit(0);
}

const oneMaxTotal = priced.reduce((a, t) => a + t.ethForOneMax, 0n);
// Integer depth in hundredths, so "1.30x" rather than a float.
const depthCenti = (spendable * 100n) / oneMaxTotal;

console.log(`  one max pull of each costs ${formatEther(oneMaxTotal)} ETH`);
console.log(`  budget supports ${Number(depthCenti) / 100}x depth across all of them\n`);

if (depthCenti < 100n) {
  console.log(`  NOT ENOUGH — solvency needs at least 1.0x of every token.`);
  console.log(`  Send at least ${formatEther(oneMaxTotal - spendable)} ETH more and run again.\n`);
  process.exit(1);
}

for (const t of priced) {
  const spend = (t.ethForOneMax * depthCenti) / 100n;

  let minOut;
  try {
    const amounts = await client.readContract({
      address: SWAP_ROUTER, abi: routerAbi, functionName: "getAmountsOut",
      args: [spend, [WETH, t.address]],
    });
    const quoted = amounts[amounts.length - 1];
    if (quoted === 0n) throw new Error("router quoted zero");
    minOut = (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;
    console.log(
      `  ${t.symbol.padEnd(8)} ${formatEther(spend)} ETH -> ~${Number(formatUnits(quoted, 18)).toLocaleString()} ` +
      `(${(Number(quoted) / Number(t.need)).toFixed(2)}x its max pull)`,
    );
  } catch (e) {
    console.log(`  ${t.symbol.padEnd(8)} SKIPPED — no usable quote: ${String(e.message).split("\n")[0].slice(0, 70)}`);
    continue;
  }

  if (DRY) continue;

  try {
    const { request } = await client.simulateContract({
      address: AUTO_BUYER, abi: buyerAbi, functionName: "swapAndFund",
      args: [t.address, 3000, spend, minOut], account,
    });
    const hash = await wallet.writeContract(request);
    await client.waitForTransactionReceipt({ hash });
    console.log(`           sent ${hash}`);
  } catch (e) {
    console.log(`           FAILED — ${String(e.message).split("\n")[0].slice(0, 110)}`);
  }
}

console.log(DRY ? "\nDry run only. Re-run without --dry to buy.\n" : "\nDone. Check solvency with the ExpandGenesisPool dry run.\n");
