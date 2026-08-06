// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaStonkPitEntropy} from "../src/randomness/RobachaStonkPitEntropy.sol";

interface IFeeRouter {
    function randomnessTreasury() external view returns (address);
    function accrued(address account) external view returns (uint256);
    function withdraw(address account) external;
}

/**
 * @notice Moves accrued surcharge out of the fee router and into the entropy
 *         float.
 *
 * @dev The router records what each destination is owed and holds the ETH
 *      until someone asks for it. Routing the surcharge at the adapter, which
 *      `DeployStonkPitEntropy` does, only changes the name on the ledger — the
 *      money does not move on its own, and an adapter with a healthy accrual
 *      and an empty balance still reports itself unready and still stops spins
 *      being sold. This is the call that closes that gap.
 *
 *      Meant to be run repeatedly, by the keeper rather than by hand. It is
 *      the mechanism that makes the float self-funding: busy rounds bank a
 *      surplus here, lean rounds draw it down, and sweeping is what carries it
 *      across. Left unrun for long enough the float drains and the machine
 *      closes, which is safe but is still an outage.
 *
 *      Withdrawing needs TREASURY_ROLE, so the keeper has to hold it. That is
 *      a deliberately narrow permission: it can only move funds to the address
 *      already recorded as their destination, and cannot choose that address.
 */
contract SweepEntropyFloat is Script {
    function run() external {
        IFeeRouter router = IFeeRouter(vm.envAddress("ROBACHA_FEE_ROUTER"));
        RobachaStonkPitEntropy entropy = RobachaStonkPitEntropy(payable(vm.envAddress("ROBACHA_STONKPIT_ENTROPY")));

        require(
            router.randomnessTreasury() == address(entropy),
            "the surcharge is not routed to this adapter - run DeployStonkPitEntropy first"
        );

        uint256 owed = router.accrued(address(entropy));
        uint256 floatBefore = address(entropy).balance;

        console2.log("accrued in the router", owed);
        console2.log("float before         ", floatBefore);
        console2.log("runway before        ", entropy.runwayRounds());

        if (owed == 0) {
            console2.log("");
            console2.log("Nothing to sweep. Not an error - it means no rounds have settled since the last one.");
            return;
        }

        vm.startBroadcast();
        router.withdraw(address(entropy));
        vm.stopBroadcast();

        (bool ready, string memory reason) = entropy.isReady();

        console2.log("");
        console2.log("float after ", address(entropy).balance);
        console2.log("runway after", entropy.runwayRounds());
        console2.log("isReady     ", ready);
        console2.log("reason      ", reason);

        require(address(entropy).balance == floatBefore + owed, "the sweep did not land");
    }
}
