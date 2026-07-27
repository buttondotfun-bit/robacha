#!/usr/bin/env node
/**
 * Regenerates lib/abi/* from the Foundry build output.
 *
 * Run after any contract change: `npm run abi:export`. The frontend imports
 * only from lib/abi, so an ABI can never drift from the deployed bytecode
 * without this file changing too.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TARGETS = {
  RobachaGacha: "robacha-gacha",
  RobachaPoolRegistry: "robacha-pool-registry",
  RobachaRewardVault: "robacha-reward-vault",
  RobachaFeeRouter: "robacha-fee-router",
  RobachaRandomnessSender: "robacha-randomness-sender",
  RobachaSponsorRegistry: "robacha-sponsor-registry",
  RobachaCommitRevealRandomness: "robacha-commit-reveal-randomness",
};

mkdirSync("lib/abi", { recursive: true });
const exports = [];

for (const [contract, slug] of Object.entries(TARGETS)) {
  const path = join("contracts/out", `${contract}.sol`, `${contract}.json`);
  const { abi } = JSON.parse(readFileSync(path, "utf8"));
  const name = `${slug.toUpperCase().replaceAll("-", "_")}_ABI`;
  writeFileSync(
    join("lib/abi", `${slug}.ts`),
    `// Generated from contracts/out — do not edit by hand.\n` +
      `// Regenerate with: npm run abi:export\n\n` +
      `export const ${name} = ${JSON.stringify(abi, null, 2)} as const;\n`,
  );
  exports.push([name, slug]);
  console.log(`lib/abi/${slug}.ts (${abi.length} entries)`);
}

exports.sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync(
  "lib/abi/index.ts",
  `// Generated from contracts/out — do not edit by hand.\n\n` +
    exports.map(([name, slug]) => `export { ${name} } from "./${slug}";\n`).join(""),
);
