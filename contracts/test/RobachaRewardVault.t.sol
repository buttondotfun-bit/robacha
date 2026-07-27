// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RobachaBase} from "./RobachaBase.t.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {FeeOnTransferERC20, MockERC20, RebasingERC20} from "./mocks/MockERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract RobachaRewardVaultTest is RobachaBase {
    // ------------------------------------------------------------------
    // Non-standard tokens
    // ------------------------------------------------------------------

    function test_feeOnTransferTokenIsRejectedOnDeposit() public {
        FeeOnTransferERC20 fot = new FeeOnTransferERC20();
        fot.mint(admin, 1_000e18);

        vm.startPrank(admin);
        fot.approve(address(vault), 1_000e18);
        vm.expectRevert(
            abi.encodeWithSelector(
                RobachaRewardVault.NonStandardTransfer.selector, address(fot), uint256(1_000e18), uint256(990e18)
            )
        );
        vault.fund(address(fot), 1_000e18);
        vm.stopPrank();

        assertEq(vault.depositedNet(address(fot)), 0, "nothing was credited");
    }

    function test_rebasingTokenIsReportedUnhealthyOnceItDrifts() public {
        RebasingERC20 rebasing = new RebasingERC20();
        rebasing.mint(admin, 1_000e18);

        vm.startPrank(admin);
        rebasing.approve(address(vault), 1_000e18);
        vault.fund(address(rebasing), 1_000e18);
        vm.stopPrank();

        assertTrue(vault.isSolvent(address(rebasing)), "healthy while the balance holds");

        rebasing.rebaseDown(address(vault), 400e18);

        assertFalse(vault.isSolvent(address(rebasing)), "drift below deposits is detected");
    }

    function test_availableFloorsAtZeroRatherThanUnderflowing() public {
        RebasingERC20 rebasing = new RebasingERC20();
        rebasing.mint(admin, 1_000e18);

        vm.startPrank(admin);
        rebasing.approve(address(vault), 1_000e18);
        vault.fund(address(rebasing), 1_000e18);
        vault.grantRole(RobachaRoles.GACHA_ROLE, address(this));
        vm.stopPrank();

        vault.reserve(address(rebasing), 900e18);
        rebasing.rebaseDown(address(vault), 950e18);

        assertEq(vault.available(address(rebasing)), 0, "reports zero, does not revert");
    }

    // ------------------------------------------------------------------
    // Reservation
    // ------------------------------------------------------------------

    function test_cannotReserveBeyondTheBalance() public {
        _fundVault(tokenA, 100e18);
        vm.prank(admin);
        vault.grantRole(RobachaRoles.GACHA_ROLE, address(this));

        vm.expectRevert(
            abi.encodeWithSelector(
                RobachaRewardVault.InsufficientAvailable.selector, address(tokenA), uint256(101e18), uint256(100e18)
            )
        );
        vault.reserve(address(tokenA), 101e18);
    }

    function test_reserveRequiresTheGachaRole() public {
        _fundVault(tokenA, 100e18);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, RobachaRoles.GACHA_ROLE
            )
        );
        vault.reserve(address(tokenA), 1e18);
    }

    function test_surplusWithdrawalCannotTouchReservedInventory() public {
        _fundVault(tokenA, 100e18);
        vm.prank(admin);
        vault.grantRole(RobachaRoles.GACHA_ROLE, address(this));
        vault.reserve(address(tokenA), 80e18);

        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                RobachaRewardVault.InsufficientAvailable.selector, address(tokenA), uint256(30e18), uint256(20e18)
            )
        );
        vault.withdrawSurplus(address(tokenA), admin, 30e18);

        vm.prank(admin);
        vault.withdrawSurplus(address(tokenA), admin, 20e18); // exactly the free part
        assertEq(vault.reserved(address(tokenA)), 80e18, "the liability is untouched");
    }

    function test_payRequiresAnExistingReservation() public {
        _fundVault(tokenA, 100e18);
        vm.prank(admin);
        vault.grantRole(RobachaRoles.GACHA_ROLE, address(this));

        vm.expectRevert(
            abi.encodeWithSelector(
                RobachaRewardVault.InsufficientReserved.selector, address(tokenA), uint256(1e18), uint256(0)
            )
        );
        vault.pay(address(tokenA), alice, 1e18);
    }

    function test_pauseStopsFundingButNotPayouts() public {
        _fundVault(tokenA, 100e18);
        vm.startPrank(admin);
        vault.grantRole(RobachaRoles.GACHA_ROLE, address(this));
        vault.pause();
        vm.stopPrank();

        tokenA.mint(admin, 10e18);
        vm.startPrank(admin);
        tokenA.approve(address(vault), 10e18);
        vm.expectRevert();
        vault.fund(address(tokenA), 10e18);
        vm.stopPrank();

        // A user's assigned reward is still payable while paused.
        vault.reserve(address(tokenA), 5e18);
        vault.pay(address(tokenA), alice, 5e18);
        assertEq(tokenA.balanceOf(alice), 5e18);
    }

    function test_knownTokensTracksEveryFundedToken() public {
        _fundVault(tokenA, 10e18);
        _fundVault(tokenB, 10e18);
        _fundVault(tokenA, 10e18); // funding twice must not duplicate

        assertEq(vault.knownTokenCount(), 2);
        address[] memory tokens = vault.knownTokens();
        assertTrue(
            (tokens[0] == address(tokenA) && tokens[1] == address(tokenB))
                || (tokens[0] == address(tokenB) && tokens[1] == address(tokenA))
        );
    }

    function test_fundingRequiresTheVaultManagerRole() public {
        tokenA.mint(alice, 10e18);
        vm.startPrank(alice);
        tokenA.approve(address(vault), 10e18);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, RobachaRoles.VAULT_MANAGER_ROLE
            )
        );
        vault.fund(address(tokenA), 10e18);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // The core invariant, under fuzzing
    // ------------------------------------------------------------------

    function testFuzz_reservationsNeverExceedTheBalance(uint96 deposit, uint96 reserveAmount) public {
        vm.assume(deposit > 0);
        MockERC20 token = new MockERC20("Fuzz", "FZZ", 18);
        token.mint(admin, deposit);

        vm.startPrank(admin);
        token.approve(address(vault), deposit);
        vault.fund(address(token), deposit);
        vault.grantRole(RobachaRoles.GACHA_ROLE, address(this));
        vm.stopPrank();

        if (reserveAmount == 0) return;
        if (reserveAmount > deposit) {
            vm.expectRevert();
            vault.reserve(address(token), reserveAmount);
        } else {
            vault.reserve(address(token), reserveAmount);
        }

        assertLe(vault.reserved(address(token)), token.balanceOf(address(vault)), "liabilities never exceed holdings");
    }
}
