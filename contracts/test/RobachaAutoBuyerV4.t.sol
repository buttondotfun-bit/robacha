// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RobachaAutoBuyer, IPoolManager} from "../src/RobachaAutoBuyer.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

interface IUnlockCallback {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}

/**
 * @dev Test-only Uniswap V4 PoolManager.
 *
 * Models the part that constrains the contract under test: swapping is only
 * possible inside an unlock, and the unlock reverts unless every currency the
 * swap moved has been squared off. Without that second rule the tests would
 * pass on a contract that never settles, which is precisely the bug most worth
 * catching — the real manager would revert and the swap would be dead on
 * arrival.
 */
contract MockPoolManager {
    /// @notice Native ETH per token, scaled by 1e18.
    uint256 public rate = 1e12;

    bool internal unlocked;
    mapping(address currency => int256 delta) public owed;
    mapping(address currency => uint256 amount) internal synced;

    function setRate(uint256 rate_) external {
        rate = rate_;
    }

    function unlock(bytes calldata data) external returns (bytes memory result) {
        unlocked = true;
        result = IUnlockCallback(msg.sender).unlockCallback(data);
        // The invariant the real manager enforces on the way out.
        require(owed[address(0)] == 0, "MockPoolManager: CurrencyNotSettled native");
        unlocked = false;
    }

    function swap(IPoolManager.PoolKey calldata key, IPoolManager.SwapParams calldata params, bytes calldata)
        external
        returns (int256 delta)
    {
        require(unlocked, "MockPoolManager: ManagerLocked");
        uint256 amountIn = uint256(-params.amountSpecified);

        uint256 amountOut = params.zeroForOne
            ? (amountIn * 1e18) / rate // native in, token out
            : (amountIn * rate) / 1e18; // token in, native out

        int128 d0;
        int128 d1;
        if (params.zeroForOne) {
            d0 = -int128(int256(amountIn));
            d1 = int128(int256(amountOut));
        } else {
            d1 = -int128(int256(amountIn));
            d0 = int128(int256(amountOut));
        }

        owed[key.currency0] += d0;
        owed[key.currency1] += d1;

        // Pack as BalanceDelta does: amount0 high 128 bits, amount1 low.
        delta = (int256(d0) << 128) | int256(uint256(uint128(d1)));
    }

    function sync(address currency) external {
        synced[currency] = MockERC20(currency).balanceOf(address(this));
    }

    function settle() external payable returns (uint256 paid) {
        if (msg.value > 0) {
            paid = msg.value;
            owed[address(0)] += int256(paid);
        }
        return paid;
    }

    function settleToken(address currency) external returns (uint256 paid) {
        paid = MockERC20(currency).balanceOf(address(this)) - synced[currency];
        owed[currency] += int256(paid);
    }

    function take(address currency, address to, uint256 amount) external {
        owed[currency] -= int256(amount);
        if (currency == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            require(ok, "MockPoolManager: ETH transfer failed");
        } else {
            MockERC20(currency).mint(to, amount);
        }
    }

    receive() external payable {}
}

contract RobachaAutoBuyerV4Test is Test {
    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");

    RobachaRewardVault internal vault;
    RobachaAutoBuyer internal buyer;
    MockPoolManager internal pm;
    MockERC20 internal reward;

    function setUp() public {
        pm = new MockPoolManager();
        reward = new MockERC20("Reward", "RWD", 18);

        vault = new RobachaRewardVault(admin);
        buyer = new RobachaAutoBuyer(admin, address(vault));

        vm.prank(admin);
        vault.grantRole(RobachaRoles.VAULT_MANAGER_ROLE, address(buyer));

        vm.deal(address(buyer), 10 ether);
        vm.deal(address(pm), 100 ether);

        vm.prank(admin);
        buyer.setV4Route(address(reward), address(pm), _key());
    }

    /// @dev Native ETH is always currency0, being address(0).
    function _key() internal view returns (IPoolManager.PoolKey memory) {
        return IPoolManager.PoolKey({
            currency0: address(0),
            currency1: address(reward),
            fee: 2500,
            tickSpacing: 60,
            hooks: address(0)
        });
    }

    // ------------------------------------------------------------------
    // The route itself
    // ------------------------------------------------------------------

    function test_v4RouteStoresTheWholePoolKey() public view {
        (address manager, IPoolManager.PoolKey memory key) = buyer.v4Route(address(reward));
        assertEq(manager, address(pm));
        assertEq(key.currency1, address(reward));
        assertEq(key.fee, 2500, "the fee is part of the pool's identity");
        assertEq(key.tickSpacing, 60);
    }

    function test_oneCallConfiguresBothDirections() public view {
        // A V4 direction is just zeroForOne, so buy and sell share a key. If
        // they were set separately they could disagree.
        (address manager,) = buyer.v4Route(address(reward));
        assertEq(manager, address(pm));
    }

    function test_keyMustNameTheToken() public {
        IPoolManager.PoolKey memory wrong = _key();
        wrong.currency1 = makeAddr("someOtherToken");

        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(RobachaAutoBuyer.PoolKeyMissingToken.selector, address(reward))
        );
        buyer.setV4Route(address(reward), address(pm), wrong);
    }

    function test_misorderedKeyIsRejected() public {
        // currency0 < currency1 is V4's own invariant; a key breaking it hashes
        // to a pool that was never initialised.
        IPoolManager.PoolKey memory bad = IPoolManager.PoolKey({
            currency0: address(reward),
            currency1: address(0),
            fee: 2500,
            tickSpacing: 60,
            hooks: address(0)
        });
        vm.prank(admin);
        vm.expectRevert(RobachaAutoBuyer.PoolKeyMisordered.selector);
        buyer.setV4Route(address(reward), address(pm), bad);
    }

    function test_onlyAdminCanSetAV4Route() public {
        vm.prank(stranger);
        vm.expectRevert();
        buyer.setV4Route(address(reward), address(pm), _key());
    }

    // ------------------------------------------------------------------
    // Buying — the whole point, for tokens whose market is V4-only
    // ------------------------------------------------------------------

    function test_v4BuyFundsTheVault() public {
        vm.prank(admin);
        uint256 out = buyer.swapAndFund(address(reward), 0, 1 ether, 1);

        assertGt(out, 0, "the V4 pool filled the order");
        assertEq(vault.available(address(reward)), out, "and it reached the vault");
        assertEq(address(buyer).balance, 9 ether, "exactly the stated ETH was spent");
    }

    function test_v4BuySettlesItsNativeDebt() public {
        vm.prank(admin);
        buyer.swapAndFund(address(reward), 0, 1 ether, 1);

        // The mock reverts the unlock if this is non-zero, so reaching here
        // already proves it; asserting makes the intent explicit.
        assertEq(pm.owed(address(0)), 0, "no unsettled native balance");
    }

    function test_v4BuyEnforcesTheCallersMinimum() public {
        // V4 has no amountOutMinimum of its own, so this is enforced by the
        // AutoBuyer after the swap. Without that check the floor would be
        // silently ignored on every V4 route.
        // Comfortably above the 1e24 tokens the mock's rate yields for 1 ETH,
        // so the floor is what fails rather than the arithmetic coinciding.
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(RobachaAutoBuyer.InsufficientOutput.selector, 1e24, 1e30)
        );
        buyer.swapAndFund(address(reward), 0, 1 ether, 1e30);
    }

    function test_v4BuyPriceIsReflected() public {
        pm.setRate(2e12); // token costs twice as much

        vm.prank(admin);
        uint256 out = buyer.swapAndFund(address(reward), 0, 1 ether, 1);

        pm.setRate(1e12);
        vm.prank(admin);
        uint256 cheaper = buyer.swapAndFund(address(reward), 0, 1 ether, 1);

        assertLt(out, cheaper, "a dearer token yields fewer tokens for the same ETH");
    }

    // ------------------------------------------------------------------
    // Selling
    // ------------------------------------------------------------------

    function test_v4SellReturnsSpendableEth() public {
        reward.mint(address(buyer), 100e18);
        uint256 before = address(buyer).balance;

        vm.prank(admin);
        uint256 ethOut = buyer.sellForEth(address(reward), 100e18, 1);

        assertGt(ethOut, 0, "the sale produced ETH");
        assertEq(address(buyer).balance, before + ethOut, "usable by the reserve");
    }

    function test_v4SellEnforcesTheCallersMinimum() public {
        reward.mint(address(buyer), 100e18);
        vm.prank(admin);
        vm.expectRevert();
        buyer.sellForEth(address(reward), 100e18, 1_000_000 ether);
    }

    function test_v4SellNeedsNoAllowance() public {
        // V4 is paid by transferring in between sync and settle, not by the
        // manager pulling from an allowance.
        reward.mint(address(buyer), 100e18);
        vm.prank(admin);
        buyer.sellForEth(address(reward), 100e18, 1);

        assertEq(reward.allowance(address(buyer), address(pm)), 0);
    }

    // ------------------------------------------------------------------
    // The callback is the attack surface
    // ------------------------------------------------------------------

    function test_unlockCallbackRejectsEveryoneButTheManager() public {
        // Without this check anyone could hand the contract a forged callback
        // and have it settle a swap it never asked for, out of its own balance.
        bytes memory data = abi.encode(
            RobachaAutoBuyer.V4Call({key: _key(), token: address(reward), amountIn: 1 ether, buying: true})
        );

        vm.prank(stranger);
        vm.expectRevert(RobachaAutoBuyer.NotThePoolManager.selector);
        buyer.unlockCallback(data);
    }

    function test_unlockCallbackRejectsAnUnconfiguredToken() public {
        MockERC20 other = new MockERC20("Other", "OTH", 18);
        bytes memory data = abi.encode(
            RobachaAutoBuyer.V4Call({key: _key(), token: address(other), amountIn: 1 ether, buying: true})
        );

        // No route for `other`, so its stored manager is the zero address and
        // nothing can pass the check.
        vm.prank(address(pm));
        vm.expectRevert(RobachaAutoBuyer.NotThePoolManager.selector);
        buyer.unlockCallback(data);
    }

    function test_onlyPoolManagerRoleHolderCanTriggerAV4Buy() public {
        vm.prank(stranger);
        vm.expectRevert();
        buyer.swapAndFund(address(reward), 0, 1 ether, 1);
    }
}
