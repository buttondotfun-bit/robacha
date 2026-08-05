// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RobachaAutoBuyer, IUniswapV3Router} from "../src/RobachaAutoBuyer.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/**
 * @dev WETH with the deposit/withdraw the V3 sell path relies on.
 *
 * Its own ERC20 rather than a MockERC20 subclass: that mock exposes `mint`
 * externally and has no burn, so wrapping and unwrapping have to go through
 * _mint/_burn directly. It also carries a `mint` of its own so the V3 router
 * double can pay out WETH the same way it pays out any other token.
 */
contract MockWETH9 is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "MockWETH9: ETH transfer failed");
    }

    receive() external payable {}
}

/**
 * @dev Test-only Uniswap V3 SwapRouter02.
 *
 * Only exactInput is modelled, because that is all the AutoBuyer calls. It
 * reads the first and last token out of the packed path exactly as a real
 * router would, so a malformed path fails here too rather than silently
 * working in tests and failing on chain.
 */
contract MockV3Router {
    address public immutable weth;
    uint256 public rate = 50_000;

    constructor(address weth_) {
        weth = weth_;
    }

    function setRate(uint256 rate_) external {
        rate = rate_;
    }

    function _first(bytes memory path) internal pure returns (address a) {
        assembly {
            a := shr(96, mload(add(path, 32)))
        }
    }

    function _last(bytes memory path) internal pure returns (address a) {
        uint256 len = path.length;
        assembly {
            a := shr(96, mload(add(add(path, 32), sub(len, 20))))
        }
    }

    function exactInput(IUniswapV3Router.ExactInputParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        address tokenIn = _first(params.path);
        address tokenOut = _last(params.path);

        if (tokenIn == weth) {
            // Buying: ETH arrives as msg.value.
            require(msg.value == params.amountIn, "MockV3Router: bad value");
            amountOut = (params.amountIn * rate) / 1e6;
        } else {
            MockERC20(tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
            amountOut = (params.amountIn * 1e6) / rate;
        }

        require(amountOut >= params.amountOutMinimum, "MockV3Router: INSUFFICIENT_OUTPUT");
        MockERC20(tokenOut).mint(params.recipient, amountOut);
    }

    receive() external payable {}
}

contract RobachaAutoBuyerV3Test is Test {
    address internal constant WETH_ADDR = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    address internal admin = makeAddr("admin");
    address internal stranger = makeAddr("stranger");

    RobachaRewardVault internal vault;
    RobachaAutoBuyer internal buyer;
    MockV3Router internal v3;
    MockERC20 internal reward;

    function setUp() public {
        MockWETH9 wethImpl = new MockWETH9();
        vm.etch(WETH_ADDR, address(wethImpl).code);

        v3 = new MockV3Router(WETH_ADDR);
        v3.setRate(50_000);

        reward = new MockERC20("Reward", "RWD", 18);

        vault = new RobachaRewardVault(admin);
        buyer = new RobachaAutoBuyer(admin, address(vault));

        vm.prank(admin);
        vault.grantRole(RobachaRoles.VAULT_MANAGER_ROLE, address(buyer));

        vm.deal(address(buyer), 10 ether);
    }

    /// @dev token | fee | token, exactly as a V3 router expects it.
    function _v3Path(address a, uint24 fee, address b) internal pure returns (bytes memory) {
        return abi.encodePacked(a, fee, b);
    }

    // ------------------------------------------------------------------
    // Buying through V3 — the thing ROB actually needs
    // ------------------------------------------------------------------

    function test_v3BuyReachesAPoolTheV2InterfaceCannot() public {
        vm.prank(admin);
        buyer.setBuyRouteV3(address(reward), address(v3), _v3Path(WETH_ADDR, 10000, address(reward)));

        vm.prank(admin);
        uint256 out = buyer.swapAndFund(address(reward), 0, 1 ether, 1);

        assertEq(out, (1 ether * 50_000) / 1e6, "filled at the V3 pool");
        assertEq(vault.available(address(reward)), out, "and landed in the vault");
        assertEq(address(buyer).balance, 9 ether, "only the stated ETH was spent");
    }

    function test_v3RouteIsReportedSeparatelyFromV2() public {
        bytes memory path = _v3Path(WETH_ADDR, 10000, address(reward));
        vm.prank(admin);
        buyer.setBuyRouteV3(address(reward), address(v3), path);

        (address router, bytes memory stored) = buyer.buyRouteV3(address(reward));
        assertEq(router, address(v3));
        assertEq(stored, path, "the fee tier survives inside the path");
    }

    function test_tokenWithoutAV3RouteReportsNone() public view {
        (address router, bytes memory path) = buyer.buyRouteV3(address(reward));
        assertEq(router, address(0));
        assertEq(path.length, 0);
    }

    function test_clearingAV3RouteReturnsToTheDefaultV2Venue() public {
        vm.startPrank(admin);
        buyer.setBuyRouteV3(address(reward), address(v3), _v3Path(WETH_ADDR, 10000, address(reward)));
        buyer.clearBuyRoute(address(reward));
        vm.stopPrank();

        (address v3Router,) = buyer.buyRouteV3(address(reward));
        assertEq(v3Router, address(0), "no V3 route remains");
    }

    // ------------------------------------------------------------------
    // Selling through V3 — WETH has to be unwrapped
    // ------------------------------------------------------------------

    function test_v3SellUnwrapsWethIntoSpendableEth() public {
        reward.mint(address(buyer), 1e18);
        vm.deal(WETH_ADDR, 100 ether); // backs the unwrap

        vm.prank(admin);
        buyer.setSellRouteV3(address(reward), address(v3), _v3Path(address(reward), 10000, WETH_ADDR));

        uint256 ethBefore = address(buyer).balance;

        vm.prank(admin);
        uint256 ethOut = buyer.sellForEth(address(reward), 1e18, 1);

        assertGt(ethOut, 0, "the sale produced ETH, not WETH");
        assertEq(address(buyer).balance, ethBefore + ethOut, "spendable by the reserve");
        assertEq(reward.balanceOf(address(buyer)), 0, "tokens are gone");
    }

    function test_v3SellLeavesNoStandingAllowance() public {
        reward.mint(address(buyer), 1e18);
        vm.deal(WETH_ADDR, 100 ether);

        vm.prank(admin);
        buyer.setSellRouteV3(address(reward), address(v3), _v3Path(address(reward), 10000, WETH_ADDR));

        vm.prank(admin);
        buyer.sellForEth(address(reward), 1e18, 1);

        assertEq(reward.allowance(address(buyer), address(v3)), 0, "allowance was zeroed");
    }

    // ------------------------------------------------------------------
    // Path validation — the fee tier makes these easy to get wrong
    // ------------------------------------------------------------------

    function test_v3PathMustStartAtWethForABuy() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                RobachaAutoBuyer.PathMustStartWith.selector, WETH_ADDR, address(reward)
            )
        );
        buyer.setBuyRouteV3(address(reward), address(v3), _v3Path(address(reward), 10000, WETH_ADDR));
    }

    function test_v3PathMustEndAtTheToken() public {
        MockERC20 other = new MockERC20("Other", "OTH", 18);
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(RobachaAutoBuyer.PathMustEndWith.selector, address(reward), address(other))
        );
        buyer.setBuyRouteV3(address(reward), address(v3), _v3Path(WETH_ADDR, 10000, address(other)));
    }

    function test_v3PathTooShortIsRejected() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(RobachaAutoBuyer.MalformedV3Path.selector, uint256(20)));
        buyer.setBuyRouteV3(address(reward), address(v3), abi.encodePacked(WETH_ADDR));
    }

    function test_v3PathWithATruncatedFeeIsRejected() public {
        // 20 + 20 = 40 bytes: two addresses and no fee tier between them.
        bytes memory bad = abi.encodePacked(WETH_ADDR, address(reward));
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(RobachaAutoBuyer.MalformedV3Path.selector, uint256(40)));
        buyer.setBuyRouteV3(address(reward), address(v3), bad);
    }

    function test_multiHopV3PathIsAccepted() public {
        MockERC20 mid = new MockERC20("Mid", "MID", 18);
        bytes memory path =
            abi.encodePacked(WETH_ADDR, uint24(500), address(mid), uint24(10000), address(reward));
        assertEq(path.length, 66, "20 + 23 + 23");

        vm.prank(admin);
        buyer.setBuyRouteV3(address(reward), address(v3), path);

        (, bytes memory stored) = buyer.buyRouteV3(address(reward));
        assertEq(stored, path);
    }

    function test_onlyAdminCanSetV3Routes() public {
        vm.prank(stranger);
        vm.expectRevert();
        buyer.setBuyRouteV3(address(reward), address(v3), _v3Path(WETH_ADDR, 10000, address(reward)));
    }

    function test_v3SlippageFloorIsEnforced() public {
        vm.prank(admin);
        buyer.setBuyRouteV3(address(reward), address(v3), _v3Path(WETH_ADDR, 10000, address(reward)));

        vm.prank(admin);
        vm.expectRevert("MockV3Router: INSUFFICIENT_OUTPUT");
        buyer.swapAndFund(address(reward), 0, 1 ether, 1_000_000e18);
    }
}
