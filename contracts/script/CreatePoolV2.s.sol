// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaPoolRegistry} from "../src/RobachaPoolRegistry.sol";

contract CreatePoolV2 is Script {
    function run() external {
        address registryAddress = vm.envAddress("ROBACHA_POOL_REGISTRY");
        require(registryAddress != address(0), "ROBACHA_POOL_REGISTRY is required");

        RobachaPoolRegistry registry = RobachaPoolRegistry(registryAddress);
        console2.log("Running on chain ID:", block.chainid);
        console2.log("Registry address:", registryAddress);

        vm.startBroadcast();

        // 1. Create pool version 2
        console2.log("Creating Pool 1 Version 2...");
        uint256 version = registry.createPoolVersion(1, "Genesis Pool v2");
        console2.log("Version created:", version);

        // 2. Set Economics (baseSpinPrice = 0.0005 ETH, surcharge = 0.0001 ETH)
        console2.log("Setting economics...");
        registry.setEconomics(1, version, 500000000000000, 100000000000000);

        // 3. Set Round Config (maxEntries = 5, duration = 120s, maxQuantityPerTx = 2, maxQuantityPerWallet = 5)
        console2.log("Setting round config...");
        registry.setRoundConfig(1, version, 5, 120, 2, 5);

        // 4. Set Probabilities
        console2.log("Setting probabilities...");
        uint16[] memory probs = new uint16[](3);
        probs[0] = 7000;
        probs[1] = 2500;
        probs[2] = 500;
        registry.setProbabilities(1, version, probs);

        // 5. Add Reward 0 (CASHCAT, tier 0, range 1 to 50 tokens)
        console2.log("Adding reward slots...");
        address cashcat = 0x020bfC650A365f8BB26819deAAbF3E21291018b4;
        address token4663 = 0xd4052415613B34Af236024B895574c467f65b6dD;

        registry.setTokenAllowlisted(cashcat, true);
        registry.addReward(1, version, cashcat, 0, 1000000000000000000, 50000000000000000000);

        // 6. Add Reward 1 (4663, tier 1, range 5 to 10 tokens)
        registry.addReward(1, version, token4663, 1, 5000000000000000000, 10000000000000000000);

        // 7. Add Reward 2 (CASHCAT, tier 2, range 5 to 10 tokens)
        registry.addReward(1, version, cashcat, 2, 5000000000000000000, 10000000000000000000);

        // 8. Activate version 2
        console2.log("Activating version...");
        registry.activate(1, version, 0, 0);

        vm.stopBroadcast();
        console2.log("Pool 1 Version 2 successfully created, configured, and activated!");
    }
}
