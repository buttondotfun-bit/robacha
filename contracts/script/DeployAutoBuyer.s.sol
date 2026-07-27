// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaAutoBuyer} from "../src/RobachaAutoBuyer.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {RobachaFeeRouter} from "../src/RobachaFeeRouter.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";

/**
 * @title DeployAutoBuyer
 * @notice Deploys the RobachaAutoBuyer contract, grants it VAULT_MANAGER_ROLE on
 *         the vault, and redirects the FeeRouter's reward reserve treasury to it.
 */
contract DeployAutoBuyer is Script {
    function run() external returns (address autoBuyerAddress) {
        address admin = vm.envAddress("ROBACHA_ADMIN_ADDRESS");
        address feeRouterAddress = vm.envAddress("ROBACHA_FEE_ROUTER");
        address vaultAddress = vm.envAddress("ROBACHA_REWARD_VAULT");

        require(admin != address(0), "ROBACHA_ADMIN_ADDRESS is required");
        require(feeRouterAddress != address(0), "ROBACHA_FEE_ROUTER is required");
        require(vaultAddress != address(0), "ROBACHA_REWARD_VAULT is required");

        console2.log("Deploying AutoBuyer...");
        console2.log("Admin Address:", admin);
        console2.log("Vault Address:", vaultAddress);
        console2.log("FeeRouter Address:", feeRouterAddress);

        vm.startBroadcast();

        // 1. Deploy AutoBuyer
        RobachaAutoBuyer autoBuyer = new RobachaAutoBuyer(admin, vaultAddress);
        autoBuyerAddress = address(autoBuyer);

        // 2. Grant VAULT_MANAGER_ROLE to AutoBuyer on RewardVault
        RobachaRewardVault vault = RobachaRewardVault(vaultAddress);
        vault.grantRole(RobachaRoles.VAULT_MANAGER_ROLE, autoBuyerAddress);

        // 3. Point FeeRouter's rewardReserveTreasury to AutoBuyer
        RobachaFeeRouter feeRouter = RobachaFeeRouter(payable(feeRouterAddress));
        feeRouter.setTreasuries(
            feeRouter.protocolTreasury(),
            feeRouter.operationsTreasury(),
            autoBuyerAddress,
            feeRouter.randomnessTreasury()
        );

        vm.stopBroadcast();

        console2.log("RobachaAutoBuyer deployed at:", autoBuyerAddress);
        console2.log("AutoBuyer granted VAULT_MANAGER_ROLE on Vault");
        console2.log("FeeRouter reward reserve treasury pointed to AutoBuyer");
    }
}
