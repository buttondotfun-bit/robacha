// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {EthereumRobachaRandomnessCoordinator} from "../src/randomness/EthereumRobachaRandomnessCoordinator.sol";
import {RobachaDeployConfig} from "./Config.sol";

/**
 * @title DeployEthereum
 * @notice Deploys the Ethereum-side randomness coordinator.
 *
 * @dev The VRF subscription id has no default and is never invented. If
 *      `CHAINLINK_VRF_SUBSCRIPTION_ID` is unset the script stops, because a
 *      coordinator without a funded subscription cannot answer a request and
 *      deploying one would create the appearance of a working randomness path.
 *
 *      After this runs, the subscription owner must add the deployed address as
 *      a consumer at https://vrf.chain.link — that is a signed action on
 *      Chainlink's own contract and cannot be performed here.
 */
contract DeployEthereum is Script {
    function run() external returns (address coordinator) {
        require(block.chainid == RobachaDeployConfig.ETHEREUM_CHAIN_ID, "wrong chain: expected Ethereum mainnet");

        address admin = vm.envAddress("ROBACHA_ADMIN_ADDRESS");
        uint256 subscriptionId = vm.envUint("CHAINLINK_VRF_SUBSCRIPTION_ID");
        bytes32 keyHash = vm.envOr("CHAINLINK_VRF_KEY_HASH", RobachaDeployConfig.VRF_KEY_HASH_200_GWEI);
        uint32 callbackGasLimit = uint32(vm.envOr("CHAINLINK_VRF_CALLBACK_GAS_LIMIT", uint256(300_000)));
        uint16 confirmations = uint16(vm.envOr("CHAINLINK_VRF_CONFIRMATIONS", uint256(3)));

        require(admin != address(0), "ROBACHA_ADMIN_ADDRESS is required");
        require(subscriptionId != 0, "CHAINLINK_VRF_SUBSCRIPTION_ID is required: create and fund one at vrf.chain.link");

        address deployer = msg.sender;

        console2.log("================ ROBACHA deployment: Ethereum ================");
        console2.log("Network                : Ethereum mainnet");
        console2.log("Chain ID               :", block.chainid);
        console2.log("Deployer               :", deployer);
        console2.log("Deployer balance (wei) :", deployer.balance);
        console2.log("Admin                  :", admin);
        console2.log("CCIP router            :", RobachaDeployConfig.ETHEREUM_CCIP_ROUTER);
        console2.log("VRF coordinator        :", RobachaDeployConfig.VRF_COORDINATOR);
        console2.log("VRF subscription       :", subscriptionId);
        console2.log("VRF callback gas       :", callbackGasLimit);
        console2.log("VRF confirmations      :", confirmations);
        console2.log("Gas price (wei)        :", tx.gasprice);
        console2.log("===========================================================");

        require(deployer.balance > 0, "deployer has no ETH: fund it before broadcasting");

        vm.startBroadcast();

        EthereumRobachaRandomnessCoordinator deployed = new EthereumRobachaRandomnessCoordinator(
            deployer, RobachaDeployConfig.ETHEREUM_CCIP_ROUTER, RobachaDeployConfig.VRF_COORDINATOR
        );
        deployed.setVRFConfig(subscriptionId, keyHash, callbackGasLimit, confirmations);

        vm.stopBroadcast();

        coordinator = address(deployed);

        console2.log("EthereumRobachaRandomnessCoordinator :", coordinator);
        console2.log("");
        console2.log("REQUIRED NEXT STEP (cannot be done from a script):");
        console2.log("  Add this address as a consumer of VRF subscription", subscriptionId);
        console2.log("  at https://vrf.chain.link, and fund the subscription with LINK.");
        console2.log("  Then run LinkRandomness on both chains.");
    }
}
