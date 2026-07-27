// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaFeeRouter} from "../src/RobachaFeeRouter.sol";
import {RobachaGacha} from "../src/RobachaGacha.sol";
import {RobachaPoolRegistry} from "../src/RobachaPoolRegistry.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {RobachaSponsorRegistry} from "../src/RobachaSponsorRegistry.sol";
import {RobachaRandomnessReceiver} from "../src/randomness/RobachaRandomnessReceiver.sol";
import {RobachaRandomnessSender} from "../src/randomness/RobachaRandomnessSender.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {RobachaDeployConfig} from "./Config.sol";

/**
 * @title TransferRoles
 * @notice Hands every privilege to the admin address and strips the deployer.
 *
 * @dev Run under the deployer signer, after `Verify` reports the wiring is
 *      correct. The order matters: each role is granted to the admin before the
 *      deployer renounces it, so there is never a moment where a contract has
 *      no administrator.
 *
 *      After this, the deployer holds nothing. Recovering from a lost admin key
 *      would require redeploying, which is the deliberate trade-off of a
 *      non-upgradeable system.
 */
contract TransferRoles is Script {
    function run() external {
        require(block.chainid == RobachaDeployConfig.ROBINHOOD_CHAIN_ID, "wrong chain: expected Robinhood Chain 4663");

        address admin = vm.envAddress("ROBACHA_ADMIN_ADDRESS");
        address deployer = msg.sender;
        require(admin != address(0), "ROBACHA_ADMIN_ADDRESS is required");
        require(admin != deployer, "admin and deployer are the same address: nothing to transfer");

        RobachaFeeRouter feeRouter = RobachaFeeRouter(payable(vm.envAddress("ROBACHA_FEE_ROUTER")));
        RobachaRewardVault vault = RobachaRewardVault(vm.envAddress("ROBACHA_REWARD_VAULT"));
        RobachaPoolRegistry registry = RobachaPoolRegistry(vm.envAddress("ROBACHA_POOL_REGISTRY"));
        RobachaGacha gacha = RobachaGacha(payable(vm.envAddress("ROBACHA_GACHA")));
        RobachaRandomnessSender sender = RobachaRandomnessSender(payable(vm.envAddress("ROBACHA_RANDOMNESS_SENDER")));
        RobachaRandomnessReceiver receiver = RobachaRandomnessReceiver(vm.envAddress("ROBACHA_RANDOMNESS_RECEIVER"));
        RobachaSponsorRegistry sponsors = RobachaSponsorRegistry(vm.envAddress("ROBACHA_SPONSOR_REGISTRY"));

        console2.log("Transferring all roles from", deployer, "to", admin);

        vm.startBroadcast();

        // The fee router's admin is already the admin address, so only the
        // gacha's routing role needs granting — and only the admin can do it.
        // That grant is therefore performed by GrantGachaRole, under the admin.

        _handOver(IAccessControl(address(vault)), admin, deployer, RobachaRoles.VAULT_MANAGER_ROLE);
        _handOver(IAccessControl(address(vault)), admin, deployer, RobachaRoles.PAUSER_ROLE);
        _handOverDefaultAdmin(IAccessControl(address(vault)), admin, deployer);

        _handOver(IAccessControl(address(registry)), admin, deployer, RobachaRoles.POOL_MANAGER_ROLE);
        _handOverDefaultAdmin(IAccessControl(address(registry)), admin, deployer);

        _handOver(IAccessControl(address(gacha)), admin, deployer, RobachaRoles.PAUSER_ROLE);
        _handOverDefaultAdmin(IAccessControl(address(gacha)), admin, deployer);

        _handOver(IAccessControl(address(sender)), admin, deployer, RobachaRoles.TREASURY_ROLE);
        _handOverDefaultAdmin(IAccessControl(address(sender)), admin, deployer);

        _handOverDefaultAdmin(IAccessControl(address(receiver)), admin, deployer);

        _handOver(IAccessControl(address(sponsors)), admin, deployer, RobachaRoles.POOL_MANAGER_ROLE);
        _handOverDefaultAdmin(IAccessControl(address(sponsors)), admin, deployer);

        vm.stopBroadcast();

        console2.log("---- Post-transfer check ----");
        _report("vault  admin", IAccessControl(address(vault)), deployer);
        _report("registry admin", IAccessControl(address(registry)), deployer);
        _report("gacha  admin", IAccessControl(address(gacha)), deployer);
        _report("sender admin", IAccessControl(address(sender)), deployer);
        _report("receiver admin", IAccessControl(address(receiver)), deployer);
        _report("sponsors admin", IAccessControl(address(sponsors)), deployer);
        console2.log("");
        console2.log("STILL REQUIRED, under the admin signer:");
        console2.log("  feeRouter.grantRole(GACHA_ROLE, gacha)   -- run GrantGachaRole");
        console2.log("  feeRouter DEFAULT_ADMIN_ROLE is already the admin address.");
    }

    function _handOver(IAccessControl target, address admin, address deployer, bytes32 role) internal {
        if (!target.hasRole(role, admin)) target.grantRole(role, admin);
        if (target.hasRole(role, deployer)) target.renounceRole(role, deployer);
    }

    function _handOverDefaultAdmin(IAccessControl target, address admin, address deployer) internal {
        if (!target.hasRole(0x00, admin)) target.grantRole(0x00, admin);
        if (target.hasRole(0x00, deployer)) target.renounceRole(0x00, deployer);
    }

    function _report(string memory label, IAccessControl target, address deployer) internal view {
        console2.log(label, "- deployer still admin:", target.hasRole(0x00, deployer));
    }
}

/**
 * @notice Grants the gacha the fee router's routing role.
 * @dev Separate because the fee router's admin is the admin address from
 *      construction, so this must be signed by the admin, not the deployer.
 */
contract GrantGachaRole is Script {
    function run() external {
        RobachaFeeRouter feeRouter = RobachaFeeRouter(payable(vm.envAddress("ROBACHA_FEE_ROUTER")));
        address gacha = vm.envAddress("ROBACHA_GACHA");

        console2.log("Granting GACHA_ROLE on the fee router to", gacha);

        vm.startBroadcast();
        feeRouter.grantRole(RobachaRoles.GACHA_ROLE, gacha);
        vm.stopBroadcast();

        require(feeRouter.hasRole(RobachaRoles.GACHA_ROLE, gacha), "grant did not take effect");
        console2.log("Granted.");
    }
}
