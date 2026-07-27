# ROBACHA deployment runbook

Everything in this document has been executed against a **fork of Robinhood
Chain mainnet** (chain 4663, real CCIP router address) except the steps that
require a wallet signature, LINK funding, or reward inventory. Those are marked
**[requires you]** and each has one exact command.

---

## 0. What is already verified

| Fact | Value | How it was established |
|---|---|---|
| Chain id | `4663` (`0x1237`) | `eth_chainId` against `rpc.mainnet.chain.robinhood.com` |
| Head block at record | `19,813,669` | `eth_blockNumber` |
| Gas price at record | `55,884,464` wei (0.0559 gwei) | `eth_gasPrice` |
| CCIP router (Robinhood) | `0x06fC836cf9839B1cd891C440A0a45242DA6Ae1c9` | Chainlink CCIP directory API, mainnet |
| CCIP selector (Robinhood) | `6180753054346818345` | same |
| CCIP router (Ethereum) | `0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D` | same |
| CCIP selector (Ethereum) | `5009297550715157269` | same |
| Lane Robinhood → Ethereum | supported, v1.6.0 | Chainlink CCIP lanes API |
| Lane Ethereum → Robinhood | supported, v1.6.0 | same |
| VRF v2.5 coordinator (Ethereum) | `0xD7f86b4b8Cae7D942340FF628F82735b7a20893a` | Chainlink VRF supported-networks docs |
| VRF key hash (200 gwei) | `0x8077df51…42bd3d9` | same |
| Admin / treasury | `0x19BF0B60852Afa668b261D3020A1A4321362e68D` | supplied; checksum valid, EOA, **balance 0, nonce 0** |

All of the above are recorded in `contracts/config/chainlink.json` with the
endpoints they were read from.

### Measured deployment cost (Robinhood Chain fork, real execution)

| Contract | Gas |
|---|---:|
| RobachaFeeRouter | 1,398,620 |
| RobachaRewardVault | 1,120,960 |
| RobachaPoolRegistry | 2,491,450 |
| RobachaGacha | 3,490,979 |
| RobachaRandomnessSender | 1,237,087 |
| RobachaRandomnessReceiver | 792,299 |
| RobachaSponsorRegistry | 1,327,053 |
| Wiring calls (6) | 270,588 |
| **Total** | **12,129,036** |

At the observed mainnet gas price that is **≈ 0.00068 ETH**. Budget
**0.01 ETH** on the deployer to absorb gas-price movement and the follow-up
role-transfer transactions.

---

## 1. Signer **[requires you]**

Two encrypted Foundry keystores already exist on this machine:

```bash
cast wallet list
```

→ `deployer (Local)`, `sdf-deployer (Local)`

Their addresses cannot be read without the password, and the password is never
entered anywhere but your own terminal. Confirm which account you intend to use
and what its address is:

```bash
cast wallet address --account deployer
```

If neither is the account you want, import one interactively — this is the only
supported way to add a signer, and the key never touches a file in this repo:

```bash
cast wallet import robacha-deployer --interactive
```

Then set `ROBACHA_DEPLOYER_ADDRESS` in `.env.local` to the address it prints.

> Every command below signs with `--account <keystore-name>`. Foundry prompts
> for the password in your terminal. No private key is read from the
> environment, from source, or by any tooling in this repository.

---

## 2. Fund the deployer **[requires you]**

The admin/treasury address `0x19BF0B60852Afa668b261D3020A1A4321362e68D` has
**0 wei and nonce 0** — it has never transacted. Confirm before proceeding:

```bash
cast balance 0x19BF0B60852Afa668b261D3020A1A4321362e68D --rpc-url https://rpc.mainnet.chain.robinhood.com
```

Send at least **0.01 ETH** on Robinhood Chain to the deployer address, and
enough ETH to the admin address to cover the role-transfer and pool-setup
transactions (**0.005 ETH** is ample at current prices).

---

## 3. Chainlink VRF subscription **[requires you]**

1. Go to <https://vrf.chain.link>, Ethereum mainnet.
2. Create a subscription.
3. Fund it with LINK. Budget from your expected round rate — one VRF request
   settles an entire round of up to 25 entries, not one per spin.
4. Put the numeric id in `.env.local` as `CHAINLINK_VRF_SUBSCRIPTION_ID`.

The Ethereum deployment script **refuses to run** without this value rather than
deploying a coordinator that cannot answer.

---

## 4. Deploy — dry run first

Always run without `--broadcast` first. The script prints the network, chain id,
deployer, deployer balance, every constructor argument, the fee split, the
randomness architecture and the gas estimate before anything is signed.

```bash
cd contracts && forge script script/DeployRobinhood.s.sol:DeployRobinhood --rpc-url $ROBINHOOD_RPC_URL --account deployer
```

Then broadcast:

```bash
cd contracts && forge script script/DeployRobinhood.s.sol:DeployRobinhood --rpc-url $ROBINHOOD_RPC_URL --account deployer --broadcast --verify --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api
```

Record the seven addresses it prints into `.env.local`.

Then the Ethereum side:

```bash
cd contracts && forge script script/DeployEthereum.s.sol:DeployEthereum --rpc-url $ETHEREUM_RPC_URL --account deployer --broadcast --verify
```

---

## 5. Add the coordinator as a VRF consumer **[requires you]**

Back at <https://vrf.chain.link>, add the deployed
`EthereumRobachaRandomnessCoordinator` address as a consumer of your subscription.
This is a signed transaction on Chainlink's own contract and cannot be scripted
from here.

---

## 6. Link the two chains

```bash
cd contracts && forge script script/LinkRandomness.s.sol:LinkRandomnessRobinhood --rpc-url $ROBINHOOD_RPC_URL --account deployer --broadcast
```

```bash
cd contracts && forge script script/LinkRandomness.s.sol:LinkRandomnessEthereum --rpc-url $ETHEREUM_RPC_URL --account deployer --broadcast
```

---

## 7. Fund CCIP fees on both sides **[requires you]**

CCIP fees are paid in native ETH on each chain. The Robinhood-side sender is
topped up from the randomness surcharge in normal operation, but needs an
initial float, and the Ethereum-side return message needs its own balance.

```bash
cast send $ROBACHA_RANDOMNESS_SENDER "fundFees()" --value 0.02ether --rpc-url $ROBINHOOD_RPC_URL --account deployer
```

```bash
cast send $ROBACHA_ETHEREUM_COORDINATOR "fundReturnFees()" --value 0.05ether --rpc-url $ETHEREUM_RPC_URL --account deployer
```

Check readiness — this reads the contract, it does not assume:

```bash
cast call $ROBACHA_RANDOMNESS_SENDER "isReady()(bool,string)" --rpc-url $ROBINHOOD_RPC_URL
```

---

## 8. Grant the gacha its routing role, then hand over admin

The fee router's admin is the admin address from construction, so this one is
signed by the admin:

```bash
cd contracts && forge script script/TransferRoles.s.sol:GrantGachaRole --rpc-url $ROBINHOOD_RPC_URL --account admin --broadcast
```

Then strip the deployer:

```bash
cd contracts && forge script script/TransferRoles.s.sol:TransferRoles --rpc-url $ROBINHOOD_RPC_URL --account deployer --broadcast
```

---

## 9. Verify

```bash
cd contracts && forge script script/Verify.s.sol:Verify --rpc-url $ROBINHOOD_RPC_URL
```

This asserts rather than logs: bytecode at every address, wiring in both
directions, roles, a fee split totalling exactly 10,000 bps within its caps, and
matching cross-chain configuration on the sender and receiver. **A failure stops
the run.** It also prints the launch gates still outstanding — CCIP fee balance,
pool count, vault token count, pause state — which are not failures, they are
what you have still to do.

---

## 10. Reward inventory **[requires you]**

No inventory is manufactured. Real ERC-20 tokens must be moved into the vault by
an address holding `VAULT_MANAGER_ROLE`.

For each reward token, in order:

```bash
cast send <TOKEN> "approve(address,uint256)" $ROBACHA_REWARD_VAULT <AMOUNT> --rpc-url $ROBINHOOD_RPC_URL --account admin
```

```bash
cast send $ROBACHA_REWARD_VAULT "fund(address,uint256)" <TOKEN> <AMOUNT> --rpc-url $ROBINHOOD_RPC_URL --account admin
```

The vault measures the balance delta and **reverts** if it differs from the
stated amount, which is how fee-on-transfer tokens are kept out. Confirm the
result:

```bash
cast call $ROBACHA_REWARD_VAULT "available(address)(uint256)" <TOKEN> --rpc-url $ROBINHOOD_RPC_URL
```

---

## 11. Create and activate the first pool

Every step is signed by the admin. Amounts are in the token's own decimals.

```bash
cast send $ROBACHA_POOL_REGISTRY "setTokenAllowlisted(address,bool)" <TOKEN> true --rpc-url $ROBINHOOD_RPC_URL --account admin
```

```bash
cast send $ROBACHA_POOL_REGISTRY "createPool(string)" "Genesis Pool" --rpc-url $ROBINHOOD_RPC_URL --account admin
```

```bash
cast send $ROBACHA_POOL_REGISTRY "setProbabilities(uint256,uint256,uint16[])" 1 1 "[7000,2500,500]" --rpc-url $ROBINHOOD_RPC_URL --account admin
```

```bash
cast send $ROBACHA_POOL_REGISTRY "addReward(uint256,uint256,address,uint8,uint256,uint256)" 1 1 <TOKEN> 0 <MIN> <MAX> --rpc-url $ROBINHOOD_RPC_URL --account admin
```

```bash
cast send $ROBACHA_POOL_REGISTRY "setEconomics(uint256,uint256,uint256,uint256)" 1 1 <BASE_PRICE_WEI> <SURCHARGE_WEI> --rpc-url $ROBINHOOD_RPC_URL --account admin
```

```bash
cast send $ROBACHA_POOL_REGISTRY "setRoundConfig(uint256,uint256,uint16,uint32,uint16,uint16)" 1 1 25 60 10 0 --rpc-url $ROBINHOOD_RPC_URL --account admin
```

Check what activation would reject, before spending gas on it:

```bash
cast call $ROBACHA_POOL_REGISTRY "activationReadiness(uint256,uint256)(bool,bool,bool,bool,bool,address)" 1 1 --rpc-url $ROBINHOOD_RPC_URL
```

Then activate:

```bash
cast send $ROBACHA_POOL_REGISTRY "activate(uint256,uint256,uint64,uint64)" 1 1 0 0 --rpc-url $ROBINHOOD_RPC_URL --account admin
```

Activation reverts unless probabilities total exactly 10,000 bps, every
non-zero tier has at least one reward slot, and every slot is funded to at least
its own maximum.

> **The randomness surcharge is not a guess.** Read the real CCIP fee first and
> set the surcharge above it with a margin:
> ```bash
> cast call $ROBACHA_RANDOMNESS_SENDER "estimateRequestFee()(uint256)" --rpc-url $ROBINHOOD_RPC_URL
> ```
> One request settles a whole round, so divide by your expected entries per
> round, then add headroom for gas-price movement.

---

## 12. Controlled end-to-end spin

Before enabling public spins, run one spin yourself and watch it settle:

```bash
cast call $ROBACHA_GACHA "quote(uint256,uint16)(uint256,uint256,uint256)" 1 1 --rpc-url $ROBINHOOD_RPC_URL
```

```bash
cast send $ROBACHA_GACHA "spin(uint256,uint16)" 1 1 --value <TOTAL_FROM_QUOTE> --rpc-url $ROBINHOOD_RPC_URL --account admin
```

Then, after the round window: `closeRound` → `requestRoundRandomness` → wait for
CCIP and VRF → `settleEntries` → `claim`. Track the CCIP messages at
<https://ccip.chain.link>.

---

## 13. Enable public paid spins **[requires you — deliberate decision]**

Only after every step above has passed:

```
PUBLIC_PAID_SPINS_ENABLED=true
NEXT_PUBLIC_PUBLIC_PAID_SPINS_ENABLED=true
```

This flag is one control among several, never the only one. The gacha contract's
own pause remains independent, and `spinReadiness` still gates the button.

**ROBACHA has not been independently audited.** A paid, chance-based token-reward
product may be regulated differently in different jurisdictions. Enabling this
flag is a legal and commercial decision, not a technical one.

---

## Rollback

```bash
cast send $ROBACHA_GACHA "pause()" --rpc-url $ROBINHOOD_RPC_URL --account admin
```

Pausing stops new spins immediately. It does **not** block claims — rewards
already assigned stay claimable, by design. Rounds already awaiting randomness
continue; if randomness never arrives they become refundable after the timeout
and participants withdraw with `withdrawRefund()`.

To wind a pool down without pausing the contract:

```bash
cast send $ROBACHA_POOL_REGISTRY "close(uint256,uint256)" 1 1 --rpc-url $ROBINHOOD_RPC_URL --account admin
```

Surplus inventory can then be recovered — never inventory reserved against an
unclaimed reward, which `withdrawSurplus` cannot touch:

```bash
cast send $ROBACHA_REWARD_VAULT "withdrawSurplus(address,address,uint256)" <TOKEN> <TO> <AMOUNT> --rpc-url $ROBINHOOD_RPC_URL --account admin
```

## Incident response

1. `pause()` the gacha. Confirm with `cast call $ROBACHA_GACHA "paused()(bool)"`.
2. Set `PUBLIC_PAID_SPINS_ENABLED=false` and redeploy the frontend.
3. Check `/api/health` — it reports every dependency's real state.
4. Check vault solvency per token: `cast call $ROBACHA_REWARD_VAULT "isSolvent(address)(bool)" <TOKEN>`.
5. Check escrow backing: `totalEscrow()` + `totalRefundable()` must not exceed
   the gacha's native balance.
6. Rounds stuck without randomness: after `randomnessTimeout` anyone may call
   `markRoundRefundable(roundId)`. No administrator can supply a random word or
   choose a reward — that is deliberate and cannot be overridden.
