// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RobachaBase} from "./RobachaBase.t.sol";
import {RobachaPoolRegistry} from "../src/RobachaPoolRegistry.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {MockERC20, NotAToken} from "./mocks/MockERC20.sol";

contract RobachaPoolRegistryTest is RobachaBase {
    // ------------------------------------------------------------------
    // Allowlisting
    // ------------------------------------------------------------------

    function test_allowlistRejectsAnAddressThatIsNotAnERC20() public {
        NotAToken impostor = new NotAToken();
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(RobachaPoolRegistry.TokenMetadataUnreadable.selector, address(impostor))
        );
        registry.setTokenAllowlisted(address(impostor), true);
    }

    function test_rewardMustUseAnAllowlistedToken() public {
        MockERC20 stranger = new MockERC20("Stranger", "STR", 18);

        vm.startPrank(admin);
        uint256 id = registry.createPool("Pool");
        uint16[] memory probabilities = new uint16[](1);
        probabilities[0] = 10_000;
        registry.setProbabilities(id, 1, probabilities);

        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.TokenNotAllowlisted.selector, address(stranger)));
        registry.addReward(id, 1, address(stranger), 0, 1e18, 2e18);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Probabilities
    // ------------------------------------------------------------------

    function test_probabilitiesMustTotalExactlyTenThousand() public {
        vm.startPrank(admin);
        uint256 id = registry.createPool("Pool");

        uint16[] memory low = new uint16[](2);
        low[0] = 5_000;
        low[1] = 4_999;
        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.ProbabilityTotalInvalid.selector, uint256(9_999)));
        registry.setProbabilities(id, 1, low);

        uint16[] memory high = new uint16[](2);
        high[0] = 5_000;
        high[1] = 5_001;
        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.ProbabilityTotalInvalid.selector, uint256(10_001)));
        registry.setProbabilities(id, 1, high);
        vm.stopPrank();
    }

    function test_changingProbabilitiesClearsRewardsBecauseTierIndicesShift() public {
        _fundVault(tokenA, 1_000e18);

        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(tokenA), true);
        uint256 id = registry.createPool("Pool");

        uint16[] memory two = new uint16[](2);
        two[0] = 6_000;
        two[1] = 4_000;
        registry.setProbabilities(id, 1, two);
        registry.addReward(id, 1, address(tokenA), 0, 1e18, 2e18);
        registry.addReward(id, 1, address(tokenA), 1, 3e18, 4e18);
        assertEq(registry.rewardCount(id, 1), 2);

        uint16[] memory three = new uint16[](3);
        three[0] = 5_000;
        three[1] = 3_000;
        three[2] = 2_000;
        registry.setProbabilities(id, 1, three);
        assertEq(registry.rewardCount(id, 1), 0, "reward slots cleared with the tier list");
        vm.stopPrank();
    }

    function test_rewardTierIndexMustExist() public {
        _fundVault(tokenA, 1_000e18);
        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(tokenA), true);
        uint256 id = registry.createPool("Pool");
        uint16[] memory probabilities = new uint16[](2);
        probabilities[0] = 6_000;
        probabilities[1] = 4_000;
        registry.setProbabilities(id, 1, probabilities);

        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.TierIndexOutOfRange.selector, uint8(2), uint256(2)));
        registry.addReward(id, 1, address(tokenA), 2, 1e18, 2e18);
        vm.stopPrank();
    }

    function test_rewardRangeMustBeSane() public {
        _fundVault(tokenA, 1_000e18);
        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(tokenA), true);
        uint256 id = registry.createPool("Pool");
        uint16[] memory probabilities = new uint16[](1);
        probabilities[0] = 10_000;
        registry.setProbabilities(id, 1, probabilities);

        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.InvalidAmountRange.selector, uint256(0), uint256(2e18)));
        registry.addReward(id, 1, address(tokenA), 0, 0, 2e18);

        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.InvalidAmountRange.selector, uint256(5e18), uint256(2e18)));
        registry.addReward(id, 1, address(tokenA), 0, 5e18, 2e18);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Activation gating
    // ------------------------------------------------------------------

    function test_activationFailsWhenATierHasNoRewards() public {
        _fundVault(tokenA, 1_000e18);
        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(tokenA), true);
        uint256 id = registry.createPool("Pool");

        uint16[] memory probabilities = new uint16[](2);
        probabilities[0] = 6_000;
        probabilities[1] = 4_000;
        registry.setProbabilities(id, 1, probabilities);
        registry.addReward(id, 1, address(tokenA), 0, 1e18, 2e18); // tier 1 left empty
        registry.setEconomics(id, 1, BASE_PRICE, SURCHARGE);
        registry.setRoundConfig(id, 1, 25, 60, 10, 0);

        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.PoolNotConfigured.selector, id, uint256(1)));
        registry.activate(id, 1, 0, 0);
        vm.stopPrank();
    }

    function test_activationFailsWhenInventoryCannotCoverAMaximumWin() public {
        _fundVault(tokenA, 50e18); // below the 200e18 maximum below

        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(tokenA), true);
        uint256 id = registry.createPool("Pool");
        uint16[] memory probabilities = new uint16[](1);
        probabilities[0] = 10_000;
        registry.setProbabilities(id, 1, probabilities);
        registry.addReward(id, 1, address(tokenA), 0, 100e18, 200e18);
        registry.setEconomics(id, 1, BASE_PRICE, SURCHARGE);
        registry.setRoundConfig(id, 1, 25, 60, 10, 0);

        vm.expectRevert(
            abi.encodeWithSelector(
                RobachaPoolRegistry.InsufficientInventory.selector, address(tokenA), uint256(200e18), uint256(50e18)
            )
        );
        registry.activate(id, 1, 0, 0);
        vm.stopPrank();
    }

    function test_activationFailsWithoutASpinPrice() public {
        _fundVault(tokenA, 1_000e18);
        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(tokenA), true);
        uint256 id = registry.createPool("Pool");
        uint16[] memory probabilities = new uint16[](1);
        probabilities[0] = 10_000;
        registry.setProbabilities(id, 1, probabilities);
        registry.addReward(id, 1, address(tokenA), 0, 1e18, 2e18);
        registry.setRoundConfig(id, 1, 25, 60, 10, 0);

        vm.expectRevert(RobachaPoolRegistry.SpinPriceZero.selector);
        registry.activate(id, 1, 0, 0);
        vm.stopPrank();
    }

    function test_activationReadinessReportsTheFailingCondition() public {
        _fundVault(tokenA, 50e18);
        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(tokenA), true);
        uint256 id = registry.createPool("Pool");
        uint16[] memory probabilities = new uint16[](1);
        probabilities[0] = 10_000;
        registry.setProbabilities(id, 1, probabilities);
        registry.addReward(id, 1, address(tokenA), 0, 100e18, 200e18);
        registry.setEconomics(id, 1, BASE_PRICE, SURCHARGE);
        registry.setRoundConfig(id, 1, 25, 60, 10, 0);
        vm.stopPrank();

        (bool configured, bool probabilitiesValid, bool roundValid, bool priceSet, bool solvent, address unfunded) =
            registry.activationReadiness(id, 1);

        assertTrue(configured);
        assertTrue(probabilitiesValid);
        assertTrue(roundValid);
        assertTrue(priceSet);
        assertFalse(solvent, "inventory shortfall detected");
        assertEq(unfunded, address(tokenA), "names the unfunded token");
    }

    function test_roundConfigBounds() public {
        vm.startPrank(admin);
        uint256 id = registry.createPool("Pool");

        vm.expectRevert(RobachaPoolRegistry.RoundConfigInvalid.selector);
        registry.setRoundConfig(id, 1, 0, 60, 10, 0); // zero entries

        vm.expectRevert(RobachaPoolRegistry.RoundConfigInvalid.selector);
        registry.setRoundConfig(id, 1, 101, 60, 10, 0); // above the hard limit

        vm.expectRevert(RobachaPoolRegistry.RoundConfigInvalid.selector);
        registry.setRoundConfig(id, 1, 25, 2 hours, 10, 0); // duration above the ceiling

        vm.expectRevert(RobachaPoolRegistry.RoundConfigInvalid.selector);
        registry.setRoundConfig(id, 1, 25, 60, 26, 0); // per-tx above the round size
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Versioning and immutability
    // ------------------------------------------------------------------

    function test_versionLocksOnTheFirstPaidSpin() public {
        uint256 id = _createStandardPool();

        RobachaPoolRegistry.PoolVersion memory before = registry.getVersion(id, 1);
        assertEq(before.lockedAt, 0, "unlocked before any paid entry");

        _spin(alice, id, 1);

        RobachaPoolRegistry.PoolVersion memory locked = registry.getVersion(id, 1);
        assertEq(locked.lockedAt, block.timestamp, "locked by the first paid entry");
    }

    function test_lockedVersionRejectsEveryEconomicEdit() public {
        uint256 id = _createStandardPool();
        _spin(alice, id, 1);

        vm.startPrank(admin);
        registry.deactivate(id, 1); // even deactivated, a locked version cannot be edited

        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.PoolLockedCannotEdit.selector, id, uint256(1)));
        registry.setEconomics(id, 1, BASE_PRICE * 2, SURCHARGE);

        uint16[] memory probabilities = new uint16[](2);
        probabilities[0] = 5_000;
        probabilities[1] = 5_000;
        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.PoolLockedCannotEdit.selector, id, uint256(1)));
        registry.setProbabilities(id, 1, probabilities);

        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.PoolLockedCannotEdit.selector, id, uint256(1)));
        registry.addReward(id, 1, address(tokenA), 0, 1e18, 2e18);

        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.PoolLockedCannotEdit.selector, id, uint256(1)));
        registry.setRoundConfig(id, 1, 10, 30, 5, 0);
        vm.stopPrank();
    }

    function test_activeVersionCannotBeEditedEvenBeforeItsFirstSpin() public {
        uint256 id = _createStandardPool();

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(RobachaPoolRegistry.PoolAlreadyActive.selector, id, uint256(1)));
        registry.setEconomics(id, 1, BASE_PRICE * 3, SURCHARGE);
    }

    function test_newVersionIsTheWayToChangeALaunchedPool() public {
        uint256 id = _createStandardPool();
        _spin(alice, id, 1);

        vm.startPrank(admin);
        uint256 version = registry.createPoolVersion(id, "Genesis Pool v2");
        assertEq(version, 2);

        uint16[] memory probabilities = new uint16[](2);
        probabilities[0] = 8_000;
        probabilities[1] = 2_000;
        registry.setProbabilities(id, 2, probabilities);
        registry.addReward(id, 2, address(tokenA), 0, 10e18, 20e18);
        registry.addReward(id, 2, address(tokenB), 1, 50e18, 90e18);
        registry.setEconomics(id, 2, BASE_PRICE * 2, SURCHARGE);
        registry.setRoundConfig(id, 2, 25, 60, 10, 0);
        registry.activate(id, 2, 0, 0);
        vm.stopPrank();

        (uint256 activeVersion, bool open) = registry.currentPoolVersion(id);
        assertEq(activeVersion, 2, "the new version serves spins");
        assertTrue(open);

        RobachaPoolRegistry.PoolVersion memory v1 = registry.getVersion(id, 1);
        assertFalse(v1.active, "the old version is stood down");
        assertEq(v1.baseSpinPriceWei, BASE_PRICE, "v1 economics untouched");
    }

    function test_onlyTheGachaMayLockAVersion() public {
        uint256 id = _createStandardPool();

        vm.prank(admin);
        vm.expectRevert(RobachaPoolRegistry.NotGacha.selector);
        registry.lock(id, 1);
    }

    function test_poolManagerRoleIsRequiredToAuthor() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, RobachaRoles.POOL_MANAGER_ROLE
            )
        );
        registry.createPool("Unauthorised");
    }

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    function test_closedPoolStopsServingSpins() public {
        uint256 id = _createStandardPool();

        vm.prank(admin);
        registry.close(id, 1);

        (uint256 version, bool open) = registry.currentPoolVersion(id);
        assertEq(version, 0);
        assertFalse(open);
    }

    function test_endTimeStopsThePoolWithoutAnyTransaction() public {
        _fundVault(tokenA, 1_000_000e18);
        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(tokenA), true);
        uint256 id = registry.createPool("Timed");
        uint16[] memory probabilities = new uint16[](1);
        probabilities[0] = 10_000;
        registry.setProbabilities(id, 1, probabilities);
        registry.addReward(id, 1, address(tokenA), 0, 100e18, 200e18);
        registry.setEconomics(id, 1, BASE_PRICE, SURCHARGE);
        registry.setRoundConfig(id, 1, 25, 60, 10, 0);
        registry.activate(id, 1, uint64(block.timestamp), uint64(block.timestamp + 1 hours));
        vm.stopPrank();

        (, bool openNow) = registry.currentPoolVersion(id);
        assertTrue(openNow);

        vm.warp(block.timestamp + 1 hours + 1);
        (, bool openLater) = registry.currentPoolVersion(id);
        assertFalse(openLater, "closed by its own end time");
    }
}
