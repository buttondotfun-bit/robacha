// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RobachaRaffle} from "../src/RobachaRaffle.sol";

/**
 * Deploys the Chimper #2272 raffle and funds its draw float.
 *
 * This is a FRESH, separate contract from the earlier Meebit raffle — a raffle
 * is single-use and immutable by design (a new contract per prize, rules fixed
 * in the constructor, nothing upgradeable), so the Meebit's own buyers keep
 * settling/refunding on their contract, untouched, while this one runs the
 * Chimpers draw.
 *
 * The contract is prize-agnostic: it escrows ticket ETH, enforces the caps and
 * window, and draws a winner from the conductor's entropy. It never references
 * the NFT itself, because Chimper #2272 lives on Ethereum and is hand-delivered
 * to the winner cross-chain — the same mechanism the page states plainly.
 *
 * The params the page promises ($10 ticket, 25 max/wallet, 200 tickets, 24h, 1
 * winner) are guaranteed by the contract, not this script: TICKET_CAP (200),
 * MAX_PER_WALLET (25) and WINDOW (24h) are hard-coded constants. Only two values
 * are set at deploy:
 *
 *   - TICKET_PRICE_WEI: the page says "$10", but the chain settles in ETH, so
 *     this is a fixed ETH amount ≈ $10 at deploy time. Pass
 *     RAFFLE_TICKET_PRICE_WEI to match the live ETH price on the day —
 *     ticketPriceWei = round(10 / ethUsdPrice * 1e18). The default below is
 *     ~$10 at $3,600/ETH; DO set the env var so the ticket is genuinely $10.
 *   - OPEN_AT: the unix second the 24-hour window starts. Defaults to now.
 *
 * The draw float is ETH set aside to pay the conductor for the winning word,
 * kept entirely separate from ticket money so a stranded draw can never leave
 * refunds short. A few hundredths of an ether is plenty.
 *
 * After deploy, put the printed address in NEXT_PUBLIC_ROBACHA_CHIMPERS_RAFFLE_ADDRESS
 * (or pin it in lib/config.ts) so the page reads it and opens ticket sales.
 */
contract DeployChimpersRaffle is Script {
    /// The keeper/admin that already runs the gacha and the Meebit raffle.
    /// Claims proceeds, funds the float, and is the only privileged actor — it
    /// cannot pick the winner.
    address constant ADMIN = 0x19BF0B60852Afa668b261D3020A1A4321362e68D;
    /// The same StonkPit conductor the gacha's entropy draws from.
    address constant CONDUCTOR = 0x003e29260EF2f762e7f2d95C3d2b7A7f6234BcDE;

    function run() external {
        // ~$10 at $3,600/ETH by default — OVERRIDE with the wei value of $10 at
        // today's ETH price so the ticket is actually $10 on deploy day.
        uint256 ticketPriceWei = vm.envOr("RAFFLE_TICKET_PRICE_WEI", uint256(0.00278 ether));
        uint256 openAt = vm.envOr("RAFFLE_OPEN_AT", block.timestamp);
        uint256 drawFloatWei = vm.envOr("RAFFLE_DRAW_FLOAT_WEI", uint256(0.01 ether));

        vm.startBroadcast();

        RobachaRaffle raffle = new RobachaRaffle(ADMIN, CONDUCTOR, ticketPriceWei, openAt);
        raffle.fundDraw{value: drawFloatWei}();

        vm.stopBroadcast();

        console2.log("Chimpers raffle (RobachaRaffle) deployed:", address(raffle));
        console2.log("  prize (off-chain) : Chimper #2272 (Ethereum, hand-delivered)");
        console2.log("  ticket price (wei):", ticketPriceWei);
        console2.log("  opens at (unix)   :", openAt);
        console2.log("  closes at (unix)  :", raffle.closesAt());
        console2.log("  draw float (wei)  :", drawFloatWei);
        console2.log("  ticket cap        :", raffle.TICKET_CAP());
        console2.log("  max per wallet    :", raffle.MAX_PER_WALLET());
        console2.log("");
        console2.log("Set NEXT_PUBLIC_ROBACHA_CHIMPERS_RAFFLE_ADDRESS to the address above.");
    }
}
