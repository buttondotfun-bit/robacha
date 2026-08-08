// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RobachaRaffle} from "../src/RobachaRaffle.sol";

interface IRawFulfill {
    function rawFulfillEntropy(uint256 requestId, bytes32 word) external;
}

/// @dev Test-only conductor, modelled on the deployed one: reverts underpaid,
///      delivers through the gas-capped callback, refunds on cancel.
contract MockConductor {
    uint256 public requestFee = 0.00035 ether;
    uint256 public liveTapeCount = 2;
    uint256 public constant CANCEL_TIMEOUT = 172800;

    uint256 public nextId = 1;
    mapping(uint256 => address) public requester;
    mapping(uint256 => uint256) public feePaid;
    mapping(uint256 => bool) public cancelled;

    function setFee(uint256 f) external { requestFee = f; }

    function request(uint256, bytes32) external payable returns (uint256 id) {
        require(liveTapeCount > 0, "quiet floor");
        require(msg.value >= requestFee, "underpaid");
        id = nextId++;
        requester[id] = msg.sender;
        feePaid[id] = msg.value;
    }

    function cancel(uint256 id) external {
        require(requester[id] == msg.sender, "not requester");
        require(!cancelled[id], "cancelled");
        cancelled[id] = true;
        (bool ok,) = msg.sender.call{value: feePaid[id]}("");
        require(ok, "refund failed");
    }

    function deliver(uint256 id, bytes32 word) external {
        IRawFulfill(requester[id]).rawFulfillEntropy(id, word);
    }
}

contract RobachaRaffleTest is Test {
    RobachaRaffle raffle;
    MockConductor conductor;

    address admin = address(0xA11CE);
    address operator = address(0xBEEF01);
    uint256 constant PRICE = 0.01 ether;

    function setUp() public {
        conductor = new MockConductor();
        vm.deal(address(conductor), 10 ether); // for cancel refunds
        raffle = new RobachaRaffle(admin, address(conductor), PRICE, block.timestamp);

        vm.deal(admin, 1 ether);
        vm.prank(admin);
        raffle.fundDraw{value: 0.05 ether}();
    }

    function _buyer(uint256 i) internal returns (address a) {
        a = address(uint160(0x1000 + i));
        vm.deal(a, 10 ether);
    }

    function _sellOut() internal {
        // 8 wallets x 25 tickets = 200.
        for (uint256 i = 0; i < 8; ++i) {
            address b = _buyer(i);
            vm.prank(b);
            raffle.buyTicket{value: 25 * PRICE}(25);
        }
        assertEq(raffle.ticketsSold(), 200);
        assertEq(uint256(raffle.state()), uint256(RobachaRaffle.State.AwaitingDraw));
    }

    // ------------------------------------------------------------- buying rules
    function test_buy_recordsAndEscrows() public {
        address b = _buyer(0);
        vm.prank(b);
        raffle.buyTicket{value: 3 * PRICE}(3);
        assertEq(raffle.ticketsOf(b), 3);
        assertEq(raffle.paidWei(b), 3 * PRICE);
        assertEq(raffle.totalEscrow(), 3 * PRICE);
        assertEq(raffle.ticketsSold(), 3);
    }

    function test_walletCap_enforced() public {
        address b = _buyer(0);
        vm.prank(b);
        raffle.buyTicket{value: 25 * PRICE}(25);
        vm.prank(b);
        vm.expectRevert(abi.encodeWithSelector(RobachaRaffle.WalletCapExceeded.selector, 26, 25));
        raffle.buyTicket{value: PRICE}(1);
    }

    function test_totalCap_enforced() public {
        _sellOut();
        address b = _buyer(99);
        vm.prank(b);
        vm.expectRevert(RobachaRaffle.SoldOutAlready.selector);
        raffle.buyTicket{value: PRICE}(1);
    }

    function test_exactPayment_required() public {
        address b = _buyer(0);
        vm.prank(b);
        vm.expectRevert(abi.encodeWithSelector(RobachaRaffle.IncorrectPayment.selector, 2 * PRICE, 2 * PRICE + 1));
        raffle.buyTicket{value: 2 * PRICE + 1}(2);
    }

    function test_cannotBuyAfterClose() public {
        vm.warp(block.timestamp + 24 hours + 1);
        address b = _buyer(0);
        vm.prank(b);
        vm.expectRevert(RobachaRaffle.NotOpen.selector);
        raffle.buyTicket{value: PRICE}(1);
    }

    // -------------------------------------------------------------- happy path
    function test_happyPath_drawAndClaim() public {
        _sellOut();
        uint256 escrowBefore = raffle.totalEscrow();
        assertEq(escrowBefore, 200 * PRICE);

        // Anyone can request the draw.
        vm.prank(address(0xBEEF));
        raffle.requestDraw();

        // The draw fee came from the float, NOT from escrow.
        assertEq(raffle.totalEscrow(), escrowBefore, "escrow must be untouched by the draw");
        assertLt(raffle.drawFloat(), 0.05 ether, "float should have paid the fee");

        // Deliver a word; winner is a real ticket holder.
        conductor.deliver(raffle.drawRequestId(), bytes32(uint256(12345)));
        address w = raffle.winner();
        assertTrue(w != address(0));
        // word 12345 -> ticket index 145 -> wallet 145/25 = 5.
        assertEq(w, address(uint160(0x1000 + 5)));
        assertEq(uint256(raffle.state()), uint256(RobachaRaffle.State.Complete));

        // Operator claims the full ticket proceeds.
        uint256 opBefore = operator.balance;
        vm.prank(admin);
        raffle.claimProceeds(operator);
        assertEq(operator.balance - opBefore, 200 * PRICE);
        assertEq(raffle.totalEscrow(), 0);
    }

    function test_cannotClaimProceeds_beforeDraw() public {
        _sellOut();
        vm.prank(admin);
        vm.expectRevert(RobachaRaffle.NotComplete.selector);
        raffle.claimProceeds(operator);
    }

    function test_noDoubleClaim() public {
        _sellOut();
        vm.prank(address(0xBEEF));
        raffle.requestDraw();
        conductor.deliver(raffle.drawRequestId(), bytes32(uint256(7)));
        vm.prank(admin);
        raffle.claimProceeds(operator);
        vm.prank(admin);
        vm.expectRevert(RobachaRaffle.AlreadyClaimed.selector);
        raffle.claimProceeds(operator);
    }

    function test_callback_conductorOnly() public {
        _sellOut();
        vm.prank(address(0xBEEF));
        raffle.requestDraw();
        uint256 rid = raffle.drawRequestId();
        vm.prank(address(0xBAD));
        vm.expectRevert(RobachaRaffle.NotConductor.selector);
        raffle.rawFulfillEntropy(rid, bytes32(uint256(1)));
    }

    // --------------------------------------------------- refund: never sold out
    function test_notSoldOut_refundPath() public {
        address b0 = _buyer(0);
        address b1 = _buyer(1);
        vm.prank(b0);
        raffle.buyTicket{value: 10 * PRICE}(10);
        vm.prank(b1);
        raffle.buyTicket{value: 5 * PRICE}(5);

        // Before close, cannot refund.
        vm.expectRevert(RobachaRaffle.NotRefundable.selector);
        raffle.markRefundable();

        vm.warp(block.timestamp + 24 hours + 1);
        raffle.markRefundable();
        assertEq(uint256(raffle.state()), uint256(RobachaRaffle.State.Refundable));

        uint256 b0Before = b0.balance;
        vm.prank(b0);
        raffle.withdrawRefund();
        assertEq(b0.balance - b0Before, 10 * PRICE);

        // No double refund.
        vm.prank(b0);
        vm.expectRevert(RobachaRaffle.AlreadyRefunded.selector);
        raffle.withdrawRefund();

        // The other buyer is still whole.
        uint256 b1Before = b1.balance;
        vm.prank(b1);
        raffle.withdrawRefund();
        assertEq(b1.balance - b1Before, 5 * PRICE);
    }

    function test_cannotClaimProceeds_whenRefundable() public {
        address b = _buyer(0);
        vm.prank(b);
        raffle.buyTicket{value: PRICE}(1);
        vm.warp(block.timestamp + 24 hours + 1);
        raffle.markRefundable();
        vm.prank(admin);
        vm.expectRevert(RobachaRaffle.NotComplete.selector);
        raffle.claimProceeds(operator);
    }

    // ------------------------------------------ fail-closed: sold out, draw dies
    function test_failClosed_drawStalls_refundsOpen() public {
        _sellOut();
        vm.prank(address(0xBEEF));
        raffle.requestDraw();

        // Word never arrives. Before the timeout, still not refundable.
        vm.expectRevert(RobachaRaffle.NotRefundable.selector);
        raffle.markRefundable();

        // Past DRAW_TIMEOUT from sellout, refunds open — the escrow is whole,
        // because the fee was paid from the float.
        vm.warp(block.timestamp + 2 hours + 1);
        raffle.markRefundable();

        for (uint256 i = 0; i < 8; ++i) {
            address b = address(uint160(0x1000 + i));
            uint256 before = b.balance;
            vm.prank(b);
            raffle.withdrawRefund();
            assertEq(b.balance - before, 25 * PRICE, "every buyer refunded in full");
        }
        assertEq(raffle.totalEscrow(), 0);
    }

    function test_failClosed_requestNeverCalled() public {
        _sellOut();
        // Nobody ever calls requestDraw. Money still cannot lock.
        vm.warp(block.timestamp + 2 hours + 1);
        raffle.markRefundable();
        address b = address(uint160(0x1000));
        uint256 before = b.balance;
        vm.prank(b);
        raffle.withdrawRefund();
        assertEq(b.balance - before, 25 * PRICE);
    }

    function test_lateWord_afterRefunds_reverts() public {
        _sellOut();
        vm.prank(address(0xBEEF));
        raffle.requestDraw();
        uint256 rid = raffle.drawRequestId();
        vm.warp(block.timestamp + 2 hours + 1);
        raffle.markRefundable();

        // A word arriving now must not create a winner for a refunding raffle.
        vm.expectRevert(RobachaRaffle.DrawClosed.selector);
        conductor.deliver(rid, bytes32(uint256(1)));
    }

    // ---------------------------------------------------------------- draw float
    function test_reclaimStrandedFee_restoresFloat() public {
        _sellOut();
        uint256 floatBefore = raffle.drawFloat();
        vm.prank(address(0xBEEF));
        raffle.requestDraw();
        assertLt(raffle.drawFloat(), floatBefore);

        vm.warp(block.timestamp + 2 hours + 1);
        raffle.markRefundable();

        raffle.reclaimStrandedFee();
        assertEq(raffle.drawFloat(), floatBefore, "fee recovered to the float");

        // And no double reclaim.
        vm.expectRevert(RobachaRaffle.AlreadyClaimed.selector);
        raffle.reclaimStrandedFee();
    }

    function test_withdrawDrawFloat_onlyWhenFinished() public {
        _sellOut();
        // Mid-raffle: the float must stay to pay for the draw.
        vm.prank(admin);
        vm.expectRevert(RobachaRaffle.NotFinished.selector);
        raffle.withdrawDrawFloat(operator);

        vm.prank(address(0xBEEF));
        raffle.requestDraw();
        conductor.deliver(raffle.drawRequestId(), bytes32(uint256(3)));

        uint256 opBefore = operator.balance;
        uint256 floatAmt = raffle.drawFloat();
        vm.prank(admin);
        raffle.withdrawDrawFloat(operator);
        assertEq(operator.balance - opBefore, floatAmt);
        assertEq(raffle.drawFloat(), 0);
    }

    function test_requestDraw_requiresSellout() public {
        address b = _buyer(0);
        vm.prank(b);
        raffle.buyTicket{value: PRICE}(1);
        vm.expectRevert(RobachaRaffle.NotSoldOut.selector);
        raffle.requestDraw();
    }
}
