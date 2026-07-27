// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaFeeRouter} from "../src/RobachaFeeRouter.sol";
import {RobachaGacha} from "../src/RobachaGacha.sol";
import {RobachaPoolRegistry} from "../src/RobachaPoolRegistry.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {RobachaRandomnessReceiver} from "../src/randomness/RobachaRandomnessReceiver.sol";
import {RobachaRandomnessSender} from "../src/randomness/RobachaRandomnessSender.sol";
import {RobachaDeployConfig} from "./Config.sol";

/**
 * @title Verify
 * @notice Read-only post-deployment verification.
 *
 * @dev Every check reads live chain state. It asserts rather than logs, so a
 *      failure stops the run — the point is that "deployment succeeded" is a
 *      conclusion this script reaches, not one an operator asserts.
 *
 *      A green run here still does not mean paid spins are open. It means the
 *      contracts exist, are wired correctly and hold the right permissions.
 *      Inventory, pool activation, CCIP fee funding and the VRF subscription are
 *      checked separately and reported at the end as explicit not-yet items.
 */
contract Verify is Script {
    function run() external view {
        address admin = vm.envAddress("ROBACHA_ADMIN_ADDRESS");

        RobachaFeeRouter feeRouter = RobachaFeeRouter(payable(vm.envAddress("ROBACHA_FEE_ROUTER")));
        RobachaRewardVault vault = RobachaRewardVault(vm.envAddress("ROBACHA_REWARD_VAULT"));
        RobachaPoolRegistry registry = RobachaPoolRegistry(vm.envAddress("ROBACHA_POOL_REGISTRY"));
        RobachaGacha gacha = RobachaGacha(payable(vm.envAddress("ROBACHA_GACHA")));
        RobachaRandomnessSender sender = RobachaRandomnessSender(payable(vm.envAddress("ROBACHA_RANDOMNESS_SENDER")));
        RobachaRandomnessReceiver receiver = RobachaRandomnessReceiver(vm.envAddress("ROBACHA_RANDOMNESS_RECEIVER"));

        console2.log("================ ROBACHA deployment verification ================");
        console2.log("Chain ID:", block.chainid);

        // ---- 1. Bytecode exists at every address ----
        _requireCode(address(feeRouter), "RobachaFeeRouter");
        _requireCode(address(vault), "RobachaRewardVault");
        _requireCode(address(registry), "RobachaPoolRegistry");
        _requireCode(address(gacha), "RobachaGacha");
        _requireCode(address(sender), "RobachaRandomnessSender");
        _requireCode(address(receiver), "RobachaRandomnessReceiver");

        // ---- 2. Wiring ----
        require(address(gacha.registry()) == address(registry), "gacha -> registry mismatch");
        require(address(gacha.vault()) == address(vault), "gacha -> vault mismatch");
        require(address(gacha.feeRouter()) == address(feeRouter), "gacha -> feeRouter mismatch");
        require(address(gacha.randomnessSender()) == address(sender), "gacha -> randomness sender mismatch");
        require(gacha.randomnessReceiver() == address(receiver), "gacha -> randomness receiver mismatch");
        require(registry.gacha() == address(gacha), "registry -> gacha mismatch");
        require(sender.gacha() == address(gacha), "sender -> gacha mismatch");
        require(address(receiver.gacha()) == address(gacha), "receiver -> gacha mismatch");
        console2.log("[ok] contract wiring");

        // ---- 3. Permissions ----
        require(vault.hasRole(RobachaRoles.GACHA_ROLE, address(gacha)), "vault: gacha lacks GACHA_ROLE");
        require(feeRouter.hasRole(RobachaRoles.GACHA_ROLE, address(gacha)), "feeRouter: gacha lacks GACHA_ROLE");
        require(vault.hasRole(0x00, admin), "vault: admin lacks DEFAULT_ADMIN_ROLE");
        require(registry.hasRole(0x00, admin), "registry: admin lacks DEFAULT_ADMIN_ROLE");
        require(gacha.hasRole(0x00, admin), "gacha: admin lacks DEFAULT_ADMIN_ROLE");
        require(feeRouter.hasRole(0x00, admin), "feeRouter: admin lacks DEFAULT_ADMIN_ROLE");
        console2.log("[ok] permissions");

        // ---- 4. Fee configuration ----
        (uint16 protocolBps, uint16 operationsBps, uint16 rewardBps) = feeRouter.currentSplit();
        require(uint256(protocolBps) + operationsBps + rewardBps == 10_000, "fee split does not total 10000 bps");
        require(protocolBps <= feeRouter.MAX_PROTOCOL_FEE_BPS(), "protocol fee above cap");
        require(operationsBps <= feeRouter.MAX_OPERATIONS_FEE_BPS(), "operations fee above cap");
        console2.log("[ok] fee split (bps):", protocolBps, operationsBps, rewardBps);

        // ---- 5. Randomness configuration ----
        require(
            receiver.sourceChainSelector() == RobachaDeployConfig.ETHEREUM_CCIP_SELECTOR,
            "receiver source selector is not Ethereum"
        );
        require(
            sender.destinationChainSelector() == RobachaDeployConfig.ETHEREUM_CCIP_SELECTOR,
            "sender destination selector is not Ethereum"
        );
        require(sender.destinationCoordinator() != address(0), "sender has no destination coordinator");
        require(receiver.sourceCoordinator() != address(0), "receiver has no source coordinator");
        require(
            sender.destinationCoordinator() == receiver.sourceCoordinator(),
            "sender and receiver point at different Ethereum coordinators"
        );
        console2.log("[ok] cross-chain randomness wiring");

        (bool randomnessReady, string memory reason) = sender.isReady();
        console2.log("Randomness ready:", randomnessReady);
        if (!randomnessReady) console2.log("     reason:", reason);

        // ---- 6. Deployer privilege reduction ----
        address deployer = vm.envOr("ROBACHA_DEPLOYER_ADDRESS", address(0));
        if (deployer != address(0)) {
            bool residual = vault.hasRole(0x00, deployer) || registry.hasRole(0x00, deployer)
                || gacha.hasRole(0x00, deployer) || feeRouter.hasRole(0x00, deployer);
            console2.log("Deployer retains admin anywhere:", residual);
            if (residual) console2.log("     -> run TransferRoles before opening paid spins");
        }

        console2.log("================ Launch gates still outstanding ================");
        console2.log("Randomness sender CCIP fee balance (wei):", address(sender).balance);
        console2.log("Pool count issued so far:", registry.nextPoolId() - 1);
        console2.log("Vault token count:", vault.knownTokenCount());
        console2.log("Gacha paused:", gacha.paused());
        console2.log("These are not failures: they are the state the operator must still complete.");
        console2.log("===============================================================");
    }

    function _requireCode(address target, string memory label) internal view {
        require(target.code.length > 0, string.concat("no bytecode at ", label));
        console2.log("[ok] bytecode:", label, target);
    }
}
