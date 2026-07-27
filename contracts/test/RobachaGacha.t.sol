// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RobachaBase} from "./RobachaBase.t.sol";
import {RobachaGacha} from "../src/RobachaGacha.sol";
import {RobachaPoolRegistry} from "../src/RobachaPoolRegistry.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {MockCCIPRouter} from "./mocks/MockCCIP.sol";
import {RobachaRandomnessReceiver} from "../src/randomness/RobachaRandomnessReceiver.sol";
import {RobachaRandomnessSender} from "../src/randomness/RobachaRandomnessSender.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract RobachaGachaTest is RobachaBase {
    uint256 internal id;

    function setUp() public override {
        super.setUp();
        id = _createStandardPool();
    }

    // ------------------------------------------------------------------
    // Entry
    // ------------------------------------------------------------------

    function test_quoteSeparatesBaseFromSurcharge() public view {
        (uint256 base, uint256 surcharge, uint256 total) = gacha.quote(id, 3);
        assertEq(base, BASE_PRICE * 3);
        assertEq(surcharge, SURCHARGE * 3);
        assertEq(total, (BASE_PRICE + SURCHARGE) * 3);
    }

    function test_spinEscrowsTheFullPaymentAndRoutesNothingYet() public {
        _spin(alice, id, 2);

        uint256 expected = (BASE_PRICE + SURCHARGE) * 2;
        assertEq(gacha.totalEscrow(), expected, "held in escrow");
        assertEq(address(gacha).balance, expected);
        assertEq(feeRouter.lifetimeBaseRevenue(), 0, "nothing routed before settlement");
    }

    function test_underpaymentReverts() public {
        (,, uint256 total) = gacha.quote(id, 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.IncorrectPayment.selector, total, total - 1));
        gacha.spin{value: total - 1}(id, 1);
    }

    function test_overpaymentReverts() public {
        (,, uint256 total) = gacha.quote(id, 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.IncorrectPayment.selector, total, total + 1));
        gacha.spin{value: total + 1}(id, 1);
    }

    function test_quantityAboveThePerTransactionCapReverts() public {
        (,, uint256 total) = gacha.quote(id, 11);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.QuantityInvalid.selector, uint16(11)));
        gacha.spin{value: total}(id, 11);
    }

    function test_zeroQuantityReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.QuantityInvalid.selector, uint16(0)));
        gacha.spin{value: 0}(id, 0);
    }

    function test_perWalletCapIsEnforcedAcrossTransactions() public {
        _fundVault(tokenA, 1_000_000e18);
        vm.startPrank(admin);
        uint256 capped = registry.createPool("Capped");
        uint16[] memory probabilities = new uint16[](1);
        probabilities[0] = 10_000;
        registry.setProbabilities(capped, 1, probabilities);
        registry.addReward(capped, 1, address(tokenA), 0, 100e18, 200e18);
        registry.setEconomics(capped, 1, BASE_PRICE, SURCHARGE);
        registry.setRoundConfig(capped, 1, 25, 60, 10, 3); // 3 per wallet
        registry.activate(capped, 1, 0, 0);
        vm.stopPrank();

        _spin(alice, capped, 2);

        (,, uint256 total) = gacha.quote(capped, 2);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.WalletCapExceeded.selector, uint256(4), uint16(3)));
        gacha.spin{value: total}(capped, 2);
    }

    function test_spinRevertsWhenThePoolIsNotActive() public {
        vm.prank(admin);
        registry.deactivate(id, 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.PoolUnavailable.selector, id));
        gacha.spin{value: BASE_PRICE + SURCHARGE}(id, 1);
    }

    function test_spinRevertsWhilePaused() public {
        vm.prank(admin);
        gacha.pause();

        (,, uint256 total) = gacha.quote(id, 1);
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        gacha.spin{value: total}(id, 1);
    }

    function test_spinRevertsWhenRandomnessIsUnavailable() public {
        // Draining the sender's fee balance makes a request impossible, so the
        // contract refuses to take payment rather than sell an unsettleable spin.
        vm.prank(admin);
        sender.withdrawUnusedFees(admin, address(sender).balance);

        (,, uint256 total) = gacha.quote(id, 1);
        vm.prank(alice);
        vm.expectRevert(RobachaGacha.RandomnessUnavailable.selector);
        gacha.spin{value: total}(id, 1);
    }

    function test_spinReadinessReportsEachCondition() public {
        (bool ready, bool poolOpen, bool notPaused, bool randomnessAvailable,,,,) = gacha.spinReadiness(id);
        assertTrue(ready);
        assertTrue(poolOpen);
        assertTrue(notPaused);
        assertTrue(randomnessAvailable);

        vm.prank(admin);
        gacha.pause();

        (bool readyPaused,, bool notPausedNow,,,,,) = gacha.spinReadiness(id);
        assertFalse(readyPaused);
        assertFalse(notPausedNow);
    }

    // ------------------------------------------------------------------
    // Rounds
    // ------------------------------------------------------------------

    function test_entriesShareOneOpenRound() public {
        _spin(alice, id, 2);
        uint256 roundId = gacha.openRound(id);
        _spin(bob, id, 3);

        assertEq(gacha.openRound(id), roundId, "same round");
        RobachaGacha.Round memory round = gacha.getRound(roundId);
        assertEq(round.entryCount, 5);
    }

    function test_roundClosesWhenItFillsExactly() public {
        // 5 buys of 5 fill a 25-entry round to the brim.
        for (uint256 i = 0; i < 5; ++i) {
            _spin(alice, id, 5);
        }

        RobachaGacha.Round memory round = gacha.getRound(1);
        assertEq(round.entryCount, 25, "filled to the cap");
        assertEq(uint8(round.state), uint8(RobachaGacha.RoundState.Closed), "closed the moment it filled");
        assertEq(gacha.openRound(id), 0, "no open round remains");
    }

    function test_purchaseTooLargeForTheRemainderStartsAFreshRound() public {
        _spin(alice, id, 10);
        _spin(alice, id, 10); // 20 of 25 used
        uint256 first = gacha.openRound(id);

        _spin(bob, id, 10); // would not fit in the remaining 5

        assertEq(gacha.getRound(first).entryCount, 20, "the first round did not grow");
        assertEq(uint8(gacha.getRound(first).state), uint8(RobachaGacha.RoundState.Closed));

        uint256 second = gacha.openRound(id);
        assertTrue(second != first, "a new round took the purchase whole");
        assertEq(gacha.getRound(second).entryCount, 10, "the purchase was not split");
    }

    function test_roundClosesWhenItsWindowElapses() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        RobachaGacha.Round memory open = gacha.getRound(roundId);

        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.RoundStillOpen.selector, roundId));
        gacha.closeRound(roundId);

        vm.warp(open.closesAt + 1);
        gacha.closeRound(roundId);

        assertEq(uint8(gacha.getRound(roundId).state), uint8(RobachaGacha.RoundState.Closed));
    }

    function test_closedRoundCannotAcceptNewEntries() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);

        _spin(bob, id, 1);
        assertTrue(gacha.openRound(id) != roundId, "a new round was opened");
        assertEq(gacha.getRound(roundId).entryCount, 1, "the closed round did not grow");
    }

    function test_emptyRoundIsCancelledRatherThanSettled() public {
        _spin(alice, id, 1);
        uint256 first = gacha.openRound(id);
        vm.warp(gacha.getRound(first).closesAt + 1);
        gacha.closeRound(first);

        // Entering again opens a fresh round; warp past it without entries.
        _spin(bob, id, 1);
        uint256 second = gacha.openRound(id);
        vm.warp(gacha.getRound(second).closesAt + 1);
        gacha.closeRound(second);

        assertEq(gacha.getRound(second).entryCount, 1);
    }

    // ------------------------------------------------------------------
    // Randomness security
    // ------------------------------------------------------------------

    function test_randomnessCannotBeRequestedWhileTheRoundIsOpen() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);

        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.RoundNotClosed.selector, roundId));
        gacha.requestRoundRandomness(roundId);
    }

    function test_randomnessCannotBeRequestedTwice() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);

        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.RoundNotClosed.selector, roundId));
        gacha.requestRoundRandomness(roundId);
    }

    function test_onlyTheReceiverMayDeliverAWord() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);

        bytes32 requestId = gacha.getRound(roundId).requestId;

        vm.prank(admin);
        vm.expectRevert(RobachaGacha.NotRandomnessReceiver.selector);
        gacha.fulfillRandomness(roundId, requestId, 12345);

        vm.prank(alice);
        vm.expectRevert(RobachaGacha.NotRandomnessReceiver.selector);
        gacha.fulfillRandomness(roundId, requestId, 12345);
    }

    function test_wordWithAMismatchedRequestIdIsRejected() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);

        bytes32 real = gacha.getRound(roundId).requestId;
        bytes32 forged = keccak256("forged");

        vm.prank(address(receiver));
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.RequestIdMismatch.selector, real, forged));
        gacha.fulfillRandomness(roundId, forged, 999);
    }

    function test_aRoundCannotBeFulfilledTwice() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("once")));

        bytes32 requestId = gacha.getRound(roundId).requestId;
        vm.prank(address(receiver));
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.RandomnessAlreadyDelivered.selector, roundId));
        gacha.fulfillRandomness(roundId, requestId, uint256(keccak256("twice")));
    }

    function test_duplicateCCIPDeliveryIsRejectedAtTheReceiver() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("dup")));

        MockCCIPRouter.Sent memory inbound = router.lastSent();
        bytes32 messageId = keccak256(abi.encode("in", roundId));

        vm.expectRevert(abi.encodeWithSelector(RobachaRandomnessReceiver.DuplicateMessage.selector, messageId));
        router.deliver(address(receiver), messageId, ETHEREUM_SELECTOR, address(coordinator), inbound.data);
    }

    function test_receiverRejectsAnUnexpectedSourceChain() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);
        bytes32 requestId = gacha.getRound(roundId).requestId;

        bytes memory payload = abi.encode(roundId, requestId, uint256(42));
        vm.expectRevert(
            abi.encodeWithSelector(RobachaRandomnessReceiver.UnexpectedSourceChain.selector, ETHEREUM_SELECTOR, uint64(999))
        );
        router.deliver(address(receiver), keccak256("m"), 999, address(coordinator), payload);
    }

    function test_receiverRejectsAnUnexpectedSender() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);
        bytes32 requestId = gacha.getRound(roundId).requestId;

        bytes memory payload = abi.encode(roundId, requestId, uint256(42));
        vm.expectRevert(
            abi.encodeWithSelector(RobachaRandomnessReceiver.UnexpectedSender.selector, address(coordinator), alice)
        );
        router.deliver(address(receiver), keccak256("m"), ETHEREUM_SELECTOR, alice, payload);
    }

    function test_receiverRejectsACallerThatIsNotTheRouter() public {
        bytes memory payload = abi.encode(uint256(1), bytes32(0), uint256(42));
        vm.prank(alice);
        (bool ok,) = address(receiver).call(
            abi.encodeWithSignature(
                "ccipReceive((bytes32,uint64,bytes,bytes,(address,uint256)[]))",
                bytes32(0),
                ETHEREUM_SELECTOR,
                abi.encode(coordinator),
                payload,
                new bytes[](0)
            )
        );
        assertFalse(ok, "only the CCIP router may call ccipReceive");
    }

    function test_onlyTheGachaMayRequestFromTheSender() public {
        vm.prank(alice);
        vm.expectRevert(RobachaRandomnessSender.NotGacha.selector);
        sender.requestRandomness(1);
    }

    // ------------------------------------------------------------------
    // Settlement
    // ------------------------------------------------------------------

    function test_everyEntryGetsExactlyOneAssignment() public {
        _spin(alice, id, 5);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("settle")));
        gacha.settleEntries(roundId, 25);

        uint256[] memory rewards = gacha.rewardsOf(alice);
        assertEq(rewards.length, 5, "one reward per entry");

        for (uint256 i = 0; i < 5; ++i) {
            RobachaGacha.Entry memory entry = gacha.getEntry(roundId, i);
            assertTrue(entry.settled);
            assertTrue(entry.rewardId != 0);
        }
        assertEq(uint8(gacha.getRound(roundId).state), uint8(RobachaGacha.RoundState.Settled));
    }

    function test_entriesInOneRoundGetIndependentResults() public {
        // 20 entries under one word: derivation must not give everyone the same
        // reward, which is what a shared or badly separated seed would do.
        _spin(alice, id, 10);
        _spin(bob, id, 10);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("independent")));
        gacha.settleEntries(roundId, 25);

        uint256 distinctTokens;
        address seen;
        for (uint256 i = 1; i <= 20; ++i) {
            RobachaGacha.Reward memory reward = gacha.getReward(i);
            if (reward.token != seen) {
                ++distinctTokens;
                seen = reward.token;
            }
        }
        assertGt(distinctTokens, 1, "results vary across entries in the same round");
    }

    function test_settlementIsBatchable() public {
        _spin(alice, id, 10);
        _spin(bob, id, 10);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("batch")));

        gacha.settleEntries(roundId, 8);
        assertEq(gacha.getRound(roundId).settledCount, 8);
        assertEq(uint8(gacha.getRound(roundId).state), uint8(RobachaGacha.RoundState.RandomnessReceived));

        gacha.settleEntries(roundId, 8);
        assertEq(gacha.getRound(roundId).settledCount, 16);

        gacha.settleEntries(roundId, 8);
        assertEq(gacha.getRound(roundId).settledCount, 20);
        assertEq(uint8(gacha.getRound(roundId).state), uint8(RobachaGacha.RoundState.Settled));
    }

    function test_settlementBeforeRandomnessReverts() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.NothingToSettle.selector, roundId));
        gacha.settleEntries(roundId, 10);
    }

    function test_settlingASettledRoundReverts() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("done")));
        gacha.settleEntries(roundId, 10);

        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.NothingToSettle.selector, roundId));
        gacha.settleEntries(roundId, 10);
    }

    function test_assignedRewardIsReservedInTheVault() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("reserve")));
        gacha.settleEntries(roundId, 10);

        RobachaGacha.Reward memory reward = gacha.getReward(1);
        assertEq(vault.reserved(reward.token), reward.amount, "liability recorded against the token");
    }

    function test_rewardAmountLiesInsideTheDeclaredRange() public {
        _spin(alice, id, 8);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("range")));
        gacha.settleEntries(roundId, 25);

        RobachaPoolRegistry.RewardSlot[] memory slots = registry.getRewards(id, 1);
        for (uint256 i = 1; i <= 8; ++i) {
            RobachaGacha.Reward memory reward = gacha.getReward(i);
            bool matched;
            for (uint256 s = 0; s < slots.length; ++s) {
                if (slots[s].token != reward.token) continue;
                if (reward.amount >= slots[s].minAmount && reward.amount <= slots[s].maxAmount) matched = true;
            }
            assertTrue(matched, "amount is inside the slot's published range");
        }
    }

    // ------------------------------------------------------------------
    // Claiming
    // ------------------------------------------------------------------

    function test_claimTransfersTheExactAssignedAmount() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("claim")));
        gacha.settleEntries(roundId, 10);

        RobachaGacha.Reward memory reward = gacha.getReward(1);
        uint256 before = MockERC20(reward.token).balanceOf(alice);

        vm.prank(alice);
        gacha.claim(1);

        assertEq(MockERC20(reward.token).balanceOf(alice) - before, reward.amount);
        assertEq(vault.reserved(reward.token), 0, "liability discharged");
        assertTrue(gacha.getReward(1).claimed);
    }

    function test_doubleClaimReverts() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("double")));
        gacha.settleEntries(roundId, 10);

        vm.startPrank(alice);
        gacha.claim(1);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.RewardAlreadyClaimed.selector, uint256(1)));
        gacha.claim(1);
        vm.stopPrank();
    }

    function test_claimingSomeoneElsesRewardReverts() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("owner")));
        gacha.settleEntries(roundId, 10);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.NotRewardOwner.selector, uint256(1)));
        gacha.claim(1);
    }

    function test_claimingAnUnknownRewardReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.RewardNotFound.selector, uint256(99)));
        gacha.claim(99);
    }

    function test_claimsStayOpenWhileTheGachaIsPaused() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("paused-claim")));
        gacha.settleEntries(roundId, 10);

        vm.prank(admin);
        gacha.pause();

        vm.prank(alice);
        gacha.claim(1); // pausing stops new spins, not the payout of an assigned reward
        assertTrue(gacha.getReward(1).claimed);
    }

    // ------------------------------------------------------------------
    // Timeout and refunds
    // ------------------------------------------------------------------

    function test_roundBecomesRefundableAfterTheRandomnessTimeout() public {
        _spin(alice, id, 2);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);

        uint64 refundableAt = gacha.getRound(roundId).closedAt + gacha.randomnessTimeout();
        vm.warp(refundableAt - 1);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.TimeoutNotElapsed.selector, roundId, refundableAt));
        gacha.markRoundRefundable(roundId);

        vm.warp(refundableAt);
        gacha.markRoundRefundable(roundId);
        assertEq(uint8(gacha.getRound(roundId).state), uint8(RobachaGacha.RoundState.Refundable));
    }

    function test_refundReturnsTheEscrowLessOnlyTheRandomnessFeeSpent() public {
        _spin(alice, id, 2);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);

        vm.warp(gacha.getRound(roundId).closedAt + gacha.randomnessTimeout());
        gacha.markRoundRefundable(roundId);

        uint256 paid = (BASE_PRICE + SURCHARGE) * 2;
        uint256 fee = router.fee();
        assertEq(gacha.refundable(alice), paid - fee, "everything but the fee actually spent");
        assertGt(gacha.refundable(alice), BASE_PRICE * 2, "the base price is always fully covered");

        uint256 before = alice.balance;
        vm.prank(alice);
        gacha.withdrawRefund();
        assertEq(alice.balance - before, paid - fee);
        assertEq(gacha.refundable(alice), 0);
    }

    function test_refundLossIsSharedEvenlyBetweenParticipants() public {
        _spin(alice, id, 1);
        _spin(bob, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);

        vm.warp(gacha.getRound(roundId).closedAt + gacha.randomnessTimeout());
        gacha.markRoundRefundable(roundId);

        uint256 diff = gacha.refundable(alice) > gacha.refundable(bob)
            ? gacha.refundable(alice) - gacha.refundable(bob)
            : gacha.refundable(bob) - gacha.refundable(alice);
        assertLe(diff, 1, "the shortfall falls equally, to the wei");
    }

    function test_withdrawWithNothingOwedReverts() public {
        vm.prank(alice);
        vm.expectRevert(RobachaGacha.NothingRefundable.selector);
        gacha.withdrawRefund();
    }

    function test_randomnessArrivingAfterARefundIsRejected() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);
        bytes32 requestId = gacha.getRound(roundId).requestId;

        vm.warp(gacha.getRound(roundId).closedAt + gacha.randomnessTimeout());
        gacha.markRoundRefundable(roundId);

        vm.prank(address(receiver));
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.RandomnessAlreadyDelivered.selector, roundId));
        gacha.fulfillRandomness(roundId, requestId, 7);
    }

    function test_anAdministratorCannotSupplyARandomWord() public {
        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        vm.warp(gacha.getRound(roundId).closesAt + 1);
        gacha.closeRound(roundId);
        gacha.requestRoundRandomness(roundId);
        bytes32 requestId = gacha.getRound(roundId).requestId;

        // Even with every role, the admin is not the receiver.
        vm.startPrank(admin);
        gacha.grantRole(RobachaRoles.PAUSER_ROLE, admin);
        vm.expectRevert(RobachaGacha.NotRandomnessReceiver.selector);
        gacha.fulfillRandomness(roundId, requestId, uint256(keccak256("chosen")));
        vm.stopPrank();
    }

    function test_timeoutBoundsAreEnforced() public {
        vm.startPrank(admin);
        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.TimeoutOutOfRange.selector, uint32(60)));
        gacha.setRandomnessTimeout(60);

        vm.expectRevert(abi.encodeWithSelector(RobachaGacha.TimeoutOutOfRange.selector, uint32(48 hours)));
        gacha.setRandomnessTimeout(48 hours);

        gacha.setRandomnessTimeout(30 minutes);
        assertEq(gacha.randomnessTimeout(), 30 minutes);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Inventory exhaustion
    // ------------------------------------------------------------------

    function test_entryWithNoPayableInventoryIsRefundedNotDowngraded() public {
        // A dedicated token whose entire supply can pay exactly one maximum win,
        // so the second entry in the round has nothing left to draw from.
        MockERC20 scarce = new MockERC20("Scarce", "SCR", 18);
        _fundVault(scarce, 200e18);
        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(scarce), true);
        uint256 tight = registry.createPool("Tight");
        uint16[] memory probabilities = new uint16[](1);
        probabilities[0] = 10_000;
        registry.setProbabilities(tight, 1, probabilities);
        registry.addReward(tight, 1, address(scarce), 0, 150e18, 200e18);
        registry.setEconomics(tight, 1, BASE_PRICE, SURCHARGE);
        registry.setRoundConfig(tight, 1, 25, 60, 10, 0);
        registry.activate(tight, 1, 0, 0);
        vm.stopPrank();

        _spin(alice, tight, 3);
        uint256 roundId = gacha.openRound(tight);
        _fulfilRound(roundId, uint256(keccak256("exhaust")));
        gacha.settleEntries(roundId, 25);

        RobachaGacha.Round memory round = gacha.getRound(roundId);
        assertGt(round.refundedCount, 0, "entries the vault cannot pay are refunded");
        assertGt(gacha.refundable(alice), 0);

        // Nothing was promised beyond what the vault holds.
        assertLe(vault.reserved(address(scarce)), scarce.balanceOf(address(vault)));
    }

    // ------------------------------------------------------------------
    // Accounting
    // ------------------------------------------------------------------

    function test_contractBalanceAlwaysCoversEscrowPlusRefunds() public {
        _spin(alice, id, 4);
        _spin(bob, id, 3);
        uint256 roundId = gacha.openRound(id);

        assertGe(address(gacha).balance, gacha.totalEscrow() + gacha.totalRefundable());

        _fulfilRound(roundId, uint256(keccak256("accounting")));
        assertGe(address(gacha).balance, gacha.totalEscrow() + gacha.totalRefundable());

        gacha.settleEntries(roundId, 25);
        assertGe(address(gacha).balance, gacha.totalEscrow() + gacha.totalRefundable());
        assertEq(gacha.getRound(roundId).escrowWei, 0, "a settled round holds nothing");
    }

    function test_theSameWordProducesTheSameResultsEveryTime() public {
        _spin(alice, id, 4);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, 0xABCDEF);
        gacha.settleEntries(roundId, 25);

        address[4] memory tokens;
        uint256[4] memory amounts;
        for (uint256 i = 0; i < 4; ++i) {
            RobachaGacha.Reward memory reward = gacha.getReward(i + 1);
            tokens[i] = reward.token;
            amounts[i] = reward.amount;
        }

        // Re-deriving off-chain with the same inputs must match the contract.
        for (uint256 i = 0; i < 4; ++i) {
            bytes32 seed = keccak256(abi.encode(uint256(0xABCDEF), block.chainid, id, uint256(1), roundId, uint16(i), alice));
            uint256 tierRoll = uint256(keccak256(abi.encode(seed, "robacha.tier"))) % 10_000;
            uint8 expectedTier = tierRoll < 7_000 ? 0 : tierRoll < 9_500 ? 1 : 2;
            address expectedToken =
                expectedTier == 0 ? address(tokenA) : expectedTier == 1 ? address(tokenB) : address(tokenC);
            assertEq(tokens[i], expectedToken, "tier derivation matches the published probabilities");
            assertGt(amounts[i], 0);
        }
    }
}
