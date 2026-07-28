// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

interface IRegistry {
    function setTokenAllowlisted(address token, bool allowed) external;
    function addReward(
        uint256 poolId,
        uint256 version,
        address token,
        uint8 tierIndex,
        uint256 minAmount,
        uint256 maxAmount
    ) external;
    function setProbabilities(uint256 poolId, uint256 version, uint16[] calldata probabilityBps) external;
    function activate(uint256 poolId, uint256 version, uint64 startTime, uint64 endTime) external;
    function deactivate(uint256 poolId, uint256 version) external;
    function allowlistedTokens(address token) external view returns (bool);
    function activationReadiness(uint256 poolId, uint256 version)
        external
        view
        returns (bool, bool, bool, bool, bool inventorySolvent, address firstUnfundedToken);
}

/**
 * @notice Adds WOOD to the Genesis Pool and removes 4663.
 *
 * Six tokens were intended. Only WOOD survived checking, because a reward token
 * has to be one the AutoBuyer can actually buy — it hardcodes a single Uniswap
 * V2 router and a direct [WETH, token] path, and most of these pairs are not on
 * it. Quoting 0.001 ETH against that router returns:
 *
 *     WOOD     99.8% of market value   <- usable
 *     CASHCAT  90.1%                   <- already in the pool
 *     PONS     68.5%                   <- a third lost on every restock
 *     TENDIES   0.0%                   <- effectively no liquidity there
 *     4663      0.0%                   <- same
 *     BRODIE    no WETH pair at all    <- the swap cannot even be built
 *
 * Their liquidity is real, it is just on other venues. Reaching it needs an
 * AutoBuyer that accepts a route per token, which is a redeploy rather than a
 * config change.
 *
 * 4663 comes out for the same reason. It has been a reward token since v1 and
 * the vault holds 0.94 of a required 10, so `inventorySolvent` is already false
 * and a quarter of all draws would refund rather than pay. Because it cannot be
 * restocked, leaving it in guarantees that stays true.
 *
 * Amounts are sized so expected payout lands near 70% of the base price at the
 * prices read when this was written. They are fixed numbers, not a live
 * calculation — re-check them if the market has moved a long way.
 *
 * IMPORTANT — buy the WOOD first. `activationReadiness` requires the vault to
 * hold at least `maxAmount` of every slot's token. The script asserts that at
 * the end and reverts rather than leaving the pool deactivated.
 */
contract ExpandGenesisPool is Script {
    uint256 constant POOL_ID = 1;
    uint256 constant VERSION = 2;

    // Verified on chain: symbol() matches the ticker, 18 decimals each.
    address constant CASHCAT = 0x020bfC650A365f8BB26819deAAbF3E21291018b4;
    address constant WOOD = 0xF8BC08092C06dB6148114DCf82AF881F1085f92b;

    function run() external {
        IRegistry registry = IRegistry(vm.envAddress("ROBACHA_POOL_REGISTRY"));

        vm.startBroadcast();

        // 1. Allowlist. `addReward` rejects any token that is not listed.
        address[2] memory tokens = [CASHCAT, WOOD];
        for (uint256 i = 0; i < tokens.length; ++i) {
            if (!registry.allowlistedTokens(tokens[i])) {
                registry.setTokenAllowlisted(tokens[i], true);
            }
        }

        // 2. A version cannot be edited while active.
        registry.deactivate(POOL_ID, VERSION);

        // 3. Probabilities first — setting them wipes the existing reward
        //    slots, so the six below have to be added afterwards or they would
        //    be deleted the moment this runs. Split is unchanged: 70 / 25 / 5.
        uint16[] memory probabilities = new uint16[](3);
        probabilities[0] = 7000;
        probabilities[1] = 2500;
        probabilities[2] = 500;
        registry.setProbabilities(POOL_ID, VERSION, probabilities);

        // 4. Four slots across three tiers, added one at a time — the registry
        //    has no batch setter. Two tokens in the common tier means a common
        //    pull is no longer always the same coin.
        registry.addReward(POOL_ID, VERSION, CASHCAT, 0, 6e18, 14e18);
        registry.addReward(POOL_ID, VERSION, WOOD, 0, 18e18, 42e18);
        registry.addReward(POOL_ID, VERSION, WOOD, 1, 47e18, 110e18);
        registry.addReward(POOL_ID, VERSION, CASHCAT, 2, 56e18, 131e18);

        registry.activate(POOL_ID, VERSION, uint64(block.timestamp), 0);

        vm.stopBroadcast();

        (,,,, bool solvent, address firstUnfunded) = registry.activationReadiness(POOL_ID, VERSION);
        console2.log("inventorySolvent  ", solvent);
        console2.log("firstUnfundedToken", firstUnfunded);

        require(solvent, "vault cannot cover every slot's max amount - buy inventory first");
    }
}
