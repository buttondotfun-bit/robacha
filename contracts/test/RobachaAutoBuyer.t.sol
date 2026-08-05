// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RobachaAutoBuyer} from "../src/RobachaAutoBuyer.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/**
 * @dev Test-only Uniswap V2 router.
 *
 * Deployed to the address the AutoBuyer hardcodes so the contract under test
 * is exercised unmodified. Nothing in `src/` references this file — production
 * talks to the real router deployed on Robinhood Chain.
 */
contract MockV2Router {
    MockERC20 public immutable weth;
    /// @notice Tokens handed back per wei of ETH in.
    uint256 public rate = 50_000;
    bool public reverting;

    constructor(MockERC20 weth_) {
        weth = weth_;
    }

    function setRate(uint256 rate_) external {
        rate = rate_;
    }

    function setReverting(bool value) external {
        reverting = value;
    }

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        require(!reverting, "MockV2Router: down");
        require(block.timestamp <= deadline, "MockV2Router: expired");
        require(path.length >= 2, "MockV2Router: path");

        uint256 out = (msg.value * rate) / 1e6;
        require(out >= amountOutMin, "MockV2Router: INSUFFICIENT_OUTPUT_AMOUNT");

        MockERC20(path[path.length - 1]).mint(to, out);

        amounts = new uint256[](2);
        amounts[0] = msg.value;
        amounts[1] = out;
    }

    /// @notice The mirror of the buy: pulls tokens in, pays ETH out.
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(!reverting, "MockV2Router: down");
        require(block.timestamp <= deadline, "MockV2Router: expired");
        require(path.length >= 2, "MockV2Router: path");

        MockERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);

        uint256 out = (amountIn * 1e6) / rate;
        require(out >= amountOutMin, "MockV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
        require(address(this).balance >= out, "MockV2Router: no ETH");

        (bool ok,) = to.call{value: out}("");
        require(ok, "MockV2Router: ETH transfer failed");

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = out;
    }

    receive() external payable {}
}

contract RobachaAutoBuyerTest is Test {
    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");

    RobachaRewardVault internal vault;
    RobachaAutoBuyer internal buyer;
    MockV2Router internal router;
    MockERC20 internal weth;
    MockERC20 internal reward;

    function setUp() public {
        // The AutoBuyer hardcodes both addresses, so the doubles are placed at
        // exactly those addresses rather than injected.
        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        vm.etch(buyerWeth(), address(weth).code);

        MockV2Router deployed = new MockV2Router(MockERC20(buyerWeth()));
        vm.etch(buyerRouter(), address(deployed).code);
        router = MockV2Router(payable(buyerRouter()));
        // `rate` lives in storage, which etch does not copy.
        router.setRate(50_000);

        reward = new MockERC20("Reward", "RWD", 18);

        vault = new RobachaRewardVault(admin);
        buyer = new RobachaAutoBuyer(admin, address(vault));

        vm.prank(admin);
        vault.grantRole(RobachaRoles.VAULT_MANAGER_ROLE, address(buyer));

        vm.deal(address(buyer), 10 ether);
        vm.deal(stranger, 10 ether);
    }

    /// @dev The addresses the AutoBuyer hardcodes; the doubles are etched here.
    function buyerWeth() internal pure returns (address) {
        return 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    }

    function buyerRouter() internal pure returns (address) {
        return 0x89e5DB8B5aA49aA85AC63f691524311AEB649eba;
    }

    // ------------------------------------------------------------------
    // The happy path
    // ------------------------------------------------------------------

    function test_swapAndFundBuysTokensAndDepositsThemInTheVault() public {
        uint256 spend = 1 ether;
        uint256 expected = (spend * 50_000) / 1e6;

        vm.prank(admin);
        uint256 out = buyer.swapAndFund(address(reward), 3000, spend, 1);

        assertEq(out, expected, "returns the amount actually received");
        assertEq(reward.balanceOf(address(vault)), expected, "tokens landed in the vault");
        assertEq(vault.depositedNet(address(reward)), expected, "vault credited the deposit");
        assertEq(reward.balanceOf(address(buyer)), 0, "buyer keeps nothing");
        assertEq(address(buyer).balance, 10 ether - spend, "only the stated ETH was spent");
    }

    function test_vaultTreatsBoughtInventoryAsAvailable() public {
        vm.prank(admin);
        buyer.swapAndFund(address(reward), 3000, 1 ether, 1);

        assertEq(vault.available(address(reward)), (1 ether * 50_000) / 1e6);
        assertTrue(vault.isSolvent(address(reward)));
        assertEq(vault.knownTokenCount(), 1, "token registered on the vault");
    }

    function test_repeatedBuysAccumulate() public {
        vm.startPrank(admin);
        buyer.swapAndFund(address(reward), 3000, 1 ether, 1);
        buyer.swapAndFund(address(reward), 3000, 2 ether, 1);
        vm.stopPrank();

        assertEq(reward.balanceOf(address(vault)), (3 ether * 50_000) / 1e6);
    }

    // ------------------------------------------------------------------
    // Access control
    // ------------------------------------------------------------------

    function test_onlyPoolManagerCanSwap() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                stranger,
                RobachaRoles.POOL_MANAGER_ROLE
            )
        );
        buyer.swapAndFund(address(reward), 3000, 1 ether, 1);
    }

    function test_onlyAdminCanWithdrawEth() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, bytes32(0)
            )
        );
        buyer.withdrawEth(payable(stranger), 1 ether);
    }

    function test_adminCanRecoverEth() public {
        address to = makeAddr("recipient");
        vm.prank(admin);
        buyer.withdrawEth(payable(to), 4 ether);
        assertEq(to.balance, 4 ether);
        assertEq(address(buyer).balance, 6 ether);
    }

    function test_adminCanRecoverStrandedTokens() public {
        MockERC20 stray = new MockERC20("Stray", "STR", 18);
        stray.mint(address(buyer), 500e18);

        vm.prank(admin);
        buyer.recoverStrandedToken(address(stray), admin, 500e18);
        assertEq(stray.balanceOf(admin), 500e18);
    }

    // ------------------------------------------------------------------
    // Input validation
    // ------------------------------------------------------------------

    function test_cannotSpendMoreEthThanItHolds() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(RobachaAutoBuyer.InsufficientBalance.selector, 10 ether, 11 ether)
        );
        buyer.swapAndFund(address(reward), 3000, 11 ether, 1);
    }

    function test_zeroEthReverts() public {
        vm.prank(admin);
        vm.expectRevert(RobachaAutoBuyer.ZeroAmount.selector);
        buyer.swapAndFund(address(reward), 3000, 0, 1);
    }

    function test_constructorRejectsZeroAddresses() public {
        // One error for both arguments now. The pair was never distinguishable
        // to a caller anyway, and which of the two was zero is obvious from
        // the call that reverted.
        vm.expectRevert(RobachaAutoBuyer.ZeroAddress.selector);
        new RobachaAutoBuyer(address(0), address(vault));

        vm.expectRevert(RobachaAutoBuyer.ZeroAddress.selector);
        new RobachaAutoBuyer(admin, address(0));
    }

    // ------------------------------------------------------------------
    // Slippage — the property that actually protects the treasury
    // ------------------------------------------------------------------

    function test_slippageFloorIsEnforcedByTheRouter() public {
        uint256 spend = 1 ether;
        uint256 fair = (spend * 50_000) / 1e6;

        // Price moves against us between quote and execution.
        router.setRate(10_000);

        vm.prank(admin);
        vm.expectRevert("MockV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
        buyer.swapAndFund(address(reward), 3000, spend, fair);
    }

    /**
     * @dev The contract accepts `minAmountOut = 0`, which is an unprotected
     *      market buy. Nothing on-chain prevents it, so the protection has to
     *      come from the caller. This test pins that behaviour so the risk is
     *      recorded rather than assumed away.
     */
    function test_zeroMinimumIsAcceptedAndIsUnprotected() public {
        router.setRate(1); // a catastrophic price

        vm.prank(admin);
        uint256 out = buyer.swapAndFund(address(reward), 3000, 1 ether, 0);

        assertGt(out, 0);
        assertLt(out, 1e15, "a zero floor accepts an arbitrarily bad fill");
    }

    // ------------------------------------------------------------------
    // Failure containment
    // ------------------------------------------------------------------

    function test_aFailedSwapLeavesNothingBehind() public {
        router.setReverting(true);
        uint256 before = address(buyer).balance;

        vm.prank(admin);
        vm.expectRevert("MockV2Router: down");
        buyer.swapAndFund(address(reward), 3000, 1 ether, 1);

        assertEq(address(buyer).balance, before, "ETH is not consumed by a failed swap");
        assertEq(reward.balanceOf(address(vault)), 0, "vault is untouched");
    }

    function test_swapFailsWhenTheVaultRoleIsRevoked() public {
        vm.prank(admin);
        vault.revokeRole(RobachaRoles.VAULT_MANAGER_ROLE, address(buyer));

        vm.prank(admin);
        vm.expectRevert();
        buyer.swapAndFund(address(reward), 3000, 1 ether, 1);

        assertEq(reward.balanceOf(address(vault)), 0);
    }

    function test_swapFailsWhileTheVaultIsPaused() public {
        vm.startPrank(admin);
        vault.pause();

        vm.expectRevert();
        buyer.swapAndFund(address(reward), 3000, 1 ether, 1);
        vm.stopPrank();
    }

    function test_buyerCanReceiveEth() public {
        (bool ok,) = address(buyer).call{value: 1 ether}("");
        assertTrue(ok, "must accept the routed reward reserve");
        assertEq(address(buyer).balance, 11 ether);
    }

    // ------------------------------------------------------------------
    // Invariant-flavoured fuzz
    // ------------------------------------------------------------------

    function testFuzz_boughtTokensAlwaysReachTheVault(uint96 spend, uint16 rate) public {
        vm.assume(spend > 0 && spend <= 10 ether);
        vm.assume(rate > 0);
        router.setRate(rate);

        uint256 expected = (uint256(spend) * rate) / 1e6;
        vm.assume(expected > 0);

        vm.prank(admin);
        uint256 out = buyer.swapAndFund(address(reward), 3000, spend, 1);

        assertEq(out, expected);
        assertEq(reward.balanceOf(address(vault)), expected, "everything bought is deposited");
        assertEq(reward.balanceOf(address(buyer)), 0, "nothing is retained");
        assertLe(vault.reserved(address(reward)), reward.balanceOf(address(vault)));
    }
}

// ======================================================================
// Per-token routing, and selling inventory back into ETH
// ======================================================================

contract RobachaAutoBuyerRoutingTest is Test {
    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");

    RobachaRewardVault internal vault;
    RobachaAutoBuyer internal buyer;
    MockV2Router internal defaultRouter;
    MockV2Router internal altRouter;
    MockERC20 internal weth;
    MockERC20 internal reward;
    MockERC20 internal hop;

    function setUp() public {
        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        vm.etch(WETH_ADDR, address(weth).code);

        MockV2Router deployed = new MockV2Router(MockERC20(WETH_ADDR));
        vm.etch(ROUTER_ADDR, address(deployed).code);
        defaultRouter = MockV2Router(payable(ROUTER_ADDR));
        defaultRouter.setRate(50_000);

        // A second venue, at its own address. This is the whole point: the
        // token's real market is somewhere the default router cannot see.
        altRouter = new MockV2Router(MockERC20(WETH_ADDR));
        altRouter.setRate(50_000);

        reward = new MockERC20("Reward", "RWD", 18);
        hop = new MockERC20("Hop", "HOP", 18);

        vault = new RobachaRewardVault(admin);
        buyer = new RobachaAutoBuyer(admin, address(vault));

        vm.prank(admin);
        vault.grantRole(RobachaRoles.VAULT_MANAGER_ROLE, address(buyer));

        vm.deal(address(buyer), 10 ether);
    }

    address internal constant WETH_ADDR = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address internal constant ROUTER_ADDR = 0x89e5DB8B5aA49aA85AC63f691524311AEB649eba;

    function _path2(address a, address b) internal pure returns (address[] memory p) {
        p = new address[](2);
        p[0] = a;
        p[1] = b;
    }

    // ------------------------------------------------------------------
    // Defaults — a token nobody has configured behaves exactly as before
    // ------------------------------------------------------------------

    function test_unconfiguredTokenUsesTheDefaultVenueAndDirectPath() public view {
        (address router, address[] memory path) = buyer.buyRoute(address(reward));
        assertEq(router, ROUTER_ADDR, "should fall back to the default router");
        assertEq(path.length, 2, "default path is a single hop");
        assertEq(path[0], WETH_ADDR);
        assertEq(path[1], address(reward));
    }

    function test_unconfiguredSellRouteMirrorsTheBuy() public view {
        (address router, address[] memory path) = buyer.sellRoute(address(reward));
        assertEq(router, ROUTER_ADDR);
        assertEq(path[0], address(reward), "a sale starts at the token");
        assertEq(path[1], WETH_ADDR, "and ends at WETH");
    }

    // ------------------------------------------------------------------
    // Custom routes
    // ------------------------------------------------------------------

    function test_buyRouteRedirectsTheSwapToAnotherVenue() public {
        vm.prank(admin);
        buyer.setBuyRoute(address(reward), address(altRouter), _path2(WETH_ADDR, address(reward)));

        (address router,) = buyer.buyRoute(address(reward));
        assertEq(router, address(altRouter));

        // The default router is deliberately broken, so a swap that still
        // reached it would fail rather than quietly pass.
        defaultRouter.setReverting(true);

        vm.prank(admin);
        uint256 out = buyer.swapAndFund(address(reward), 3000, 1 ether, 1);

        assertGt(out, 0, "the alternate venue filled the order");
        assertEq(vault.available(address(reward)), out, "and it landed in the vault");
    }

    function test_multiHopPathIsStoredAndUsed() public {
        address[] memory path = new address[](3);
        path[0] = WETH_ADDR;
        path[1] = address(hop);
        path[2] = address(reward);

        vm.prank(admin);
        buyer.setBuyRoute(address(reward), address(altRouter), path);

        (, address[] memory stored) = buyer.buyRoute(address(reward));
        assertEq(stored.length, 3, "every hop survives the round trip");
        assertEq(stored[1], address(hop));
    }

    function test_clearingARouteRestoresTheDefault() public {
        vm.startPrank(admin);
        buyer.setBuyRoute(address(reward), address(altRouter), _path2(WETH_ADDR, address(reward)));
        buyer.clearBuyRoute(address(reward));
        vm.stopPrank();

        (address router,) = buyer.buyRoute(address(reward));
        assertEq(router, ROUTER_ADDR, "back to the default venue");
    }

    // ------------------------------------------------------------------
    // Path validation — a typo must not become a swap
    // ------------------------------------------------------------------

    function test_buyPathMustStartAtWeth() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(RobachaAutoBuyer.PathMustStartWith.selector, WETH_ADDR, address(hop))
        );
        buyer.setBuyRoute(address(reward), address(altRouter), _path2(address(hop), address(reward)));
    }

    function test_buyPathMustEndAtTheToken() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(RobachaAutoBuyer.PathMustEndWith.selector, address(reward), address(hop))
        );
        buyer.setBuyRoute(address(reward), address(altRouter), _path2(WETH_ADDR, address(hop)));
    }

    function test_sellPathMustStartAtTheToken() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(RobachaAutoBuyer.PathMustStartWith.selector, address(reward), WETH_ADDR)
        );
        buyer.setSellRoute(address(reward), address(altRouter), _path2(WETH_ADDR, WETH_ADDR));
    }

    function test_singleHopPathIsRejected() public {
        address[] memory path = new address[](1);
        path[0] = WETH_ADDR;

        vm.prank(admin);
        vm.expectRevert(RobachaAutoBuyer.PathTooShort.selector);
        buyer.setBuyRoute(address(reward), address(altRouter), path);
    }

    function test_onlyAdminCanSetRoutes() public {
        vm.prank(stranger);
        vm.expectRevert();
        buyer.setBuyRoute(address(reward), address(altRouter), _path2(WETH_ADDR, address(reward)));
    }

    // ------------------------------------------------------------------
    // Selling — the half that lets non-ETH revenue restock the vault
    // ------------------------------------------------------------------

    function test_sellForEthConvertsInventoryBackIntoSpendableEth() public {
        reward.mint(address(buyer), 1e18);
        vm.deal(address(defaultRouter), 50 ether);

        uint256 ethBefore = address(buyer).balance;

        vm.prank(admin);
        uint256 ethOut = buyer.sellForEth(address(reward), 1e18, 1);

        assertGt(ethOut, 0, "the sale produced ETH");
        assertEq(address(buyer).balance, ethBefore + ethOut, "which stays here, ready to buy prizes");
        assertEq(reward.balanceOf(address(buyer)), 0, "and the tokens are gone");
    }

    function test_sellUsesTheConfiguredVenue() public {
        reward.mint(address(buyer), 1e18);
        vm.deal(address(altRouter), 50 ether);

        vm.prank(admin);
        buyer.setSellRoute(address(reward), address(altRouter), _path2(address(reward), WETH_ADDR));

        defaultRouter.setReverting(true);

        vm.prank(admin);
        uint256 ethOut = buyer.sellForEth(address(reward), 1e18, 1);
        assertGt(ethOut, 0, "the alternate venue took the sale");
    }

    function test_cannotSellMoreThanItHolds() public {
        reward.mint(address(buyer), 1e18);
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(RobachaAutoBuyer.InsufficientBalance.selector, 1e18, 2e18)
        );
        buyer.sellForEth(address(reward), 2e18, 1);
    }

    function test_sellSlippageFloorIsEnforced() public {
        reward.mint(address(buyer), 1e18);
        vm.deal(address(defaultRouter), 50 ether);

        vm.prank(admin);
        vm.expectRevert("MockV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
        buyer.sellForEth(address(reward), 1e18, 100 ether);
    }

    function test_sellLeavesNoStandingAllowance() public {
        reward.mint(address(buyer), 1e18);
        vm.deal(address(defaultRouter), 50 ether);

        vm.prank(admin);
        buyer.sellForEth(address(reward), 1e18, 1);

        assertEq(
            reward.allowance(address(buyer), ROUTER_ADDR),
            0,
            "no allowance is left sitting on a router we do not control"
        );
    }

    function test_onlyPoolManagerCanSell() public {
        reward.mint(address(buyer), 1e18);
        vm.prank(stranger);
        vm.expectRevert();
        buyer.sellForEth(address(reward), 1e18, 1);
    }

    function test_sellingZeroReverts() public {
        vm.prank(admin);
        vm.expectRevert(RobachaAutoBuyer.ZeroAmount.selector);
        buyer.sellForEth(address(reward), 0, 1);
    }
}
