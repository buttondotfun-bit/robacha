// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RobachaCommitRevealRandomness} from "../src/randomness/RobachaCommitRevealRandomness.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";

/**
 * @dev Stands in for the gacha.
 *
 * Only the three things the randomness contract actually reads or calls: a
 * round's shape, its entries, and the delivery callback. Keeping it minimal
 * means a test failure points at the randomness logic rather than at the
 * gacha's own rules.
 */
contract MockGacha {
    struct R {
        uint64 openedAt;
        uint16 entryCount;
    }

    mapping(uint256 => R) public rounds;
    mapping(uint256 => address[]) public entries;

    uint256 public lastRoundId;
    bytes32 public lastRequestId;
    uint256 public lastRandomWord;
    uint256 public fulfilCount;

    function openRound(uint256 roundId, uint64 openedAt) external {
        rounds[roundId].openedAt = openedAt;
    }

    function addEntry(uint256 roundId, address user) external {
        entries[roundId].push(user);
        rounds[roundId].entryCount = uint16(entries[roundId].length);
    }

    function getRound(uint256 roundId)
        external
        view
        returns (
            uint256, uint256, uint64, uint64, uint64, uint64, uint8,
            uint16, uint16, uint16, uint256, uint256, bytes32, uint256, uint256
        )
    {
        R memory r = rounds[roundId];
        return (1, 1, r.openedAt, 0, 0, 0, 2, r.entryCount, 0, 0, 0, 0, bytes32(0), 0, 0);
    }

    function getEntry(uint256 roundId, uint256 index)
        external
        view
        returns (address, bool, bool, uint256)
    {
        return (entries[roundId][index], false, false, 0);
    }

    function fulfillRandomness(uint256 roundId, bytes32 requestId, uint256 randomWord) external {
        lastRoundId = roundId;
        lastRequestId = requestId;
        lastRandomWord = randomWord;
        ++fulfilCount;
    }

    /// @dev Lets the test drive `requestRandomness` as the gacha would.
    function callRequest(address randomness, uint256 roundId) external returns (bytes32) {
        return RobachaCommitRevealRandomness(payable(randomness)).requestRandomness(roundId);
    }
}

contract RobachaCommitRevealRandomnessTest is Test {
    RobachaCommitRevealRandomness internal rng;
    MockGacha internal gacha;

    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    bytes32 internal constant SECRET = keccak256("a genuinely secret value");

    function setUp() public {
        vm.warp(1_000_000);
        gacha = new MockGacha();
        rng = new RobachaCommitRevealRandomness(admin, address(gacha));

        vm.deal(admin, 100 ether);
        vm.prank(admin);
        rng.depositBond{value: 1 ether}();
    }

    function _commit(bytes32 secret) internal {
        bytes32[] memory hashes = new bytes32[](1);
        hashes[0] = keccak256(abi.encode(secret));
        vm.prank(admin);
        rng.postCommitments(hashes);
    }

    /// @dev Commit now, then open the round later — the required ordering.
    function _commitThenOpen(uint256 roundId, bytes32 secret) internal {
        _commit(secret);
        vm.warp(block.timestamp + 1);
        gacha.openRound(roundId, uint64(block.timestamp));
    }

    // ------------------------------------------------------------------
    // The happy path
    // ------------------------------------------------------------------

    function test_commitRequestRevealDeliversRandomness() public {
        _commitThenOpen(1, SECRET);
        gacha.addEntry(1, alice);

        bytes32 requestId = gacha.callRequest(address(rng), 1);
        assertTrue(requestId != bytes32(0), "request id issued");

        rng.reveal(1, SECRET);

        assertEq(gacha.fulfilCount(), 1, "randomness delivered exactly once");
        assertEq(gacha.lastRoundId(), 1);
        assertEq(gacha.lastRequestId(), requestId, "request id round-trips");
        assertTrue(gacha.lastRandomWord() != 0, "a word was produced");
        assertEq(rng.totalRevealed(), 1);
        assertEq(rng.totalMissed(), 0);
    }

    // ------------------------------------------------------------------
    // The guarantee this whole scheme rests on
    // ------------------------------------------------------------------

    /**
     * @dev The core property: a commitment created once a round already exists
     *      is refused. Without this the operator could look at the entries and
     *      then pick a secret, which is precisely the thing commit-reveal is
     *      supposed to prevent.
     */
    function test_commitmentPostedAfterRoundOpensIsRejected() public {
        gacha.openRound(1, uint64(block.timestamp));
        vm.warp(block.timestamp + 1);
        _commit(SECRET); // posted after the round already opened

        vm.expectRevert();
        gacha.callRequest(address(rng), 1);
    }

    /// @dev The mirror image: the same commitment is fine for a round opened
    ///      after it, proving the rejection above is about ordering.
    function test_commitmentPostedBeforeRoundOpensIsAccepted() public {
        _commit(SECRET);
        vm.warp(block.timestamp + 5);
        gacha.openRound(1, uint64(block.timestamp));

        bytes32 requestId = gacha.callRequest(address(rng), 1);
        assertTrue(requestId != bytes32(0), "earlier commitment is usable");
    }

    function test_commitmentPostedInTheSameSecondIsRejected() public {
        // Equal timestamps are not "before". Rejecting the tie removes any
        // argument about same-block ordering.
        _commit(SECRET);
        gacha.openRound(1, uint64(block.timestamp));

        vm.expectRevert();
        gacha.callRequest(address(rng), 1);
    }

    function test_wrongSecretCannotReveal() public {
        _commitThenOpen(1, SECRET);
        gacha.callRequest(address(rng), 1);

        vm.expectRevert(RobachaCommitRevealRandomness.BadSecret.selector);
        rng.reveal(1, keccak256("not the committed secret"));
        assertEq(gacha.fulfilCount(), 0, "nothing delivered");
    }

    /**
     * @dev The seed must depend on who actually entered, so a commitment
     *      cannot be shopped for against a known entrant set.
     */
    function test_entrantsChangeTheResultingWord() public {
        _commitThenOpen(1, SECRET);
        gacha.addEntry(1, alice);
        gacha.callRequest(address(rng), 1);
        rng.reveal(1, SECRET);
        uint256 wordWithAlice = gacha.lastRandomWord();

        // Same secret, same round number, different entrant.
        MockGacha gacha2 = new MockGacha();
        RobachaCommitRevealRandomness rng2 =
            new RobachaCommitRevealRandomness(admin, address(gacha2));
        vm.prank(admin);
        rng2.depositBond{value: 1 ether}();

        bytes32[] memory hashes = new bytes32[](1);
        hashes[0] = keccak256(abi.encode(SECRET));
        vm.prank(admin);
        rng2.postCommitments(hashes);
        vm.warp(block.timestamp + 1);
        gacha2.openRound(1, uint64(block.timestamp));
        gacha2.addEntry(1, bob);
        gacha2.callRequest(address(rng2), 1);
        rng2.reveal(1, SECRET);

        assertTrue(
            wordWithAlice != gacha2.lastRandomWord(),
            "entrant addresses must feed the seed"
        );
    }

    // ------------------------------------------------------------------
    // Withholding — the weakness, pinned so it cannot be forgotten
    // ------------------------------------------------------------------

    /**
     * @dev This test documents what the scheme cannot do. The operator sees the
     *      outcome before revealing and can simply not reveal. Nothing here
     *      stops that; it only makes it cost a slice of the bond and appear in
     *      a public counter. Entrants are made whole by the gacha's own refund
     *      timeout, which is outside this contract.
     */
    function test_operatorCanWithholdButItIsCostlyAndCounted() public {
        _commitThenOpen(1, SECRET);
        gacha.callRequest(address(rng), 1);

        uint256 bondBefore = rng.bond();
        vm.warp(block.timestamp + rng.revealWindow() + 1);

        // Permissionless: anyone can put the failure on the record.
        vm.prank(stranger);
        rng.slashMissedReveal(1);

        assertEq(gacha.fulfilCount(), 0, "no randomness was delivered");
        assertEq(rng.totalMissed(), 1, "counted in public");
        assertEq(rng.bond(), bondBefore - (bondBefore * 1000) / 10_000, "10% slashed");
    }

    function test_cannotSlashWhileTheWindowIsStillOpen() public {
        _commitThenOpen(1, SECRET);
        gacha.callRequest(address(rng), 1);

        vm.expectRevert();
        rng.slashMissedReveal(1);
    }

    function test_cannotRevealAfterTheWindowCloses() public {
        _commitThenOpen(1, SECRET);
        gacha.callRequest(address(rng), 1);
        vm.warp(block.timestamp + rng.revealWindow() + 1);

        vm.expectRevert();
        rng.reveal(1, SECRET);
    }

    function test_cannotRevealTwice() public {
        _commitThenOpen(1, SECRET);
        gacha.callRequest(address(rng), 1);
        rng.reveal(1, SECRET);

        vm.expectRevert(
            abi.encodeWithSelector(RobachaCommitRevealRandomness.AlreadyRevealed.selector, uint256(1))
        );
        rng.reveal(1, SECRET);
        assertEq(gacha.fulfilCount(), 1, "delivered only once");
    }

    /// @dev Anyone holding the secret may push a round through, including a user.
    function test_revealIsPermissionless() public {
        _commitThenOpen(1, SECRET);
        gacha.callRequest(address(rng), 1);

        vm.prank(stranger);
        rng.reveal(1, SECRET);
        assertEq(gacha.fulfilCount(), 1);
    }

    // ------------------------------------------------------------------
    // Access control and gating
    // ------------------------------------------------------------------

    function test_onlyGachaCanRequest() public {
        _commitThenOpen(1, SECRET);
        vm.prank(stranger);
        vm.expectRevert(RobachaCommitRevealRandomness.NotGacha.selector);
        rng.requestRandomness(1);
    }

    function test_onlyManagerCanPostCommitments() public {
        bytes32[] memory hashes = new bytes32[](1);
        hashes[0] = keccak256(abi.encode(SECRET));
        vm.prank(stranger);
        vm.expectRevert();
        rng.postCommitments(hashes);
    }

    function test_runningOutOfCommitmentsStallsRatherThanWeakens() public {
        gacha.openRound(1, uint64(block.timestamp + 10));
        vm.warp(block.timestamp + 20);

        vm.expectRevert(RobachaCommitRevealRandomness.NoCommitmentAvailable.selector);
        gacha.callRequest(address(rng), 1);

        (bool ready, string memory reason) = rng.isReady();
        assertFalse(ready);
        assertEq(reason, "no randomness commitments available");
    }

    function test_isNotReadyWithoutABond() public {
        MockGacha g = new MockGacha();
        RobachaCommitRevealRandomness fresh = new RobachaCommitRevealRandomness(admin, address(g));
        bytes32[] memory hashes = new bytes32[](1);
        hashes[0] = keccak256(abi.encode(SECRET));
        vm.prank(admin);
        fresh.postCommitments(hashes);

        (bool ready, string memory reason) = fresh.isReady();
        assertFalse(ready, "unbonded operator must not be able to run spins");
        assertEq(reason, "operator bond not posted");
    }

    function test_eachCommitmentServesOnlyOneRound() public {
        _commitThenOpen(1, SECRET);
        gacha.callRequest(address(rng), 1);

        gacha.openRound(2, uint64(block.timestamp));
        vm.expectRevert(RobachaCommitRevealRandomness.NoCommitmentAvailable.selector);
        gacha.callRequest(address(rng), 2);
    }

    function test_sameRoundCannotBeRequestedTwice() public {
        _commitThenOpen(1, SECRET);
        gacha.callRequest(address(rng), 1);

        bytes32[] memory hashes = new bytes32[](1);
        hashes[0] = keccak256(abi.encode(keccak256("second")));
        vm.prank(admin);
        rng.postCommitments(hashes);

        vm.expectRevert(
            abi.encodeWithSelector(RobachaCommitRevealRandomness.RoundAlreadyRequested.selector, uint256(1))
        );
        gacha.callRequest(address(rng), 1);
    }

    // ------------------------------------------------------------------
    // Funds
    // ------------------------------------------------------------------

    function test_reimbursementWithdrawalCannotTouchTheBond() public {
        // Reimbursement arrives as value forwarded with the request.
        vm.deal(address(gacha), 1 ether);
        vm.prank(admin);
        rng.setGasReimbursement(0.001 ether);

        uint256 bondBefore = rng.bond();
        vm.prank(admin);
        vm.expectRevert();
        rng.withdrawReimbursement(payable(admin), bondBefore);
        assertEq(rng.bond(), bondBefore, "bond untouched");
    }

    function test_onlyAdminMovesFunds() public {
        vm.prank(stranger);
        vm.expectRevert();
        rng.withdrawBond(payable(stranger), 1);

        vm.prank(stranger);
        vm.expectRevert();
        rng.withdrawReimbursement(payable(stranger), 1);
    }

    function test_auditRoundExposesTheFullRecord() public {
        _commitThenOpen(1, SECRET);
        bytes32 requestId = gacha.callRequest(address(rng), 1);
        rng.reveal(1, SECRET);

        (bytes32 rid, bytes32 hash, uint64 postedAt, , bool revealed, bool missed) = rng.auditRound(1);
        assertEq(rid, requestId);
        assertEq(hash, keccak256(abi.encode(SECRET)), "commitment is publicly checkable");
        assertTrue(postedAt > 0);
        assertTrue(revealed);
        assertFalse(missed);
    }

    // ------------------------------------------------------------------
    // Fuzz
    // ------------------------------------------------------------------

    function testFuzz_onlyTheCommittedSecretEverReveals(bytes32 secret, bytes32 attempt) public {
        vm.assume(secret != attempt);
        _commitThenOpen(1, secret);
        gacha.callRequest(address(rng), 1);

        vm.expectRevert(RobachaCommitRevealRandomness.BadSecret.selector);
        rng.reveal(1, attempt);

        rng.reveal(1, secret);
        assertEq(gacha.fulfilCount(), 1);
    }
}
