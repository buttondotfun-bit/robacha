// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaStonkPitEntropy} from "../src/randomness/RobachaStonkPitEntropy.sol";

interface IFeeRouter {
    function protocolTreasury() external view returns (address);
    function operationsTreasury() external view returns (address);
    function rewardReserveTreasury() external view returns (address);
    function randomnessTreasury() external view returns (address);
    function setTreasuries(address protocol, address operations, address rewardReserve, address randomness)
        external;
    function accrued(address account) external view returns (uint256);
}

/**
 * @notice Deploys the StonkPit entropy adapter and points the surcharge at it.
 *
 * @dev DELIBERATELY DOES NOT SWITCH THE LIVE PATH.
 *
 * The gacha keeps drawing from the existing commit-reveal source after this
 * runs. Nothing a player does changes. That separation is the whole point:
 * flipping the randomness source and bootstrapping the float that pays for it
 * are two different risks, and doing them in one transaction means finding out
 * about both at once, on live rounds.
 *
 * What this does instead is let the float fill itself first. The fee router
 * already sends unused surcharge to `randomnessTreasury` — "routed here, never
 * to profit", in its own words — so pointing that at the adapter means every
 * round quietly funds the thing that will later buy its randomness. The
 * current source costs 0.00005 a round against a 0.0002 surcharge, so roughly
 * 0.0006 accrues per round and about ten rounds of ordinary play covers a
 * float that no one has to pay for out of pocket.
 *
 * Only then is `SwitchToStonkPitEntropy` worth running, and by that point the
 * money is already there and the switch is a pointer change that can be
 * reversed in one transaction.
 *
 * The three other treasuries are read from the router and written back
 * unchanged rather than restated here, because `setTreasuries` takes all four
 * and hardcoding them is how one gets quietly redirected during an unrelated
 * change. Accrued balances migrate with the destination, so the surcharge
 * already banked against the old address follows it across.
 */
contract DeployStonkPitEntropy is Script {
    /// @dev The MultiConductor. Registry and lanes are frozen, per StonkPit.
    address constant CONDUCTOR = 0x003e29260EF2f762e7f2d95C3d2b7A7f6234BcDE;

    function run() external {
        address admin = vm.envAddress("ROBACHA_ADMIN");
        address gacha = vm.envAddress("ROBACHA_GACHA");
        IFeeRouter router = IFeeRouter(vm.envAddress("ROBACHA_FEE_ROUTER"));

        address protocol = router.protocolTreasury();
        address operations = router.operationsTreasury();
        address rewardReserve = router.rewardReserveTreasury();
        address randomnessBefore = router.randomnessTreasury();

        console2.log("randomness treasury before", randomnessBefore);
        console2.log("already accrued to it     ", router.accrued(randomnessBefore));

        vm.startBroadcast();

        RobachaStonkPitEntropy entropy = new RobachaStonkPitEntropy(admin, CONDUCTOR, gacha);

        // Only the randomness destination moves. The other three are written
        // back exactly as read.
        router.setTreasuries(protocol, operations, rewardReserve, address(entropy));

        vm.stopBroadcast();

        (bool ready, string memory reason) = entropy.isReady();

        console2.log("");
        console2.log("adapter deployed at   ", address(entropy));
        console2.log("randomness treasury   ", router.randomnessTreasury());
        console2.log("migrated accrual      ", router.accrued(address(entropy)));
        console2.log("float balance         ", address(entropy).balance);
        console2.log("guaranteed rounds     ", entropy.runwayRounds());
        console2.log("isReady               ", ready);
        console2.log("reason                ", reason);
        console2.log("");
        console2.log("The gacha still draws from its existing source. Nothing has switched.");
        console2.log("Let the float fill, then run SwitchToStonkPitEntropy.");

        require(router.randomnessTreasury() == address(entropy), "surcharge is not routed to the adapter");
        require(router.protocolTreasury() == protocol, "protocol treasury moved");
        require(router.operationsTreasury() == operations, "operations treasury moved");
        require(router.rewardReserveTreasury() == rewardReserve, "reward reserve treasury moved");
    }
}
