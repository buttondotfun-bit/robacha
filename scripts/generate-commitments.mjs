import { writeFileSync, readFileSync } from "node:fs";
import { keccak256, encodeAbiParameters } from "viem";
import { generatePrivateKey } from "viem/accounts";

const SECRETS_FILE = "./keeper-secrets.json";

let secrets = {};
try {
  secrets = JSON.parse(readFileSync(SECRETS_FILE, "utf8"));
} catch (e) {
  // Ignore
}

const startIndex = parseInt(process.argv[2] || "0", 10);
const count = 50;

const hashes = [];
for (let i = 0; i < count; i++) {
  const index = startIndex + i;
  const secret = generatePrivateKey();
  secrets[index.toString()] = secret;
  const hash = keccak256(encodeAbiParameters([{ type: 'bytes32' }], [secret]));
  hashes.push(hash);
}

writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
console.log(JSON.stringify(hashes));
