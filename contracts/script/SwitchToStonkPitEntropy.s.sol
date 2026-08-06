// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaStonkPitEntropy} from "../src/randomness/RobachaStonkPitEntropy.sol";

interface IGachaAdmin {
    function randomnessSender() external view returns (address);
    function randomnessReceiver() external view returns (address);
    function setRandomnessSender(address sender) external;
    function setRandomnessReceiver(address receiver) external;
}

/**
 * @notice Points the gacha's randomness at the StonkPit adapter.
 *
 * @dev This is the step that changes what players actually draw from, and it
 *      is one script on its own for that reason. Run it only after
 *      `DeployStonkPitEntropy` and only once the float has filled from the
 *      surcharge.
 *
 * BOTH POINTERS MOVE, AND THEY HAVE TO MOVE TOGETHER
 *
 * `randomnessSender` is who the gacha asks; `randomnessReceiver` is who it
 * will accept an answer from. The adapter is both — it buys the word and
 * hands it back itself. Moving one without the other leaves the gacha asking
 * a source whose replies it then refuses, and every round times out and
 * refunds. They are set in one transaction here so there is no window where
 * that is true.
 *
 * THE PREFLIGHT IS NOT DECORATION
 *
 * A thin float does not fail loudly. `isReady` returning false makes the gacha
 * stop selling spins, which is the correct behaviour and also an outage. So
 * this refuses to switch unless the adapter is ready and holds real runway at
 * the fee ceiling, rather than switching and finding out on the first round.
 *
 * REVERSING IT
 *
 * Both setters are plain admin calls, so pointing them back at the previous
 * source is one transaction. The old source is printed below before anything
 * changes — keep it. Nothing about this migrates state, so going back costs
 * only the rounds in flight at the time.
 */
contract SwitchToStonkPitEntropy is Script {
    /// @dev Refuse to switch with less runway than this at the fee ceiling.
    uint256 constant MIN_RUNWAY_ROUNDS = 20;

    function run() external {
        IGachaAdmin gacha = IGachaAdmin(vm.envAddress("ROBACHA_GACHA"));
        RobachaStonkPitEntropy entropy = RobachaStonkPitEntropy(payable(vm.envAddress("ROBACHA_STONKPIT_ENTROPY")));

        address senderBefore = gacha.randomnessSender();
        address receiverBefore = gacha.randomnessReceiver();

        console2.log("PREVIOUS sender  ", senderBefore);
        console2.log("PREVIOUS receiver", receiverBefore);
        console2.log("  keep these: pointing back at them is how this is undone");
        console2.log("");

        (bool ready, string memory reason) = entropy.isReady();
        uint256 runway = entropy.runwayRounds();

        console2.log("float balance    ", address(entropy).balance);
        console2.log("guaranteed rounds", runway);
        console2.log("isReady          ", ready);
        console2.log("reason           ", reason);

        require(ready, "adapter is not ready - a thin float stops spins being sold");
        require(runway >= MIN_RUNWAY_ROUNDS, "not enough runway at the fee ceiling - let the float fill");

        vm.startBroadcast();
        gacha.setRandomnessSender(address(entropy));
        gacha.setRandomnessReceiver(address(entropy));
        vm.stopBroadcast();

        console2.log("");
        console2.log("sender now  ", gacha.randomnessSender());
        console2.log("receiver now", gacha.randomnessReceiver());

        require(gacha.randomnessSender() == address(entropy), "sender did not move");
        require(gacha.randomnessReceiver() == address(entropy), "receiver did not move");
    }
}
