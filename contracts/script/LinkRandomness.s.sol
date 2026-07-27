// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {EthereumRobachaRandomnessCoordinator} from "../src/randomness/EthereumRobachaRandomnessCoordinator.sol";
import {RobachaRandomnessReceiver} from "../src/randomness/RobachaRandomnessReceiver.sol";
import {RobachaRandomnessSender} from "../src/randomness/RobachaRandomnessSender.sol";
import {RobachaDeployConfig} from "./Config.sol";

/**
 * @notice Points the Robinhood-side contracts at the Ethereum coordinator.
 * @dev Run on Robinhood Chain, after both sides are deployed.
 */
contract LinkRandomnessRobinhood is Script {
    function run() external {
        require(block.chainid == RobachaDeployConfig.ROBINHOOD_CHAIN_ID, "wrong chain: expected Robinhood Chain 4663");

        RobachaRandomnessSender sender = RobachaRandomnessSender(payable(vm.envAddress("ROBACHA_RANDOMNESS_SENDER")));
        RobachaRandomnessReceiver receiver = RobachaRandomnessReceiver(vm.envAddress("ROBACHA_RANDOMNESS_RECEIVER"));
        address coordinator = vm.envAddress("ROBACHA_ETHEREUM_COORDINATOR");

        require(coordinator != address(0), "ROBACHA_ETHEREUM_COORDINATOR is required");

        console2.log("Linking Robinhood randomness to Ethereum coordinator:", coordinator);
        console2.log("Ethereum CCIP selector:", RobachaDeployConfig.ETHEREUM_CCIP_SELECTOR);

        vm.startBroadcast();
        sender.setDestination(RobachaDeployConfig.ETHEREUM_CCIP_SELECTOR, coordinator);
        receiver.setSource(RobachaDeployConfig.ETHEREUM_CCIP_SELECTOR, coordinator);
        vm.stopBroadcast();

        (bool ready, string memory reason) = sender.isReady();
        console2.log("Sender ready:", ready);
        if (!ready) console2.log("Reason:", reason);
        console2.log("If the reason is a fee balance, send native ETH to the sender via fundFees().");
    }
}

/**
 * @notice Points the Ethereum coordinator back at the Robinhood contracts.
 * @dev Run on Ethereum, after both sides are deployed.
 */
contract LinkRandomnessEthereum is Script {
    function run() external {
        require(block.chainid == RobachaDeployConfig.ETHEREUM_CHAIN_ID, "wrong chain: expected Ethereum mainnet");

        EthereumRobachaRandomnessCoordinator coordinator =
            EthereumRobachaRandomnessCoordinator(payable(vm.envAddress("ROBACHA_ETHEREUM_COORDINATOR")));
        address sender = vm.envAddress("ROBACHA_RANDOMNESS_SENDER");
        address receiver = vm.envAddress("ROBACHA_RANDOMNESS_RECEIVER");
        uint256 returnGasLimit = vm.envOr("ROBACHA_RETURN_GAS_LIMIT", uint256(500_000));

        require(sender != address(0) && receiver != address(0), "sender and receiver addresses are required");

        console2.log("Linking Ethereum coordinator to Robinhood Chain");
        console2.log("Robinhood CCIP selector:", RobachaDeployConfig.ROBINHOOD_CCIP_SELECTOR);
        console2.log("Authorised source sender:", sender);
        console2.log("Return receiver         :", receiver);

        vm.startBroadcast();
        coordinator.setReturnPath(RobachaDeployConfig.ROBINHOOD_CCIP_SELECTOR, sender, receiver, returnGasLimit);
        vm.stopBroadcast();

        (bool ready, string memory reason) = coordinator.isReady();
        console2.log("Coordinator ready:", ready);
        if (!ready) console2.log("Reason:", reason);
    }
}
