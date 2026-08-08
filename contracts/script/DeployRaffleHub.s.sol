// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaRaffleHub} from "../src/RobachaRaffleHub.sol";

/**
 * Deploys the permissionless NFT-raffle launchpad and seeds its draw float.
 *
 * The hub is not upgradeable and holds no per-raffle rules of its own: every
 * raffle's terms are set by its creator at creation and fixed thereafter, and
 * the platform's only levers are pausing *new* listings and moving the shared
 * draw-float / fee balances. Nothing here can touch a live raffle's money or
 * NFT — that is the point, so the constructor takes only the admin and the
 * conductor.
 *
 * The draw float is hub-wide working capital: it pays the conductor for each
 * sold-out raffle's winning word and is recouped from the 10% platform fee.
 * Seed it with enough to cover a handful of concurrent draws; top it up later
 * with `fundDrawFloat`.
 *
 * After deploy, the printed address goes into NEXT_PUBLIC_ROBACHA_RAFFLE_HUB_ADDRESS.
 */
contract DeployRaffleHub is Script {
    /// The keeper/admin that already runs the gacha. Pauses listings, manages
    /// the float and withdraws fees — it can never pick a winner or seize funds.
    address constant ADMIN = 0x19BF0B60852Afa668b261D3020A1A4321362e68D;
    /// The same StonkPit conductor the gacha's entropy draws from.
    address constant CONDUCTOR = 0x003e29260EF2f762e7f2d95C3d2b7A7f6234BcDE;

    function run() external {
        uint256 drawFloatWei = vm.envOr("RAFFLE_HUB_DRAW_FLOAT_WEI", uint256(0.02 ether));

        vm.startBroadcast();

        RobachaRaffleHub hub = new RobachaRaffleHub(ADMIN, CONDUCTOR);
        hub.fundDrawFloat{value: drawFloatWei}();

        vm.stopBroadcast();

        console2.log("RobachaRaffleHub deployed:", address(hub));
        console2.log("  admin            :", ADMIN);
        console2.log("  conductor        :", CONDUCTOR);
        console2.log("  platform fee bps :", hub.PLATFORM_FEE_BPS());
        console2.log("  draw float (wei) :", drawFloatWei);
        console2.log("");
        console2.log("Set NEXT_PUBLIC_ROBACHA_RAFFLE_HUB_ADDRESS to the address above.");
    }
}
