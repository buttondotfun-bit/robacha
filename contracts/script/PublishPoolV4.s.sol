// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

interface IRegistry {
    function setTokenAllowlisted(address token, bool allowed) external;
    function createPoolVersion(uint256 poolId, string calldata name) external returns (uint256 version);
    function setEconomics(
        uint256 poolId,
        uint256 version,
        uint256 baseSpinPriceWei,
        uint256 randomnessSurchargeWei
    ) external;
    function setRoundConfig(
        uint256 poolId,
        uint256 version,
        uint16 maxEntriesPerRound,
        uint32 roundDuration,
        uint16 maxQuantityPerTx,
        uint16 maxQuantityPerWallet
    ) external;
    function setProbabilities(uint256 poolId, uint256 version, uint16[] calldata probabilityBps) external;
    function addReward(
        uint256 poolId,
        uint256 version,
        address token,
        uint8 tierIndex,
        uint256 minAmount,
        uint256 maxAmount
    ) external;
    function activate(uint256 poolId, uint256 version, uint64 startTime, uint64 endTime) external;
    function allowlistedTokens(address token) external view returns (bool);
    function activeVersion(uint256 poolId) external view returns (uint256);
    function activationReadiness(uint256 poolId, uint256 version)
        external
        view
        returns (bool, bool, bool, bool, bool inventorySolvent, address firstUnfundedToken);
}

/**
 * @notice Publishes Genesis Pool v4, which lifts the lifetime per-wallet cap.
 *
 * WHAT CHANGES, AND WHY IT IS ONE NUMBER
 *
 * v3 caps a wallet at five spins for the entire life of the version, because
 * `entriesByWallet` is keyed by `(poolId, version)` rather than by round. A
 * player who bought five in one transaction — which `maxQuantityPerTx` of 5
 * allows — was finished with the pool forever, on their first click, with no
 * way to buy another and nothing in the interface that had warned them the
 * five were a lifetime allowance rather than a starting balance. At least one
 * player hit exactly that and reported the dead button as a bug.
 *
 * The wanted behaviour is five per round. That does not need a contract
 * change, because the round already enforces it: `maxEntriesPerRound` is 5 and
 * caps the round across all wallets, and `RobachaGacha.spin` closes a round the
 * moment it fills. Since `maxQuantityPerTx` is also 5, a wallet buying five
 * takes a whole round to itself and can never hold more than five entries in
 * one. So a per-round per-wallet cap of five and no per-wallet cap at all are
 * the same rule here, and the second one is expressible in config.
 *
 * Hence `MAX_QUANTITY_PER_WALLET = 0`, which the registry reads as unlimited.
 * Re-keying the counter by round would have meant a new Gacha: it is not behind
 * a proxy — the EIP-1967 implementation slot is zero and it has a plain
 * constructor — so that is a redeploy plus a migration of vault permissions,
 * open rounds and unclaimed rewards, to arrive at behaviour already available.
 *
 * Worth being clear-eyed about what this is: because a full round closes
 * immediately and the next opens at once, five-per-round throttles nobody. A
 * wallet can buy five, take its round, and buy five more in the next block,
 * indefinitely. This removes a ceiling; it does not add a limit. A real limit
 * would have to be time-based, and that one does need the contract change.
 *
 * A new version also resets every wallet's counter, since the key includes the
 * version. Everyone who spent their v3 allowance starts clean.
 *
 * WHY PONS, TENDIES AND HOODRAT ARE NOT IN HERE
 *
 * They were asked for and they are left out, because adding them would not
 * work rather than because it was not wanted. Read live from chain:
 *
 *     PONS     allowlisted false    vault balance 0
 *     TENDIES  allowlisted false    vault balance 0
 *     HOODRAT  allowlisted false    vault balance 0
 *
 * Two independent blockers per token. `addReward` rejects a token that is not
 * allowlisted, and `activate` runs `activationReadiness` and reverts unless the
 * vault can cover every slot — so a slot backed by a zero balance does not
 * produce a pool that quietly underpays, it produces a version that is
 * published but never goes live, leaving v3 running and the change not made.
 *
 * The fix is inventory, which no script can conjure: the tokens have to be
 * bought and sent to the vault. TENDIES additionally cannot be restocked
 * automatically — quoting it against the AutoBuyer's router returns ~0% of
 * market value, the same reason it was kept out of v3 — so it would drain to
 * empty with no way back short of an AutoBuyer that routes per token.
 *
 * Everything else is carried over from v3 unchanged and was read off chain
 * rather than assumed, so the prize table and the economics do not move. The
 * fee split is not set here: `setEconomics` snapshots it from the fee router.
 *
 * ORDER MATTERS
 *
 * `setProbabilities` deletes the version's reward slots, since a slot's tier
 * index only means anything against a given tier list. Probabilities are set
 * before any reward is added, never after.
 */
contract PublishPoolV4 is Script {
    uint256 constant POOL_ID = 1;

    uint256 constant BASE_SPIN_PRICE_WEI = 0.0005 ether;
    uint256 constant RANDOMNESS_SURCHARGE_WEI = 0.0001 ether;
    uint16 constant MAX_ENTRIES_PER_ROUND = 5;
    uint32 constant ROUND_DURATION = 120;
    uint16 constant MAX_QUANTITY_PER_TX = 5;

    /// 0 = unlimited. The five-per-round rule comes from MAX_ENTRIES_PER_ROUND.
    uint16 constant MAX_QUANTITY_PER_WALLET = 0;

    // Verified on chain: symbol() matches the ticker, 18 decimals each.
    address constant CASHCAT = 0x020bfC650A365f8BB26819deAAbF3E21291018b4;
    address constant WOOD = 0xF8BC08092C06dB6148114DCf82AF881F1085f92b;

    function run() external {
        IRegistry registry = IRegistry(vm.envAddress("ROBACHA_POOL_REGISTRY"));

        uint256 previous = registry.activeVersion(POOL_ID);
        console2.log("active version before", previous);

        vm.startBroadcast();

        // Both are already allowlisted; kept so the script stands alone.
        if (!registry.allowlistedTokens(CASHCAT)) registry.setTokenAllowlisted(CASHCAT, true);
        if (!registry.allowlistedTokens(WOOD)) registry.setTokenAllowlisted(WOOD, true);

        // A fresh version starts blank, so everything below has to be set. No
        // version number is baked in — the registry issues the next one.
        uint256 version = registry.createPoolVersion(POOL_ID, "Genesis Pool");

        registry.setEconomics(POOL_ID, version, BASE_SPIN_PRICE_WEI, RANDOMNESS_SURCHARGE_WEI);
        registry.setRoundConfig(
            POOL_ID, version, MAX_ENTRIES_PER_ROUND, ROUND_DURATION, MAX_QUANTITY_PER_TX, MAX_QUANTITY_PER_WALLET
        );

        // Probabilities before rewards — setting them wipes the slots.
        // Split unchanged from v3: 70 / 25 / 5.
        uint16[] memory probabilities = new uint16[](3);
        probabilities[0] = 7000;
        probabilities[1] = 2500;
        probabilities[2] = 500;
        registry.setProbabilities(POOL_ID, version, probabilities);

        // The same four slots v3 published, unchanged.
        registry.addReward(POOL_ID, version, CASHCAT, 0, 6e18, 14e18);
        registry.addReward(POOL_ID, version, WOOD, 0, 18e18, 42e18);
        registry.addReward(POOL_ID, version, WOOD, 1, 47e18, 110e18);
        registry.addReward(POOL_ID, version, CASHCAT, 2, 56e18, 131e18);

        // Goes live and retires v3 in the same call, so there is no window
        // where the pool has no live version.
        registry.activate(POOL_ID, version, uint64(block.timestamp), 0);

        vm.stopBroadcast();

        (,,,, bool solvent, address firstUnfunded) = registry.activationReadiness(POOL_ID, version);
        console2.log("published version ", version);
        console2.log("activeVersion(1)  ", registry.activeVersion(POOL_ID));
        console2.log("inventorySolvent  ", solvent);
        console2.log("firstUnfundedToken", firstUnfunded);

        require(registry.activeVersion(POOL_ID) == version, "new version did not become active");
        require(solvent, "vault cannot cover every slot's max amount");
    }
}
