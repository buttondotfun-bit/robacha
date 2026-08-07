// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaAutoBuyer} from "../src/RobachaAutoBuyer.sol";

interface IRegistry {
    function setTokenAllowlisted(address token, bool allowlisted) external;
}

/**
 * Allowlists INDEX and routes the auto-buyer to the pool it actually trades in.
 *
 * Two contracts have to hear about a new reward token: the registry permits it
 * as a prize, and the buyer learns how to buy it. Missing the second is silent
 * — allowlisted, published, and then the first restock finds no route.
 *
 * INDEX has both a V4 ETH pool and a V3 WETH pool. The V3 pool is the deeper
 * and far busier market — 100.9 WETH against 12.7m tokens, $1.48m of daily
 * volume, versus the V4 pool's ~$175k — so the route goes there. It is a Gekko
 * V3 pool at the 1% tier, reached through the same SwapRouter02 that already
 * carries MANCER, THROBBIN and DERP, so the path shape is identical to theirs:
 * WETH, the fee, then the token.
 *
 * Verified on a fork before writing this: with the route set, 0.05 ETH bought
 * 10,037 INDEX and it reached the vault.
 */
contract AddIndex is Script {
    address constant REGISTRY = 0x90C67101D36925D573C862A1eD3469b3233F3E51;
    address constant AUTO_BUYER = 0x694a2B0C23FC40e2ec140b549c075859a78041CF;
    address constant GEKKO_ROUTER = 0xCaf681a66D020601342297493863E78C959E5cb2;

    /// The Index on Robinhood Chain. Verified: symbol "Index", 18 decimals.
    address constant INDEX = 0x56910D4409F3a0C78C64DD8D0545FF0705389870;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    function run() external {
        vm.startBroadcast();

        IRegistry(REGISTRY).setTokenAllowlisted(INDEX, true);

        // WETH -> 1% fee -> INDEX, matching the deep Gekko V3 pool.
        bytes memory path = abi.encodePacked(WETH, uint24(10000), INDEX);
        RobachaAutoBuyer(payable(AUTO_BUYER)).setBuyRouteV3(INDEX, GEKKO_ROUTER, path);

        vm.stopBroadcast();

        console2.log("INDEX allowlisted and routed via Gekko V3 (1% tier)");
        console2.log("  token :", INDEX);
        console2.log("  buyer :", AUTO_BUYER);
    }
}
