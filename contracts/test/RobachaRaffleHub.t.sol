// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {RobachaRaffleHub} from "../src/RobachaRaffleHub.sol";

interface IRawFulfill {
    function rawFulfillEntropy(uint256 requestId, bytes32 word) external;
}

/// @dev Test-only conductor, modelled on the deployed one: reverts underpaid,
///      delivers through the callback, refunds on cancel.
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

contract MockERC721 is ERC721 {
    constructor() ERC721("Mock", "MOCK") {}
    function mint(address to, uint256 id) external { _mint(to, id); }
}

contract RobachaRaffleHubTest is Test {
    RobachaRaffleHub hub;
    MockConductor conductor;
    MockERC721 nft;

    address admin = address(0xA11CE);
    address creator = address(0xC0FFEE);
    address treasury = address(0x7EEA);

    uint256 constant PRICE = 0.01 ether;
    uint32 constant CAP = 10;
    uint32 constant PER_WALLET = 5;
    uint256 constant DURATION = 1 days;

    function setUp() public {
        conductor = new MockConductor();
        vm.deal(address(conductor), 10 ether); // for cancel refunds
        hub = new RobachaRaffleHub(admin, address(conductor));
        nft = new MockERC721();

        vm.deal(admin, 5 ether);
        vm.prank(admin);
        hub.fundDrawFloat{value: 1 ether}();
    }

    // ---------------------------------------------------------------- helpers
    function _mintAndList(uint256 tokenId) internal returns (uint256 id) {
        nft.mint(creator, tokenId);
        vm.startPrank(creator);
        nft.approve(address(hub), tokenId);
        id = hub.createRaffle(address(nft), tokenId, PRICE, CAP, PER_WALLET, 0, DURATION);
        vm.stopPrank();
    }

    function _buyer(uint256 i) internal returns (address a) {
        a = address(uint160(0x1000 + i));
        vm.deal(a, 10 ether);
    }

    function _buy(uint256 id, address b, uint32 qty) internal {
        vm.prank(b);
        hub.buyTicket{value: qty * PRICE}(id, qty);
    }

    /// Sell CAP tickets across two wallets (5 + 5).
    function _sellOut(uint256 id) internal returns (address b0, address b1) {
        b0 = _buyer(0);
        b1 = _buyer(1);
        _buy(id, b0, PER_WALLET);
        _buy(id, b1, PER_WALLET);
        assertEq(uint256(hub.state(id)), uint256(RobachaRaffleHub.State.AwaitingDraw));
    }

    function _drawRequestId(uint256 id) internal view returns (uint256) {
        return hub.getRaffle(id).drawRequestId;
    }

    // ----------------------------------------------------------------- listing
    function test_create_escrowsAndRecords() public {
        uint256 id = _mintAndList(1);
        assertEq(id, 1);
        assertEq(nft.ownerOf(1), address(hub));
        assertEq(uint256(hub.state(id)), uint256(RobachaRaffleHub.State.Open));

        RobachaRaffleHub.Raffle memory r = hub.getRaffle(id);
        assertEq(r.creator, creator);
        assertEq(r.nft, address(nft));
        assertEq(r.tokenId, 1);
        assertEq(r.ticketPriceWei, PRICE);
        assertEq(r.ticketCap, CAP);
        assertEq(r.maxPerWallet, PER_WALLET);
    }

    function test_create_revertsWithoutApproval() public {
        nft.mint(creator, 2);
        vm.prank(creator);
        vm.expectRevert();
        hub.createRaffle(address(nft), 2, PRICE, CAP, PER_WALLET, 0, DURATION);
    }

    function test_create_rejectsBadConfig() public {
        nft.mint(creator, 3);
        vm.startPrank(creator);
        nft.approve(address(hub), 3);
        // zero price
        vm.expectRevert(RobachaRaffleHub.BadConfig.selector);
        hub.createRaffle(address(nft), 3, 0, CAP, PER_WALLET, 0, DURATION);
        // cap below floor
        vm.expectRevert(RobachaRaffleHub.BadConfig.selector);
        hub.createRaffle(address(nft), 3, PRICE, 1, 1, 0, DURATION);
        // perWallet above cap
        vm.expectRevert(RobachaRaffleHub.BadConfig.selector);
        hub.createRaffle(address(nft), 3, PRICE, CAP, CAP + 1, 0, DURATION);
        // duration too short
        vm.expectRevert(RobachaRaffleHub.BadConfig.selector);
        hub.createRaffle(address(nft), 3, PRICE, CAP, PER_WALLET, 0, 1 minutes);
        // duration too long
        vm.expectRevert(RobachaRaffleHub.BadConfig.selector);
        hub.createRaffle(address(nft), 3, PRICE, CAP, PER_WALLET, 0, 60 days);
        // start too far ahead
        vm.expectRevert(RobachaRaffleHub.BadConfig.selector);
        hub.createRaffle(address(nft), 3, PRICE, CAP, PER_WALLET, uint64(block.timestamp + 30 days), DURATION);
        vm.stopPrank();
    }

    function test_create_blockedWhenPaused() public {
        vm.prank(admin);
        hub.setListingsPaused(true);
        nft.mint(creator, 4);
        vm.startPrank(creator);
        nft.approve(address(hub), 4);
        vm.expectRevert(RobachaRaffleHub.ListingsArePaused.selector);
        hub.createRaffle(address(nft), 4, PRICE, CAP, PER_WALLET, 0, DURATION);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ buying
    function test_buy_recordsAndEscrows() public {
        uint256 id = _mintAndList(1);
        address b = _buyer(0);
        _buy(id, b, 3);
        assertEq(hub.ticketsOf(id, b), 3);
        assertEq(hub.paidWei(id, b), 3 * PRICE);
        RobachaRaffleHub.Raffle memory r = hub.getRaffle(id);
        assertEq(r.ticketsSold, 3);
        assertEq(r.totalEscrow, 3 * PRICE);
    }

    function test_buy_walletCap() public {
        uint256 id = _mintAndList(1);
        address b = _buyer(0);
        vm.prank(b);
        vm.expectRevert(abi.encodeWithSelector(RobachaRaffleHub.WalletCapExceeded.selector, uint32(6), PER_WALLET));
        hub.buyTicket{value: 6 * PRICE}(id, 6);
    }

    function test_buy_exactPayment() public {
        uint256 id = _mintAndList(1);
        address b = _buyer(0);
        vm.prank(b);
        vm.expectRevert(abi.encodeWithSelector(RobachaRaffleHub.IncorrectPayment.selector, 2 * PRICE, 2 * PRICE + 1));
        hub.buyTicket{value: 2 * PRICE + 1}(id, 2);
    }

    function test_buy_capEnforced() public {
        uint256 id = _mintAndList(1);
        _buy(id, _buyer(0), 5);
        address b = _buyer(1);
        // only 5 left; asking 6 exceeds the wallet cap first — use a fresh 5+ok, then over.
        _buy(id, b, 5); // fills to 10
        address b2 = _buyer(2);
        vm.prank(b2);
        vm.expectRevert(RobachaRaffleHub.SoldOutAlready.selector);
        hub.buyTicket{value: PRICE}(id, 1);
    }

    function test_buy_unknownRaffleReverts() public {
        address b = _buyer(0);
        vm.prank(b);
        vm.expectRevert(RobachaRaffleHub.UnknownRaffle.selector);
        hub.buyTicket{value: PRICE}(99, 1);
    }

    // ------------------------------------------------------------- happy path
    function test_fullHappyPath_paysWinnerCreatorPlatform() public {
        uint256 id = _mintAndList(1);
        (address b0, address b1) = _sellOut(id);

        // draw
        hub.requestDraw(id);
        uint256 rid = _drawRequestId(id);

        // Deliver a word landing on ticket index 7 -> second wallet (indices 5..9).
        conductor.deliver(rid, bytes32(uint256(7)));
        assertEq(uint256(hub.state(id)), uint256(RobachaRaffleHub.State.Complete));
        assertEq(hub.getRaffle(id).winner, b1);

        // prize
        hub.claimPrize(id);
        assertEq(nft.ownerOf(1), b1);

        // proceeds: 90% creator, 10% platform
        uint256 gross = CAP * PRICE;
        uint256 fee = gross / 10;
        uint256 creatorBefore = creator.balance;
        hub.claimProceeds(id);
        assertEq(creator.balance, creatorBefore + (gross - fee));
        assertEq(hub.platformFees(), fee);

        // platform withdraws its fee
        vm.prank(admin);
        hub.withdrawPlatformFees(treasury);
        assertEq(treasury.balance, fee);

        // no double settle
        vm.expectRevert(RobachaRaffleHub.AlreadySettled.selector);
        hub.claimPrize(id);
        vm.expectRevert(RobachaRaffleHub.AlreadySettled.selector);
        hub.claimProceeds(id);

        b0; // silence unused
    }

    function test_weightedDraw_firstWalletWindow() public {
        uint256 id = _mintAndList(1);
        (address b0,) = _sellOut(id);
        hub.requestDraw(id);
        uint256 rid = _drawRequestId(id);
        // index 0..4 -> first wallet
        conductor.deliver(rid, bytes32(uint256(20))); // 20 % 10 = 0
        assertEq(hub.getRaffle(id).winner, b0);
    }

    // --------------------------------------------------------------- draw rules
    function test_requestDraw_revertsIfNotSoldOut() public {
        uint256 id = _mintAndList(1);
        _buy(id, _buyer(0), 3);
        vm.expectRevert(RobachaRaffleHub.NotSoldOut.selector);
        hub.requestDraw(id);
    }

    function test_requestDraw_revertsIfFloatThin() public {
        uint256 id = _mintAndList(1);
        _sellOut(id);
        // drain the float (admin-only)
        uint256 f = hub.drawFloat();
        vm.prank(admin);
        hub.withdrawDrawFloat(admin, f);
        vm.expectRevert();
        hub.requestDraw(id);
    }

    function test_fulfill_onlyConductor() public {
        uint256 id = _mintAndList(1);
        _sellOut(id);
        hub.requestDraw(id);
        uint256 rid = _drawRequestId(id);
        vm.expectRevert(RobachaRaffleHub.NotConductor.selector);
        hub.rawFulfillEntropy(rid, bytes32(uint256(1)));
    }

    function test_fulfill_unknownRequestReverts() public {
        // deliver from conductor with an id the hub never mapped
        vm.prank(address(conductor));
        vm.expectRevert(RobachaRaffleHub.UnknownRequest.selector);
        hub.rawFulfillEntropy(4242, bytes32(uint256(1)));
    }

    // ------------------------------------------------------------- refund paths
    function test_refund_expiredUnsold() public {
        uint256 id = _mintAndList(1);
        address b = _buyer(0);
        _buy(id, b, 3);
        // let the window elapse
        vm.warp(block.timestamp + DURATION + 1);
        hub.markRefundable(id);
        assertEq(uint256(hub.state(id)), uint256(RobachaRaffleHub.State.Refundable));

        uint256 before = b.balance;
        vm.prank(b);
        hub.withdrawRefund(id);
        assertEq(b.balance, before + 3 * PRICE);

        // no double refund
        vm.prank(b);
        vm.expectRevert(RobachaRaffleHub.AlreadyRefunded.selector);
        hub.withdrawRefund(id);

        // creator reclaims the NFT
        hub.reclaimNft(id);
        assertEq(nft.ownerOf(1), creator);
    }

    function test_failClosed_soldOutButDrawNeverRequested() public {
        uint256 id = _mintAndList(1);
        (address b0, address b1) = _sellOut(id);
        // Nobody ever calls requestDraw. After the timeout from soldOut, refunds open.
        vm.warp(block.timestamp + hub.DRAW_TIMEOUT() + 1);
        hub.markRefundable(id);
        assertEq(uint256(hub.state(id)), uint256(RobachaRaffleHub.State.Refundable));

        uint256 before0 = b0.balance;
        vm.prank(b0);
        hub.withdrawRefund(id);
        assertEq(b0.balance, before0 + PER_WALLET * PRICE);
        vm.prank(b1);
        hub.withdrawRefund(id);

        hub.reclaimNft(id);
        assertEq(nft.ownerOf(1), creator);

        // escrow emptied exactly
        assertEq(hub.getRaffle(id).totalEscrow, 0);
    }

    function test_failClosed_drawStallsThenRefund() public {
        uint256 id = _mintAndList(1);
        _sellOut(id);
        hub.requestDraw(id); // requested, but the word never arrives
        vm.warp(block.timestamp + hub.DRAW_TIMEOUT() + 1);
        hub.markRefundable(id);
        assertEq(uint256(hub.state(id)), uint256(RobachaRaffleHub.State.Refundable));
    }

    function test_lateWordRejectedAfterRefunds() public {
        uint256 id = _mintAndList(1);
        _sellOut(id);
        hub.requestDraw(id);
        uint256 rid = _drawRequestId(id);
        vm.warp(block.timestamp + hub.DRAW_TIMEOUT() + 1);
        hub.markRefundable(id);
        // a word arriving now must not crown a winner
        vm.expectRevert(RobachaRaffleHub.DrawClosed.selector);
        conductor.deliver(rid, bytes32(uint256(3)));
    }

    function test_reclaimStrandedFee_creditsFloat() public {
        uint256 id = _mintAndList(1);
        _sellOut(id);
        uint256 floatBefore = hub.drawFloat();
        hub.requestDraw(id);
        assertLt(hub.drawFloat(), floatBefore); // fee was spent
        hub.reclaimStrandedFee(id);
        assertEq(hub.drawFloat(), floatBefore); // fee recovered
    }

    // ------------------------------------------------------------------ cancel
    function test_cancel_creatorNoSales() public {
        uint256 id = _mintAndList(1);
        vm.prank(creator);
        hub.cancelRaffle(id);
        assertEq(nft.ownerOf(1), creator);
        assertEq(uint256(hub.state(id)), uint256(RobachaRaffleHub.State.Cancelled));
    }

    function test_cancel_revertsWithSales() public {
        uint256 id = _mintAndList(1);
        _buy(id, _buyer(0), 1);
        vm.prank(creator);
        vm.expectRevert(RobachaRaffleHub.HasSales.selector);
        hub.cancelRaffle(id);
    }

    function test_cancel_onlyCreator() public {
        uint256 id = _mintAndList(1);
        vm.prank(_buyer(0));
        vm.expectRevert(RobachaRaffleHub.NotCreator.selector);
        hub.cancelRaffle(id);
    }

    // ------------------------------------------------------------------- admin
    function test_admin_gates() public {
        vm.prank(_buyer(0));
        vm.expectRevert();
        hub.setListingsPaused(true);

        vm.prank(_buyer(0));
        vm.expectRevert();
        hub.withdrawPlatformFees(treasury);

        vm.prank(_buyer(0));
        vm.expectRevert();
        hub.withdrawDrawFloat(treasury, 1);
    }

    function test_buy_blockedAfterComplete() public {
        uint256 id = _mintAndList(1);
        _sellOut(id);
        hub.requestDraw(id);
        conductor.deliver(_drawRequestId(id), bytes32(uint256(1)));
        // sold out already anyway, but assert the state gate
        address b = _buyer(5);
        vm.prank(b);
        vm.expectRevert(); // NotOpen or SoldOutAlready
        hub.buyTicket{value: PRICE}(id, 1);
    }

    // Two independent raffles settle without touching each other's money.
    function test_isolation_twoRaffles() public {
        uint256 idA = _mintAndList(1);
        uint256 idB = _mintAndList(2);

        (, address a1) = _sellOut(idA);
        // only partially fill B
        _buy(idB, _buyer(2), 4);

        hub.requestDraw(idA);
        conductor.deliver(_drawRequestId(idA), bytes32(uint256(9))); // index 9 -> wallet 1 of A
        assertEq(hub.getRaffle(idA).winner, a1);

        hub.claimProceeds(idA);
        // B's escrow untouched
        assertEq(hub.getRaffle(idB).totalEscrow, 4 * PRICE);
    }
}
