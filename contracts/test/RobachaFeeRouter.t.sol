// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RobachaBase} from "./RobachaBase.t.sol";
import {RobachaFeeRouter} from "../src/RobachaFeeRouter.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract RobachaFeeRouterTest is RobachaBase {
    // ------------------------------------------------------------------
    // Split configuration and caps
    // ------------------------------------------------------------------

    function test_initialSplitMatchesSpecifiedValues() public view {
        (uint16 protocolBps, uint16 operationsBps, uint16 rewardBps) = feeRouter.currentSplit();
        assertEq(protocolBps, 1_200, "protocol 12%");
        assertEq(operationsBps, 300, "operations 3%");
        assertEq(rewardBps, 8_500, "reward reserve 85%");
        assertEq(uint256(protocolBps) + operationsBps + rewardBps, 10_000, "totals denominator");
    }

    function test_constructorRejectsSplitThatDoesNotTotalDenominator() public {
        vm.expectRevert(abi.encodeWithSelector(RobachaFeeRouter.FeeTotalInvalid.selector, uint256(9_999)));
        new RobachaFeeRouter(
            admin, protocolTreasury, operationsTreasury, rewardTreasury, randomnessTreasury, 1_200, 300, 8_499
        );
    }

    function test_proposeRejectsProtocolFeeAboveCap() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(RobachaFeeRouter.ProtocolFeeTooHigh.selector, uint16(2_001)));
        feeRouter.proposeFeeChange(2_001, 300, 7_699);
    }

    function test_proposeRejectsOperationsFeeAboveCap() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(RobachaFeeRouter.OperationsFeeTooHigh.selector, uint16(501)));
        feeRouter.proposeFeeChange(1_200, 501, 8_299);
    }

    function test_proposeRejectsSplitThatDoesNotTotalDenominator() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(RobachaFeeRouter.FeeTotalInvalid.selector, uint256(10_001)));
        feeRouter.proposeFeeChange(1_200, 300, 8_501);
    }

    function test_onlyAdminMayProposeFeeChange() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, alice, bytes32(0))
        );
        feeRouter.proposeFeeChange(1_000, 300, 8_700);
    }

    // ------------------------------------------------------------------
    // Timelock
    // ------------------------------------------------------------------

    function test_feeChangeCannotExecuteBeforeTimelockElapses() public {
        vm.startPrank(admin);
        feeRouter.proposeFeeChange(1_000, 300, 8_700);

        (,,, uint64 executableAt,) = feeRouter.pendingFeeChange();
        assertEq(executableAt, block.timestamp + 48 hours, "48 hour timelock");

        vm.warp(executableAt - 1);
        vm.expectRevert(abi.encodeWithSelector(RobachaFeeRouter.TimelockNotElapsed.selector, executableAt));
        feeRouter.executeFeeChange();
        vm.stopPrank();
    }

    function test_feeChangeExecutesAfterTimelock() public {
        vm.startPrank(admin);
        feeRouter.proposeFeeChange(1_000, 200, 8_800);
        vm.warp(block.timestamp + 48 hours);
        feeRouter.executeFeeChange();
        vm.stopPrank();

        (uint16 protocolBps, uint16 operationsBps, uint16 rewardBps) = feeRouter.currentSplit();
        assertEq(protocolBps, 1_000);
        assertEq(operationsBps, 200);
        assertEq(rewardBps, 8_800);
    }

    function test_executeWithoutProposalReverts() public {
        vm.prank(admin);
        vm.expectRevert(RobachaFeeRouter.NoPendingFeeChange.selector);
        feeRouter.executeFeeChange();
    }

    function test_cancelClearsPendingChange() public {
        vm.startPrank(admin);
        feeRouter.proposeFeeChange(1_000, 200, 8_800);
        feeRouter.cancelFeeChange();
        vm.warp(block.timestamp + 48 hours);
        vm.expectRevert(RobachaFeeRouter.NoPendingFeeChange.selector);
        feeRouter.executeFeeChange();
        vm.stopPrank();
    }

    /// @dev The whole point of the timelock: a live pool keeps its own economics.
    function test_feeChangeDoesNotAlterAlreadyLaunchedPoolVersion() public {
        uint256 id = _createStandardPool();

        vm.startPrank(admin);
        feeRouter.proposeFeeChange(2_000, 500, 7_500);
        vm.warp(block.timestamp + 48 hours);
        feeRouter.executeFeeChange();
        vm.stopPrank();

        _spin(alice, id, 1);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("word")));
        gacha.settleEntries(roundId, 25);

        // The version snapshotted 12% / 3%, so that is what routed.
        uint256 expectedProtocol = (BASE_PRICE * 1_200) / 10_000;
        assertEq(feeRouter.lifetimeProtocolRevenue(), expectedProtocol, "old split honoured");
        assertEq(feeRouter.accrued(protocolTreasury), expectedProtocol);
    }

    // ------------------------------------------------------------------
    // Routing and accounting
    // ------------------------------------------------------------------

    function test_routingSplitsExactlyAndLeavesNoRemainder() public {
        uint256 id = _createStandardPool();
        _spin(alice, id, 4);

        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("split")));
        gacha.settleEntries(roundId, 25);

        uint256 base = BASE_PRICE * 4;
        uint256 protocolAmount = (base * PROTOCOL_BPS) / 10_000;
        uint256 operationsAmount = (base * OPERATIONS_BPS) / 10_000;
        uint256 rewardAmount = base - protocolAmount - operationsAmount;

        assertEq(feeRouter.accrued(protocolTreasury), protocolAmount, "protocol share");
        assertEq(feeRouter.accrued(operationsTreasury), operationsAmount, "operations share");
        assertEq(feeRouter.accrued(rewardTreasury), rewardAmount, "reward share");
        assertEq(
            protocolAmount + operationsAmount + rewardAmount, base, "three parts reconstruct the base exactly"
        );
        assertEq(feeRouter.lifetimeBaseRevenue(), base);
    }

    function test_routedSurchargeIsAccountedSeparatelyFromRevenue() public {
        uint256 id = _createStandardPool();
        _spin(alice, id, 3);

        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("surcharge")));
        gacha.settleEntries(roundId, 25);

        // The CCIP fee came out of the surcharge pot; the remainder is routed to
        // the randomness account and is never counted as protocol revenue.
        uint256 surchargePot = SURCHARGE * 3;
        uint256 ccipFee = router.fee();
        assertEq(feeRouter.lifetimeRandomnessSurcharge(), surchargePot - ccipFee, "unspent surcharge routed");
        assertEq(feeRouter.accrued(randomnessTreasury), surchargePot - ccipFee);
        assertEq(feeRouter.lifetimeBaseRevenue(), BASE_PRICE * 3, "surcharge excluded from base revenue");
    }

    function test_routeSettlementRejectsValueMismatch() public {
        vm.prank(admin);
        feeRouter.grantRole(RobachaRoles.GACHA_ROLE, address(this));

        vm.deal(address(this), 1 ether);
        vm.expectRevert(abi.encodeWithSelector(RobachaFeeRouter.ValueMismatch.selector, 3 ether, 1 ether));
        feeRouter.routeSettlement{value: 1 ether}(1, 1, 1, 2 ether, 1 ether, 1_200, 300, 8_500);
    }

    function test_routeSettlementRejectsUnauthorisedCaller() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, RobachaRoles.GACHA_ROLE
            )
        );
        feeRouter.routeSettlement{value: 1 ether}(1, 1, 1, 1 ether, 0, 1_200, 300, 8_500);
    }

    // ------------------------------------------------------------------
    // Withdrawals
    // ------------------------------------------------------------------

    function test_withdrawSendsToTheAccrualDestinationOnly() public {
        uint256 id = _createStandardPool();
        _spin(alice, id, 2);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("withdraw")));
        gacha.settleEntries(roundId, 25);

        uint256 owed = feeRouter.accrued(protocolTreasury);
        assertGt(owed, 0);

        vm.prank(admin);
        feeRouter.withdraw(protocolTreasury);

        assertEq(protocolTreasury.balance, owed, "paid to the treasury it accrued for");
        assertEq(feeRouter.accrued(protocolTreasury), 0);
        assertEq(feeRouter.lifetimeWithdrawn(), owed);
    }

    function test_withdrawRequiresTreasuryRole() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, RobachaRoles.TREASURY_ROLE
            )
        );
        feeRouter.withdraw(protocolTreasury);
    }

    function test_withdrawWithNothingAccruedReverts() public {
        vm.prank(admin);
        vm.expectRevert(RobachaFeeRouter.NothingAccrued.selector);
        feeRouter.withdraw(protocolTreasury);
    }

    function test_rotatingTreasuryCarriesTheAccrualAcross() public {
        uint256 id = _createStandardPool();
        _spin(alice, id, 2);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("rotate")));
        gacha.settleEntries(roundId, 25);

        uint256 owed = feeRouter.accrued(protocolTreasury);
        address newTreasury = makeAddr("newProtocolTreasury");

        vm.prank(admin);
        feeRouter.setTreasuries(newTreasury, operationsTreasury, rewardTreasury, randomnessTreasury);

        assertEq(feeRouter.accrued(protocolTreasury), 0, "old destination emptied");
        assertEq(feeRouter.accrued(newTreasury), owed, "balance follows the destination");
    }

    // ------------------------------------------------------------------
    // Solvency
    // ------------------------------------------------------------------

    function test_contractHoldsAtLeastWhatItOwes() public {
        uint256 id = _createStandardPool();
        _spin(alice, id, 5);
        uint256 roundId = gacha.openRound(id);
        _fulfilRound(roundId, uint256(keccak256("solvency")));
        gacha.settleEntries(roundId, 25);

        assertGe(address(feeRouter).balance, feeRouter.totalLiabilities(), "balance covers liabilities");
    }

    function testFuzz_splitAlwaysReconstructsTheBase(uint96 baseAmount) public {
        vm.assume(baseAmount > 0);

        vm.prank(admin);
        feeRouter.grantRole(RobachaRoles.GACHA_ROLE, address(this));
        vm.deal(address(this), uint256(baseAmount));

        feeRouter.routeSettlement{value: baseAmount}(1, 1, 1, baseAmount, 0, 1_200, 300, 8_500);

        uint256 total = feeRouter.accrued(protocolTreasury) + feeRouter.accrued(operationsTreasury)
            + feeRouter.accrued(rewardTreasury);
        assertEq(total, baseAmount, "no wei is created or lost by the split");
    }
}
