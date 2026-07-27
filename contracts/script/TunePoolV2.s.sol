// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

interface IRegistry {
    function setRoundConfig(
        uint256 poolId,
        uint256 version,
        uint16 maxEntriesPerRound,
        uint32 roundDuration,
        uint16 maxQuantityPerTx,
        uint16 maxQuantityPerWallet
    ) external;

    function activate(uint256 poolId, uint256 version, uint64 startTime, uint64 endTime) external;

    function deactivate(uint256 poolId, uint256 version) external;

    function activationReadiness(uint256 poolId, uint256 version)
        external
        view
        returns (bool configured, bool probabilitiesValid, bool roundConfigValid, bool priceSet, bool inventorySolvent, address firstUnfundedToken);
}

interface ICommitReveal {
    function setGasReimbursement(uint256 amount) external;
    function gasReimbursementWei() external view returns (uint256);
}

/**
 * @notice Brings pool 1 version 2 in line with what was actually intended, and
 *         makes spinners pay the keeper's gas instead of the operator.
 *
 * Two changes:
 *
 *  1. `maxQuantityPerTx` 2 -> 5. The whole point of v2's five-entry rounds is
 *     that one person can fill one; at two per transaction that takes three
 *     signatures, which is the friction v2 was meant to remove.
 *
 *  2. `gasReimbursementWei` 0 -> 0.00005 ETH. The gacha forwards this from the
 *     round's escrowed surcharge when randomness is requested, so the cost of
 *     running a round is charged to the round rather than absorbed by the
 *     keeper. Sized against measured gas (~790k per full round lifecycle at the
 *     chain's current price, about 0.00003 ETH) with margin, and deliberately
 *     under the 0.0001 ETH a single-entry round escrows so even the smallest
 *     round covers itself.
 *
 * A version cannot be edited while it is active, so this deactivates, edits and
 * reactivates. Run it only when no round is open — an in-flight round during
 * the gap would be left unable to accept entries.
 */
contract TunePoolV2 is Script {
    uint256 constant POOL_ID = 1;
    uint256 constant VERSION = 2;

    uint16 constant MAX_ENTRIES_PER_ROUND = 5;
    uint32 constant ROUND_DURATION = 120;
    uint16 constant MAX_QUANTITY_PER_TX = 5;
    uint16 constant MAX_QUANTITY_PER_WALLET = 5;

    uint256 constant GAS_REIMBURSEMENT = 0.00005 ether;

    function run() external {
        IRegistry registry = IRegistry(vm.envAddress("ROBACHA_POOL_REGISTRY"));
        ICommitReveal randomness = ICommitReveal(vm.envAddress("ROBACHA_RANDOMNESS_SENDER"));

        vm.startBroadcast();

        // 1. Round config. Deactivate first — `_editable` rejects an active
        //    version, by design, so that a live pool cannot shift under anyone.
        registry.deactivate(POOL_ID, VERSION);
        registry.setRoundConfig(
            POOL_ID, VERSION, MAX_ENTRIES_PER_ROUND, ROUND_DURATION, MAX_QUANTITY_PER_TX, MAX_QUANTITY_PER_WALLET
        );
        registry.activate(POOL_ID, VERSION, uint64(block.timestamp), 0);

        // 2. Charge the round for the keeper's gas.
        randomness.setGasReimbursement(GAS_REIMBURSEMENT);

        vm.stopBroadcast();

        (
            bool configured,
            bool probabilitiesValid,
            bool roundConfigValid,
            bool priceSet,
            bool inventorySolvent,
            address firstUnfunded
        ) = registry.activationReadiness(POOL_ID, VERSION);

        console2.log("maxQuantityPerTx     ->", MAX_QUANTITY_PER_TX);
        console2.log("gasReimbursementWei  ->", randomness.gasReimbursementWei());
        console2.log("readiness.configured  ", configured);
        console2.log("readiness.probs       ", probabilitiesValid);
        console2.log("readiness.roundConfig ", roundConfigValid);
        console2.log("readiness.priceSet    ", priceSet);
        console2.log("readiness.solvent     ", inventorySolvent);
        console2.log("firstUnfundedToken    ", firstUnfunded);

        require(
            configured && probabilitiesValid && roundConfigValid && priceSet && inventorySolvent,
            "pool did not come back ready"
        );
    }
}
