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
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {RobachaDeployConfig} from "./Config.sol";

/**
 * @title DeployRobinhood
 * @notice Deploys and wires the Robinhood Chain half of ROBACHA.
 *
 * Run it first with no `--broadcast` to get a full dry run: every constructor
 * argument, the gas the deployment needs and the fee that implies, printed
 * before anything is signed.
 *
 * @dev What this script deliberately does NOT do:
 *
 *      - It does not set a randomness destination. That needs the Ethereum
 *        coordinator's address, which only exists after `DeployEthereum`.
 *      - It does not create, fund or activate a pool. A pool cannot be
 *        activated until real reward inventory is in the vault, and inventory
 *        is a treasury action, not a deployment step.
 *      - It does not renounce the deployer's roles. That is `TransferRoles`,
 *        run once the wiring has been verified.
 *
 *      The deployer never appears in source. Signing is supplied by
 *      `--account <keystore>`, which prompts for the password in the operator's
 *      own terminal; no private key is read, logged or stored by this script.
 */
contract DeployRobinhood is Script {
    struct Deployment {
        address feeRouter;
        address vault;
        address registry;
        address gacha;
        address randomnessSender;
        address randomnessReceiver;
        address sponsorRegistry;
    }

    function run() external returns (Deployment memory deployment) {
        address admin = vm.envAddress("ROBACHA_ADMIN_ADDRESS");
        address protocolTreasury = vm.envAddress("ROBACHA_TREASURY_ADDRESS");
        address operationsTreasury = vm.envAddress("ROBACHA_OPERATIONS_TREASURY");
        address rewardTreasury = vm.envAddress("ROBACHA_REWARD_RESERVE_TREASURY");
        address randomnessTreasury = vm.envAddress("ROBACHA_RANDOMNESS_TREASURY");

        require(block.chainid == RobachaDeployConfig.ROBINHOOD_CHAIN_ID, "wrong chain: expected Robinhood Chain 4663");
        require(admin != address(0), "ROBACHA_ADMIN_ADDRESS is required");

        address deployer = msg.sender;

        console2.log("================ ROBACHA deployment: Robinhood Chain ================");
        console2.log("Network                 : Robinhood Chain");
        console2.log("Chain ID                :", block.chainid);
        console2.log("Deployer                :", deployer);
        console2.log("Deployer balance (wei)  :", deployer.balance);
        console2.log("Admin                   :", admin);
        console2.log("Protocol treasury       :", protocolTreasury);
        console2.log("Operations treasury     :", operationsTreasury);
        console2.log("Reward reserve treasury :", rewardTreasury);
        console2.log("Randomness treasury     :", randomnessTreasury);
        console2.log("CCIP router             :", RobachaDeployConfig.ROBINHOOD_CCIP_ROUTER);
        console2.log("CCIP selector (this)    :", RobachaDeployConfig.ROBINHOOD_CCIP_SELECTOR);
        console2.log("Randomness architecture : CCIP -> Ethereum VRF v2.5 -> CCIP");
        console2.log("Fee split (bps)         : protocol 1200 / operations 300 / reward reserve 8500");
        console2.log("Gas price (wei)         :", tx.gasprice);
        console2.log("==================================================================");

        require(deployer.balance > 0, "deployer has no native balance: fund it before broadcasting");

        vm.startBroadcast();

        RobachaFeeRouter feeRouter = new RobachaFeeRouter(
            admin,
            protocolTreasury,
            operationsTreasury,
            rewardTreasury,
            randomnessTreasury,
            RobachaDeployConfig.PROTOCOL_FEE_BPS,
            RobachaDeployConfig.OPERATIONS_FEE_BPS,
            RobachaDeployConfig.REWARD_RESERVE_BPS
        );

        // The deployer holds admin briefly so it can wire the system, then hands
        // it to the real admin in `TransferRoles`.
        RobachaRewardVault vault = new RobachaRewardVault(deployer);
        RobachaPoolRegistry registry = new RobachaPoolRegistry(deployer, vault, feeRouter);
        RobachaGacha gacha = new RobachaGacha(deployer, registry, vault, feeRouter);

        RobachaRandomnessSender randomnessSender =
            new RobachaRandomnessSender(deployer, IRouterClient(RobachaDeployConfig.ROBINHOOD_CCIP_ROUTER));
        RobachaRandomnessReceiver randomnessReceiver =
            new RobachaRandomnessReceiver(deployer, RobachaDeployConfig.ROBINHOOD_CCIP_ROUTER);

        RobachaSponsorRegistry sponsorRegistry = new RobachaSponsorRegistry(deployer, vault);

        // ---- Wiring ----
        vault.grantRole(RobachaRoles.GACHA_ROLE, address(gacha));
        registry.setGacha(address(gacha));

        gacha.setRandomnessSender(randomnessSender);
        gacha.setRandomnessReceiver(address(randomnessReceiver));

        randomnessSender.setGacha(address(gacha));
        randomnessReceiver.setGacha(gacha);

        vm.stopBroadcast();

        // `GACHA_ROLE` on the fee router is held by the admin, not the deployer,
        // so it is granted in `TransferRoles` under the admin signer.

        deployment = Deployment({
            feeRouter: address(feeRouter),
            vault: address(vault),
            registry: address(registry),
            gacha: address(gacha),
            randomnessSender: address(randomnessSender),
            randomnessReceiver: address(randomnessReceiver),
            sponsorRegistry: address(sponsorRegistry)
        });

        console2.log("---------------- Deployed addresses ----------------");
        console2.log("RobachaFeeRouter          :", deployment.feeRouter);
        console2.log("RobachaRewardVault        :", deployment.vault);
        console2.log("RobachaPoolRegistry       :", deployment.registry);
        console2.log("RobachaGacha              :", deployment.gacha);
        console2.log("RobachaRandomnessSender   :", deployment.randomnessSender);
        console2.log("RobachaRandomnessReceiver :", deployment.randomnessReceiver);
        console2.log("RobachaSponsorRegistry    :", deployment.sponsorRegistry);
        console2.log("----------------------------------------------------");
        console2.log("NEXT: deploy the Ethereum coordinator, then run LinkRandomness on both chains.");
    }
}
