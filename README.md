# ROBACHA

**Rob the Gacha on Robinhood Chain.**

ROBACHA is the memecoin gacha built for Robinhood Chain. Spin live reward pools
and receive random tokens from trending ecosystem projects.

Every figure the interface shows — pool identity, published probabilities, spin
price, reward ranges, vault inventory, activity, balances — is read from chain
state. There is no seed data, no placeholder pool and no client-side randomness.
When a dependency cannot answer, the interface says so and disables the action
rather than showing something plausible.

> ROBACHA is an independent project built for Robinhood Chain. It is not
> affiliated with, endorsed by, or operated by Robinhood.

---

## Status

The contracts are **written, tested and rehearsed against a fork of Robinhood
Chain mainnet, but not deployed.** Until they are, the app reports itself
unavailable and the spin action stays disabled. See [DEPLOYMENT.md](DEPLOYMENT.md)
for the exact remaining steps.

| Area | State |
|---|---|
| Contracts | 9 contracts, 109 tests passing (100 unit/fuzz + 9 invariants) |
| Randomness | Chainlink CCIP → Ethereum VRF v2.5 → CCIP. No fallback source exists. |
| Deployment | Rehearsed on a mainnet fork; not broadcast |
| Frontend | Production build passing; reads contracts, fails closed |
| Indexer + database | Not built. `/api/activity` reads logs directly instead. |
| Admin app | Not built |
| Independent audit | **Not performed** |

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. No environment variables are required to run
the interface — the network defaults to Robinhood Chain mainnet and every
contract-dependent surface reports itself unavailable until an address is set.

Other commands:

```bash
npm run build
```

```bash
npm run lint
```

```bash
npm run contracts:test
```

```bash
npm run abi:export
```

---

## Architecture

```
app/                 Next.js App Router routes and API handlers
  api/health         Real dependency checks — RPC, bytecode, spin readiness
  api/activity       Confirmed contract logs over a bounded window
  api/wallet/:a/rewards   Rewards assigned to a wallet, read from the contract
components/          UI, grouped by surface
  brand/             RobachaLogo — capsule mark and drawn wordmark
lib/
  abi/               Generated from contracts/out; never hand-edited
  config.ts          Client-safe configuration (NEXT_PUBLIC_* only)
  env/server.ts      Server-only configuration; import fails in the browser
  use-pool.ts        The active pool, read from the registry and gacha
contracts/           Foundry project
  src/               RobachaGacha, RobachaPoolRegistry, RobachaRewardVault,
                     RobachaFeeRouter, RobachaSponsorRegistry, randomness/
  script/            Deploy, Link, TransferRoles, Verify
  test/              Unit, fuzz and invariant suites
```

### Randomness

A spin never resolves in the browser or on the operator's say-so:

```
RobachaGacha → RobachaRandomnessSender → Chainlink CCIP
    → EthereumRobachaRandomnessCoordinator → Chainlink VRF v2.5
    → CCIP → RobachaRandomnessReceiver → RobachaGacha settlement
```

One VRF word settles a whole round of up to 25 entries. Each entry's result is
derived from that word by domain-separated hashing bound to the chain id, pool,
version, round, entry index and the entrant's address. If the word never
arrives, the round becomes refundable after a timeout — an administrator cannot
supply a word, replace one, or choose a reward.

### Revenue

Base spin payments split 12% protocol / 3% operations / 85% reward reserve.
Fee changes are capped (protocol ≤ 20%, operations ≤ 5%), must total exactly
10,000 bps, and sit behind a 48-hour timelock. A pool version snapshots its
split at creation, so a fee change can never alter a pool that is already
selling spins.

The randomness surcharge is priced and displayed separately. It pays real CCIP
and VRF costs and is never counted as protocol revenue.

---

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — runbook, verified Chainlink config, measured
  gas, rollback and incident response
- [.env.example](.env.example) — every environment variable, annotated
- [contracts/config/chainlink.json](contracts/config/chainlink.json) — official
  Chainlink values with the endpoints they were read from

---

## Responsible participation

ROBACHA is a paid, chance-based token-reward product. Published probabilities,
the full fee breakdown and the exact amount to be sent are shown before a wallet
is asked to sign. Token rewards may fluctuate in value.

"Rob the Gacha" is brand language for pulling a reward from a funded, published
pool. Rewards come from inventory the operator or a sponsor has deposited in
advance; nothing is taken from another participant.

Public paid spins are disabled by default and require the operator to enable
them deliberately, on top of the contract's own pause and readiness checks.
