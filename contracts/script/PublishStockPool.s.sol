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
 * @notice Publishes the Robacha Stock Machine pool — the tokenized-stock gacha.
 *
 * This is the on-chain half of "make the Stock Machine functional". The frontend
 * already knows how to spin any pool by id (set NEXT_PUBLIC_ROBACHA_STOCK_POOL_ID
 * to POOL_ID below and the Stock Machine goes live), so all that's left is real
 * contract state: a pool version with these tokens, real odds, and a funded
 * reward vault.
 *
 * The five tokens are the confirmed, address-verified tokenized stocks on
 * Robinhood Chain (matched against Robinhood's own rhj/assets API). Nothing here
 * is fabricated — but three things below are the OPERATOR'S to set, and the
 * script deliberately will not lie about them:
 *
 *   1. ECONOMICS — BASE_SPIN_PRICE_WEI and the amount ranges are placeholders.
 *      Set them to what you actually intend. Amounts are 18-decimal token units.
 *   2. ODDS — the 70/25/5 split and the tier each stock sits in are examples.
 *      Set the real published probabilities.
 *   3. INVENTORY — you must transfer real TSLA/AAPL/NVDA/META/NFTX into the
 *      reward vault BEFORE running this. activate() reverts unless the vault can
 *      cover every slot's max amount (`require(solvent)` at the end), so an
 *      unfunded pool simply cannot go live. That check is the honesty guarantee.
 *
 * Run (operator keys, never checked in):
 *   forge script contracts/script/PublishStockPool.s.sol \
 *     --rpc-url $ROBINHOOD_RPC --broadcast --account <deployer>
 * with ROBACHA_POOL_REGISTRY set to the registry address.
 */
contract PublishStockPool is Script {
    // Genesis is pool 1; the Stock Machine takes the next id. Change if 2 is used.
    uint256 constant POOL_ID = 2;

    // --- Confirmed tokenized stocks (verified against Robinhood rhj/assets) ---
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC; // NVIDIA
    address constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d; // Tesla
    address constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9; // Apple
    address constant NFLX = 0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8; // Netflix
    address constant META = 0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35; // Meta Platforms

    // --- OPERATOR: set these before launch (placeholders below) -------------
    uint256 constant BASE_SPIN_PRICE_WEI = 0.002 ether; // TODO: real spin price
    uint256 constant RANDOMNESS_SURCHARGE_WEI = 0.0001 ether; // matches the live draw fee
    uint16 constant MAX_ENTRIES_PER_ROUND = 5;
    uint32 constant ROUND_DURATION = 120;
    uint16 constant MAX_QUANTITY_PER_TX = 5;
    uint16 constant MAX_QUANTITY_PER_WALLET = 0; // 0 = unlimited (per-round cap governs)

    function run() external {
        IRegistry registry = IRegistry(vm.envAddress("ROBACHA_POOL_REGISTRY"));

        vm.startBroadcast();

        // Allowlist the reward tokens (no-op if already allowlisted).
        address[5] memory tokens = [NVDA, TSLA, AAPL, NFLX, META];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (!registry.allowlistedTokens(tokens[i])) registry.setTokenAllowlisted(tokens[i], true);
        }

        uint256 version = registry.createPoolVersion(POOL_ID, "Stock Pool");

        registry.setEconomics(POOL_ID, version, BASE_SPIN_PRICE_WEI, RANDOMNESS_SURCHARGE_WEI);
        registry.setRoundConfig(
            POOL_ID, version, MAX_ENTRIES_PER_ROUND, ROUND_DURATION, MAX_QUANTITY_PER_TX, MAX_QUANTITY_PER_WALLET
        );

        // TODO(operator): real published odds. Example 70 / 25 / 5.
        // Setting probabilities wipes the slots, so it comes before addReward.
        uint16[] memory probabilities = new uint16[](3);
        probabilities[0] = 7000; // common
        probabilities[1] = 2500; // rare
        probabilities[2] = 500; // legendary
        registry.setProbabilities(POOL_ID, version, probabilities);

        // TODO(operator): real tiers + amount ranges (18-decimal token units).
        // Every max amount here must be backed by inventory already in the vault.
        registry.addReward(POOL_ID, version, TSLA, 0, 1e16, 3e16); // common
        registry.addReward(POOL_ID, version, AAPL, 0, 1e16, 3e16); // common
        registry.addReward(POOL_ID, version, NVDA, 1, 3e16, 8e16); // rare
        registry.addReward(POOL_ID, version, META, 1, 3e16, 8e16); // rare
        registry.addReward(POOL_ID, version, NFLX, 2, 1e17, 2e17); // legendary

        // Reverts unless the vault covers every slot's max amount — so this line
        // fails loudly if the tokens above aren't funded yet.
        registry.activate(POOL_ID, version, uint64(block.timestamp), 0);

        vm.stopBroadcast();

        (,,,, bool solvent, address firstUnfunded) = registry.activationReadiness(POOL_ID, version);
        console2.log("published Stock Pool version", version);
        console2.log("activeVersion(POOL_ID)      ", registry.activeVersion(POOL_ID));
        console2.log("inventorySolvent            ", solvent);
        console2.log("firstUnfundedToken          ", firstUnfunded);

        require(registry.activeVersion(POOL_ID) == version, "stock pool did not become active");
        require(solvent, "reward vault is not funded to cover every slot's max amount");
    }
}
