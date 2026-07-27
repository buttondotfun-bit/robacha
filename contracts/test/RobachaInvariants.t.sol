// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RobachaBase} from "./RobachaBase.t.sol";
import {RobachaGacha} from "../src/RobachaGacha.sol";
import {RobachaFeeRouter} from "../src/RobachaFeeRouter.sol";
import {RobachaPoolRegistry} from "../src/RobachaPoolRegistry.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {MockCCIPRouter} from "./mocks/MockCCIP.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";

/**
 * @dev Drives the system through realistic sequences so the invariants below
 *      are checked against states a fuzzer reaches on its own, rather than only
 *      the paths a unit test walks deliberately.
 */
contract RobachaHandler is StdInvariant {
    RobachaBaseHarness internal immutable harness;

    address[3] internal actors;
    uint256 public totalEntriesBought;
    uint256 public totalClaims;

    constructor(RobachaBaseHarness harness_, address a, address b, address c) {
        harness = harness_;
        actors[0] = a;
        actors[1] = b;
        actors[2] = c;
    }

    function buySpins(uint256 actorSeed, uint8 quantity) external {
        uint16 q = uint16(bound(quantity, 1, 10));
        address actor = actors[actorSeed % 3];
        try harness.buy(actor, q) {
            totalEntriesBought += q;
        } catch {}
    }

    function advanceAndClose(uint32 secondsForward) external {
        harness.advance(bound(secondsForward, 1, 300));
        try harness.closeOldestOpenRound() {} catch {}
    }

    function fulfilAndSettle(uint256 wordSeed) external {
        try harness.fulfilOldestClosedRound(wordSeed) {} catch {}
        try harness.settleOldest() {} catch {}
    }

    function claimSomething(uint256 actorSeed) external {
        address actor = actors[actorSeed % 3];
        try harness.claimFirstUnclaimed(actor) {
            ++totalClaims;
        } catch {}
    }

    function withdrawRefunds(uint256 actorSeed) external {
        try harness.withdrawRefund(actors[actorSeed % 3]) {} catch {}
    }

    function bound(uint256 value, uint256 min, uint256 max) internal pure returns (uint256) {
        if (max <= min) return min;
        return min + (value % (max - min + 1));
    }
}

/// @dev Thin wrapper exposing the fixture's actions to the handler.
contract RobachaBaseHarness is RobachaBase {
    uint256 public activePoolId;

    function actorA() external view returns (address) {
        return alice;
    }

    function vaultAddr() external view returns (RobachaRewardVault) {
        return vault;
    }

    function gachaAddr() external view returns (RobachaGacha) {
        return gacha;
    }

    function registryAddr() external view returns (RobachaPoolRegistry) {
        return registry;
    }

    function feeRouterAddr() external view returns (RobachaFeeRouter) {
        return feeRouter;
    }

    function actorB() external view returns (address) {
        return bob;
    }

    function actorC() external view returns (address) {
        return carol;
    }

    function init() external {
        activePoolId = _createStandardPool();
    }

    function buy(address who, uint16 quantity) external {
        _spin(who, activePoolId, quantity);
    }

    function advance(uint256 secondsForward) external {
        vm.warp(block.timestamp + secondsForward);
    }

    function closeOldestOpenRound() external {
        for (uint256 roundId = 1; roundId < gacha.nextRoundId(); ++roundId) {
            RobachaGacha.Round memory round = gacha.getRound(roundId);
            if (round.state == RobachaGacha.RoundState.Open && block.timestamp >= round.closesAt) {
                gacha.closeRound(roundId);
                return;
            }
        }
        revert("no closable round");
    }

    function fulfilOldestClosedRound(uint256 wordSeed) external {
        for (uint256 roundId = 1; roundId < gacha.nextRoundId(); ++roundId) {
            RobachaGacha.Round memory round = gacha.getRound(roundId);
            if (round.state == RobachaGacha.RoundState.Closed && round.entryCount > 0) {
                _fulfilRound(roundId, uint256(keccak256(abi.encode(wordSeed, roundId))));
                return;
            }
        }
        revert("nothing to fulfil");
    }

    function settleOldest() external {
        for (uint256 roundId = 1; roundId < gacha.nextRoundId(); ++roundId) {
            if (gacha.getRound(roundId).state == RobachaGacha.RoundState.RandomnessReceived) {
                gacha.settleEntries(roundId, 25);
                return;
            }
        }
        revert("nothing to settle");
    }

    function claimFirstUnclaimed(address who) external {
        uint256[] memory rewards = gacha.rewardsOf(who);
        for (uint256 i = 0; i < rewards.length; ++i) {
            if (!gacha.getReward(rewards[i]).claimed) {
                vm.prank(who);
                gacha.claim(rewards[i]);
                return;
            }
        }
        revert("nothing to claim");
    }

    function withdrawRefund(address who) external {
        vm.prank(who);
        gacha.withdrawRefund();
    }
}

/**
 * @notice The invariants the whole system rests on.
 *
 * Each one is a property that must hold no matter what order the handler
 * exercises spins, closures, fulfilments, settlements, claims and refunds in.
 */
contract RobachaInvariantsTest is RobachaBase {
    RobachaBaseHarness internal harness;
    RobachaHandler internal handler;

    function setUp() public override {
        super.setUp();

        harness = new RobachaBaseHarness();
        harness.setUp();
        harness.init();

        handler = new RobachaHandler(harness, harness.actorA(), harness.actorB(), harness.actorC());
        targetContract(address(handler));
    }

    /// @dev Reward liabilities never exceed what the vault actually holds.
    function invariant_liabilitiesNeverExceedHoldings() public view {
        address[] memory tokens = harness.vaultAddr().knownTokens();
        for (uint256 i = 0; i < tokens.length; ++i) {
            assertLe(
                harness.vaultAddr().reserved(tokens[i]),
                IERC20Balance(tokens[i]).balanceOf(address(harness.vaultAddr())),
                "vault promises more than it holds"
            );
        }
    }

    /// @dev Unclaimed assignments are exactly the vault's reserved balance.
    function invariant_unclaimedRewardsAreExactlyReserved() public view {
        RobachaGacha g = harness.gachaAddr();
        address[] memory tokens = harness.vaultAddr().knownTokens();

        for (uint256 t = 0; t < tokens.length; ++t) {
            uint256 unclaimed;
            for (uint256 rewardId = 1; rewardId < g.nextRewardId(); ++rewardId) {
                RobachaGacha.Reward memory reward = g.getReward(rewardId);
                if (reward.token == tokens[t] && !reward.claimed) unclaimed += reward.amount;
            }
            assertEq(harness.vaultAddr().reserved(tokens[t]), unclaimed, "reserved must equal unclaimed assignments");
        }
    }

    /// @dev Native balance always covers escrow plus every pending refund.
    function invariant_escrowIsFullyBacked() public view {
        RobachaGacha g = harness.gachaAddr();
        assertGe(address(g).balance, g.totalEscrow() + g.totalRefundable(), "escrow is not fully backed");
    }

    /// @dev Every entry receives at most one assignment.
    function invariant_everyEntryHasAtMostOneAssignment() public view {
        RobachaGacha g = harness.gachaAddr();

        for (uint256 roundId = 1; roundId < g.nextRoundId(); ++roundId) {
            uint256 entries = g.entryCount(roundId);
            for (uint256 i = 0; i < entries; ++i) {
                RobachaGacha.Entry memory entry = g.getEntry(roundId, i);
                // An entry is either unresolved, assigned a reward, or refunded —
                // never both assigned and refunded.
                assertFalse(entry.rewardId != 0 && entry.refunded, "entry both assigned and refunded");
            }
        }
    }

    /// @dev Reward ids are unique and each maps back to its own entry.
    function invariant_rewardIdsAreUniqueAndConsistent() public view {
        RobachaGacha g = harness.gachaAddr();

        for (uint256 rewardId = 1; rewardId < g.nextRewardId(); ++rewardId) {
            RobachaGacha.Reward memory reward = g.getReward(rewardId);
            assertEq(reward.rewardId, rewardId, "reward id mismatch");
            RobachaGacha.Entry memory entry = g.getEntry(reward.roundId, reward.entryIndex);
            assertEq(entry.rewardId, rewardId, "entry does not point back at its reward");
            assertEq(entry.user, reward.user, "reward assigned to a different address than the entry");
        }
    }

    /// @dev A closed round's entry count never grows again.
    function invariant_closedRoundsDoNotGrow() public view {
        RobachaGacha g = harness.gachaAddr();

        for (uint256 roundId = 1; roundId < g.nextRoundId(); ++roundId) {
            RobachaGacha.Round memory round = g.getRound(roundId);
            if (round.state == RobachaGacha.RoundState.Open) continue;
            assertEq(g.entryCount(roundId), round.entryCount, "a non-open round changed size");
        }
    }

    /// @dev Fee accounting reconciles with what was actually received.
    function invariant_feeAccountingReconciles() public view {
        uint256 routed = harness.feeRouterAddr().lifetimeProtocolRevenue()
            + harness.feeRouterAddr().lifetimeOperationsRevenue() + harness.feeRouterAddr().lifetimeRewardReserve();
        assertEq(routed, harness.feeRouterAddr().lifetimeBaseRevenue(), "routed shares must reconstruct base revenue");

        assertGe(
            address(harness.feeRouterAddr()).balance + harness.feeRouterAddr().lifetimeWithdrawn(),
            harness.feeRouterAddr().totalLiabilities(),
            "fee router cannot owe more than it has held"
        );
    }

    /// @dev A settled round holds no escrow, and a round can only settle once.
    function invariant_settledRoundsAreFinal() public view {
        RobachaGacha g = harness.gachaAddr();

        for (uint256 roundId = 1; roundId < g.nextRoundId(); ++roundId) {
            RobachaGacha.Round memory round = g.getRound(roundId);
            if (round.state != RobachaGacha.RoundState.Settled) continue;
            assertEq(round.escrowWei, 0, "a settled round still holds escrow");
            assertEq(round.settledCount, round.entryCount, "settled with unresolved entries");
        }
    }

    /// @dev A pool's published probabilities cannot change after it launches.
    function invariant_publishedProbabilitiesAreStable() public view {
        uint16[] memory probabilities = harness.registryAddr().getProbabilities(harness.activePoolId(), 1);
        uint256 total;
        for (uint256 i = 0; i < probabilities.length; ++i) {
            total += probabilities[i];
        }
        assertEq(total, 10_000, "probabilities always total the denominator");
        assertEq(probabilities.length, 3, "the launched tier list is unchanged");
        assertEq(probabilities[0], 7_000);
        assertEq(probabilities[1], 2_500);
        assertEq(probabilities[2], 500);
    }
}

interface IERC20Balance {
    function balanceOf(address account) external view returns (uint256);
}
