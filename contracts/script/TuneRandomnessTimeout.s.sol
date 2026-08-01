// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

interface IGacha {
    function setRandomnessTimeout(uint32 timeout) external;
    function randomnessTimeout() external view returns (uint32);
}

/**
 * @notice Widens the randomness timeout so an erratic keeper stops causing
 *         refunds.
 *
 * Rounds 10 through 13 refunded for "randomness timeout" while every part of
 * the keeper was healthy — gas, commitments, secrets and the endpoint all
 * checked out. The cause was cadence. The keeper is scheduled every five
 * minutes on GitHub Actions but observed runs #24, #25 and #26 span eight
 * hours: roughly one wake-up every four. GitHub treats cron as best-effort and
 * drops scheduled runs freely.
 *
 * A two-hour timeout against a four-hour keeper fails more often than it
 * succeeds, so this raises it to eight — comfortably past the observed gap.
 *
 * This is a mitigation, not the fix. It buys headroom; it does not make the
 * keeper punctual. The real repair is an external pinger calling /api/keeper
 * every minute or two, and once that is running this can come back down.
 *
 * The cost of raising it is honest and worth stating: when a draw genuinely
 * cannot be completed, entrants now wait eight hours rather than two before
 * their refund unlocks. That is the trade — fewer refunds overall, slower
 * refunds in the cases that still fail.
 */
contract TuneRandomnessTimeout is Script {
    /// Roughly twice the observed keeper gap. Contract allows 10 min to 24 h.
    uint32 constant NEW_TIMEOUT = 8 hours;

    function run() external {
        IGacha gacha = IGacha(vm.envAddress("ROBACHA_GACHA"));

        uint32 before = gacha.randomnessTimeout();
        console2.log("current timeout (s)", before);

        vm.startBroadcast();
        gacha.setRandomnessTimeout(NEW_TIMEOUT);
        vm.stopBroadcast();

        uint32 nowSet = gacha.randomnessTimeout();
        console2.log("new timeout (s)    ", nowSet);
        require(nowSet == NEW_TIMEOUT, "timeout did not take effect");
    }
}
