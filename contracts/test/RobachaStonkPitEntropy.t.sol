// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RobachaStonkPitEntropy} from "../src/randomness/RobachaStonkPitEntropy.sol";

interface IRawFulfill {
    function rawFulfillEntropy(uint256 requestId, bytes32 word) external;
}

/**
 * @dev Test-only MultiConductor.
 *
 * Modelled on the deployed contract's verified ABI, and made to enforce the
 * constraints that actually bite: it reverts when underpaid, reverts when the
 * mining floor has no live tapes, and delivers through the same gas-capped
 * callback. A word is never returned from `request` — it arrives later, which
 * is the whole reason this is asynchronous.
 */
contract MockConductor {
    uint256 public requestFee = 0.00035 ether;
    uint256 public maxRequestFee = 0.0005 ether;
    uint256 public liveTapeCount = 2;

    uint256 public nextId = 1;
    mapping(uint256 => address) public requester;
    mapping(uint256 => bytes32) public seedOf;
    mapping(uint256 => uint256) public printsOf;

    function setFee(uint256 fee) external {
        requestFee = fee;
    }

    function setTapes(uint256 tapes) external {
        liveTapeCount = tapes;
    }

    function request(uint256 nPrints, bytes32 seed) external payable returns (uint256 id) {
        require(liveTapeCount > 0, "MockConductor: quiet floor");
        require(msg.value >= requestFee, "MockConductor: underpaid");
        id = nextId++;
        requester[id] = msg.sender;
        seedOf[id] = seed;
        printsOf[id] = nPrints;
    }

    /// @dev Permissionless delivery, exactly as the real one is.
    function deliver(uint256 id, bytes32 word) external {
        IRawFulfill(requester[id]).rawFulfillEntropy(id, word);
    }
}

/// @dev Stands in for the gacha: records what was delivered to it.
contract MockGacha {
    uint256 public lastRoundId;
    bytes32 public lastRequestId;
    uint256 public lastWord;
    uint256 public deliveries;

    function fulfillRandomness(uint256 roundId, bytes32 requestId, uint256 randomWord) external {
        lastRoundId = roundId;
        lastRequestId = requestId;
        lastWord = randomWord;
        ++deliveries;
    }

    function askFor(RobachaStonkPitEntropy sender, uint256 roundId, uint256 value)
        external
        returns (bytes32)
    {
        return sender.requestRandomness{value: value}(roundId);
    }

    receive() external payable {}
}

contract RobachaStonkPitEntropyTest is Test {
    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");

    MockConductor internal conductor;
    MockGacha internal gacha;
    RobachaStonkPitEntropy internal sender;

    /// @dev What a round actually forwards: min(fee, surcharge * seats).
    uint256 internal constant SURCHARGE = 0.0002 ether;

    function setUp() public {
        conductor = new MockConductor();
        gacha = new MockGacha();
        sender = new RobachaStonkPitEntropy(admin, address(conductor), address(gacha));

        vm.deal(address(gacha), 1 ether);
        vm.deal(stranger, 1 ether);
        // Seed float.
        vm.deal(address(this), 1 ether);
        sender.fundFloat{value: 0.05 ether}();
    }

    function _forwarded(uint256 seats) internal view returns (uint256) {
        uint256 pot = SURCHARGE * seats;
        uint256 fee = conductor.requestFee();
        return fee <= pot ? fee : pot;
    }

    // ------------------------------------------------------------------
    // The happy path, end to end
    // ------------------------------------------------------------------

    function test_buysAWordAndDeliversItToTheGacha() public {
        bytes32 rid = gacha.askFor(sender, 42, _forwarded(3));
        assertEq(sender.requestOf(42), uint256(rid), "round mapped to its request");

        conductor.deliver(uint256(rid), bytes32(uint256(0xBEEF)));

        assertEq(gacha.deliveries(), 1);
        assertEq(gacha.lastRoundId(), 42);
        assertEq(gacha.lastWord(), 0xBEEF);
    }

    function test_leanRoundIsToppedUpFromTheFloat() public {
        // One seat forwards 0.0002 against a 0.00035 fee. Without the float
        // this underpays and the conductor reverts, the round never settles,
        // and every entrant is refunded hours later.
        uint256 floatBefore = address(sender).balance;

        bytes32 rid = gacha.askFor(sender, 7, _forwarded(1));

        assertGt(uint256(rid), 0, "the request went through anyway");
        assertLt(address(sender).balance, floatBefore, "the shortfall came from the float");
    }

    function test_fatRoundCostsTheFloatNothing() public {
        // Three seats forward 0.0006, which is capped at the fee, so the round
        // pays its own way and the float is untouched.
        uint256 floatBefore = address(sender).balance;
        gacha.askFor(sender, 8, _forwarded(3));
        assertEq(address(sender).balance, floatBefore, "float unchanged");
    }

    // ------------------------------------------------------------------
    // Readiness — measured against the ceiling, and failing closed
    // ------------------------------------------------------------------

    function test_readyOnAHealthyFloorWithAFundedFloat() public view {
        (bool ready,) = sender.isReady();
        assertTrue(ready);
    }

    function test_notReadyWhenTheMiningFloorIsQuiet() public {
        conductor.setTapes(0);
        (bool ready, string memory reason) = sender.isReady();
        assertFalse(ready);
        assertEq(reason, "No live entropy tapes on the mining floor");
    }

    function test_notReadyWhenTheFloatCannotCoverTheCeiling() public {
        // Judged against maxRequestFee, not the live quote. A float that only
        // covers today's cheaper fee is not ready, because the fee moves and
        // the round would be sold before it did.
        vm.prank(admin);
        sender.withdrawFloat(payable(admin), address(sender).balance);

        (bool ready, string memory reason) = sender.isReady();
        assertFalse(ready);
        assertEq(reason, "Entropy float too thin to guarantee a round");
    }

    function test_readinessUsesTheCeilingNotTheSpotQuote() public {
        // Leave exactly enough for the spot fee plus tip, but not the ceiling.
        vm.startPrank(admin);
        sender.withdrawFloat(payable(admin), address(sender).balance);
        vm.stopPrank();
        sender.fundFloat{value: 0.00035 ether + 0.0001 ether}();

        (bool ready,) = sender.isReady();
        assertFalse(ready, "covers the quote but not the ceiling, so not ready");
    }

    function test_runwayCountsRoundsAtTheCeiling() public view {
        // 0.05 float against a 0.0006 worst case round: 83 guaranteed rounds.
        uint256 perRound = conductor.maxRequestFee() + sender.keeperTip();
        assertEq(sender.runwayRounds(), uint256(0.05 ether) / perRound);
        assertEq(sender.runwayRounds(), 83);
    }

    // ------------------------------------------------------------------
    // The callback is the attack surface
    // ------------------------------------------------------------------

    function test_onlyTheConductorMayDeliverAWord() public {
        bytes32 rid = gacha.askFor(sender, 11, _forwarded(3));

        // Without this check anyone could hand over a word of their choosing
        // and settle a live round with it.
        vm.prank(stranger);
        vm.expectRevert(RobachaStonkPitEntropy.NotConductor.selector);
        sender.rawFulfillEntropy(uint256(rid), bytes32(uint256(1)));

        assertEq(gacha.deliveries(), 0, "nothing reached the gacha");
    }

    function test_aWordCannotBeDeliveredTwice() public {
        bytes32 rid = gacha.askFor(sender, 12, _forwarded(3));
        conductor.deliver(uint256(rid), bytes32(uint256(1)));

        vm.expectRevert(
            abi.encodeWithSelector(RobachaStonkPitEntropy.AlreadyDelivered.selector, uint256(12))
        );
        conductor.deliver(uint256(rid), bytes32(uint256(2)));

        assertEq(gacha.deliveries(), 1, "the second word was refused");
    }

    function test_unknownRequestIsRejected() public {
        vm.prank(address(conductor));
        vm.expectRevert(abi.encodeWithSelector(RobachaStonkPitEntropy.UnknownRequest.selector, uint256(999)));
        sender.rawFulfillEntropy(999, bytes32(uint256(1)));
    }

    // ------------------------------------------------------------------
    // Requesting: authorisation and idempotence
    // ------------------------------------------------------------------

    function test_onlyTheGachaMayRequest() public {
        vm.prank(stranger);
        vm.expectRevert(RobachaStonkPitEntropy.NotGacha.selector);
        sender.requestRandomness{value: 0.0002 ether}(1);
    }

    function test_oneRequestPerRound() public {
        // Computed before expectRevert: `_forwarded` calls the conductor, and
        // the cheatcode applies to the very next call whatever that is.
        uint256 pay = _forwarded(3);
        gacha.askFor(sender, 13, pay);

        vm.expectRevert(abi.encodeWithSelector(RobachaStonkPitEntropy.AlreadyRequested.selector, uint256(13)));
        gacha.askFor(sender, 13, pay);
    }

    function test_requestRevertsRatherThanSpendAFloatItCannotCover() public {
        vm.prank(admin);
        sender.withdrawFloat(payable(admin), address(sender).balance);

        // Reverting here is correct: the round stays Closed and can be retried
        // once the float is topped up, whereas a half-paid request would fail
        // at the conductor and strand the round until it timed out.
        vm.expectRevert();
        gacha.askFor(sender, 14, 0);
    }

    function test_seedsAreDomainSeparatedPerRound() public {
        bytes32 a = gacha.askFor(sender, 100, _forwarded(3));
        bytes32 b = gacha.askFor(sender, 101, _forwarded(3));
        assertTrue(
            conductor.seedOf(uint256(a)) != conductor.seedOf(uint256(b)),
            "two rounds must never present the same seed"
        );
    }

    function test_foldsFourPrints() public {
        bytes32 rid = gacha.askFor(sender, 15, _forwarded(3));
        assertEq(conductor.printsOf(uint256(rid)), 4, "their standards floor is 3");
    }

    // ------------------------------------------------------------------
    // The float
    // ------------------------------------------------------------------

    function test_anyoneMayTopUpTheFloat() public {
        // Permissionless on purpose: the float must never be hostage to an
        // admin key being asleep. This is what rescued StonkPit's own table.
        uint256 before = address(sender).balance;
        vm.prank(stranger);
        (bool ok,) = address(sender).call{value: 0.01 ether}("");
        assertTrue(ok);
        assertEq(address(sender).balance, before + 0.01 ether);
    }

    function test_onlyAdminMayWithdrawTheFloat() public {
        vm.prank(stranger);
        vm.expectRevert();
        sender.withdrawFloat(payable(stranger), 0.01 ether);
    }

    function test_anAverageRoundPaysItsOwnWayEvenAtTheCeiling() public {
        // The whole economic claim, pinned. Measured occupancy is 3.29 seats,
        // and at a 0.0002 surcharge three seats collect 0.0006 — which covers
        // the fee ceiling without touching the float. If this ever fails, the
        // surcharge no longer pays for its own entropy.
        conductor.setFee(0.0005 ether); // the ceiling
        uint256 floatBefore = address(sender).balance;

        gacha.askFor(sender, 16, _forwarded(3));

        assertEq(address(sender).balance, floatBefore, "float untouched by an average round");
    }

    function test_theFloatAbsorbsALeanRoundAtTheCeiling() public {
        conductor.setFee(0.0005 ether);
        uint256 floatBefore = address(sender).balance;

        gacha.askFor(sender, 17, _forwarded(1));

        assertLt(address(sender).balance, floatBefore, "one seat needed the float");
        (bool ready,) = sender.isReady();
        assertTrue(ready, "and there is still runway afterwards");
    }
}
