// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaRaffle} from "../src/RobachaRaffle.sol";

/**
 * Deploys one Meebit raffle and funds its draw float.
 *
 * The raffle is deliberately single-use and immutable: a fresh contract per
 * raffle, its rules fixed in the constructor, nothing upgradeable. That is the
 * whole safety story — a buyer can read the ticket price, the caps, the window
 * and the conductor once and know they cannot change under them.
 *
 * Three things are set here and cannot move afterward:
 *
 *   - TICKET_PRICE_WEI: the on-chain price of one ticket. The page says "$10",
 *     but the chain settles in ETH, so this is a fixed ETH amount set to about
 *     $10 at deploy time. Pass RAFFLE_TICKET_PRICE_WEI to match the live ETH
 *     price on the day; the default below is ~$10 at $3,600/ETH.
 *   - OPEN_AT: the unix second the 24-hour window starts. Defaults to now.
 *   - The draw float: ETH set aside to pay the conductor for the winning word,
 *     kept entirely separate from ticket money so a stranded draw can never
 *     leave refunds short. A few tenths of a milli-ether is plenty.
 *
 * After deploy, the printed address goes into NEXT_PUBLIC_ROBACHA_RAFFLE_ADDRESS
 * so the page can read it and open ticket sales.
 */
contract DeployRaffle is Script {
    /// The keeper/admin that already runs the gacha. Claims proceeds, funds the
    /// float, and is the only privileged actor — it cannot pick the winner.
    address constant ADMIN = 0x19BF0B60852Afa668b261D3020A1A4321362e68D;
    /// The same StonkPit conductor the gacha's entropy draws from.
    address constant CONDUCTOR = 0x003e29260EF2f762e7f2d95C3d2b7A7f6234BcDE;

    function run() external {
        uint256 ticketPriceWei = vm.envOr("RAFFLE_TICKET_PRICE_WEI", uint256(0.00278 ether));
        uint256 openAt = vm.envOr("RAFFLE_OPEN_AT", block.timestamp);
        uint256 drawFloatWei = vm.envOr("RAFFLE_DRAW_FLOAT_WEI", uint256(0.01 ether));

        vm.startBroadcast();

        RobachaRaffle raffle = new RobachaRaffle(ADMIN, CONDUCTOR, ticketPriceWei, openAt);
        raffle.fundDraw{value: drawFloatWei}();

        vm.stopBroadcast();

        console2.log("RobachaRaffle deployed:", address(raffle));
        console2.log("  ticket price (wei):", ticketPriceWei);
        console2.log("  opens at (unix)   :", openAt);
        console2.log("  closes at (unix)  :", raffle.closesAt());
        console2.log("  draw float (wei)  :", drawFloatWei);
        console2.log("  ticket cap        :", raffle.TICKET_CAP());
        console2.log("  max per wallet    :", raffle.MAX_PER_WALLET());
        console2.log("");
        console2.log("Set NEXT_PUBLIC_ROBACHA_RAFFLE_ADDRESS to the address above.");
    }
}
