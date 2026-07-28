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
 * @notice Publishes a new Genesis Pool version that adds WOOD and drops 4663.
 *
 * This has to be a new version rather than an edit. The registry sets
 * `lockedAt` on a version the first time someone pays into it, and every editor
 * goes through `_editable`, so v2 has been frozen since its first spin. That is
 * the point of the design — nobody's odds change after they have paid — and it
 * means changing the prize table means publishing v3 and activating it.
 *
 * `activate` does the switchover itself: it deactivates whichever version was
 * live and repoints `activeVersion`. There is no window where the pool is
 * unspinnable, and no separate `deactivate` call is wanted here.
 *
 * WHY THESE TWO TOKENS
 *
 * A reward token has to be one the AutoBuyer can actually buy, because that is
 * how the vault restocks itself out of the reward reserve. It hardcodes a
 * single Uniswap V2 router and a direct [WETH, token] path. Quoting 0.001 ETH
 * against that router returns:
 *
 *     WOOD     99.8% of market value   <- usable
 *     CASHCAT  90.1%                   <- already in the pool
 *     PONS     68.5%                   <- a third lost on every restock
 *     TENDIES   0.0%                   <- effectively no liquidity there
 *     4663      0.0%                   <- same
 *     BRODIE    no WETH pair at all    <- the swap cannot even be built
 *
 * The liquidity for the others is real, it is just on venues this router does
 * not reach. Getting to it needs an AutoBuyer that takes a route per token,
 * which is a redeploy rather than a config change.
 *
 * 4663 is dropped for that same reason plus an urgent one: it is v2's rare tier
 * at 25% of all draws, its slot can pay up to 10 tokens, and the vault holds
 * 0.94. `activationReadiness(1,2)` already reports `inventorySolvent` false
 * with 4663 as the first unfunded token, and an unfunded slot refunds instead
 * of paying. Since it cannot be restocked through the router, carrying it into
 * v3 would carry that permanently.
 *
 * PRIZE SIZING
 *
 * Expected payout is ~70% of the base spin price at the prices read when this
 * was written. These are fixed numbers, not a live calculation — re-check them
 * if the market has moved a long way. Two tokens share the common tier, so a
 * common pull is no longer always the same coin.
 *
 * v2 also had its legendary tier paying less than its common tier (CASHCAT
 * 5-10 against 1-50). That inversion is corrected here.
 *
 * ORDER MATTERS
 *
 * `setProbabilities` deletes the version's reward slots, because a slot's tier
 * index only means anything against a given tier list. So probabilities are set
 * before any reward is added, never after.
 *
 * IMPORTANT — buy the WOOD first, with `node scripts/stock-vault.mjs`.
 * `activate` runs its own solvency check and reverts if the vault cannot cover
 * every slot's maximum, which would leave v3 published but unactivated and the
 * pool without a live version.
 */
contract ExpandGenesisPool is Script {
    uint256 constant POOL_ID = 1;

    // Carried over from v2 unchanged, so the only thing that moves is the prize
    // table. Read off chain rather than assumed. The fee split is not set here:
    // `setEconomics` snapshots it from the fee router, which currently reports
    // the same 1200 / 300 / 8500 that v2 holds.
    uint256 constant BASE_SPIN_PRICE_WEI = 0.0005 ether;
    uint256 constant RANDOMNESS_SURCHARGE_WEI = 0.0001 ether;
    uint16 constant MAX_ENTRIES_PER_ROUND = 5;
    uint32 constant ROUND_DURATION = 120;
    uint16 constant MAX_QUANTITY_PER_TX = 5;
    uint16 constant MAX_QUANTITY_PER_WALLET = 5;

    // Verified on chain: symbol() matches the ticker, 18 decimals each.
    address constant CASHCAT = 0x020bfC650A365f8BB26819deAAbF3E21291018b4;
    address constant WOOD = 0xF8BC08092C06dB6148114DCf82AF881F1085f92b;

    function run() external {
        IRegistry registry = IRegistry(vm.envAddress("ROBACHA_POOL_REGISTRY"));

        vm.startBroadcast();

        // 1. Allowlist. `addReward` rejects any token that is not listed.
        if (!registry.allowlistedTokens(CASHCAT)) registry.setTokenAllowlisted(CASHCAT, true);
        if (!registry.allowlistedTokens(WOOD)) registry.setTokenAllowlisted(WOOD, true);

        // 2. A fresh version starts blank, so everything below has to be set.
        //    No version number is baked in — the registry issues the next one.
        uint256 version = registry.createPoolVersion(POOL_ID, "Genesis Pool");

        registry.setEconomics(POOL_ID, version, BASE_SPIN_PRICE_WEI, RANDOMNESS_SURCHARGE_WEI);
        registry.setRoundConfig(
            POOL_ID, version, MAX_ENTRIES_PER_ROUND, ROUND_DURATION, MAX_QUANTITY_PER_TX, MAX_QUANTITY_PER_WALLET
        );

        // 3. Probabilities before rewards — setting them wipes the slots.
        //    Split is unchanged from v2: 70 / 25 / 5.
        uint16[] memory probabilities = new uint16[](3);
        probabilities[0] = 7000;
        probabilities[1] = 2500;
        probabilities[2] = 500;
        registry.setProbabilities(POOL_ID, version, probabilities);

        // 4. Four slots across three tiers, one call each — no batch setter.
        registry.addReward(POOL_ID, version, CASHCAT, 0, 6e18, 14e18);
        registry.addReward(POOL_ID, version, WOOD, 0, 18e18, 42e18);
        registry.addReward(POOL_ID, version, WOOD, 1, 47e18, 110e18);
        registry.addReward(POOL_ID, version, CASHCAT, 2, 56e18, 131e18);

        // 5. Goes live and retires v2 in the same call.
        registry.activate(POOL_ID, version, uint64(block.timestamp), 0);

        vm.stopBroadcast();

        (,,,, bool solvent, address firstUnfunded) = registry.activationReadiness(POOL_ID, version);
        console2.log("published version ", version);
        console2.log("activeVersion(1)  ", registry.activeVersion(POOL_ID));
        console2.log("inventorySolvent  ", solvent);
        console2.log("firstUnfundedToken", firstUnfunded);

        require(registry.activeVersion(POOL_ID) == version, "new version did not become active");
        require(solvent, "vault cannot cover every slot's max amount - run scripts/stock-vault.mjs first");
    }
}
