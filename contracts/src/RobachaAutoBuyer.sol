// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {RobachaRoles} from "./RobachaRoles.sol";

interface IWETH {
    function deposit() external payable;
    function approve(address guy, uint256 wad) external returns (bool);
}

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IRobachaRewardVault {
    function fund(address token, uint256 amount) external;
}

/**
 * @title RobachaAutoBuyer
 * @notice Receives native ETH (from initial funding or routed rewards) and
 *         swaps it for reward tokens using Uniswap V3 on Robinhood Chain,
 *         then automatically deposits those tokens into the reward vault.
 */
contract RobachaAutoBuyer is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address public constant SWAP_ROUTER = 0x8876789976dEcBfCbBbe364623C63652db8C0904;

    IRobachaRewardVault public immutable vault;

    event TokensBoughtAndFunded(address indexed token, uint256 ethSpent, uint256 tokensReceived);

    constructor(address admin, address vault_) {
        require(admin != address(0), "Zero admin address");
        require(vault_ != address(0), "Zero vault address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RobachaRoles.POOL_MANAGER_ROLE, admin);
        vault = IRobachaRewardVault(vault_);
    }

    receive() external payable {}

    function swapAndFund(
        address token,
        uint24 poolFee,
        uint256 ethAmount,
        uint256 minAmountOut
    ) external payable onlyRole(RobachaRoles.POOL_MANAGER_ROLE) nonReentrant returns (uint256 amountOut) {
        require(address(this).balance >= ethAmount, "Insufficient ETH balance");
        require(ethAmount > 0, "Zero ETH amount");

        // 1. Wrap ETH to WETH
        IWETH(WETH).deposit{value: ethAmount}();

        // 2. Approve SwapRouter
        IWETH(WETH).approve(SWAP_ROUTER, ethAmount);

        // 3. Swap WETH -> Token
        ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02.ExactInputSingleParams({
            tokenIn: WETH,
            tokenOut: token,
            fee: poolFee,
            recipient: address(this),
            amountIn: ethAmount,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });

        amountOut = ISwapRouter02(SWAP_ROUTER).exactInputSingle(params);

        // 4. Approve vault and fund
        IERC20(token).approve(address(vault), amountOut);
        vault.fund(token, amountOut);

        emit TokensBoughtAndFunded(token, ethAmount, amountOut);
    }

    /**
     * @notice Withdraw native ETH in case of emergency.
     */
    function withdrawEth(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Zero receiver address");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    /**
     * @notice Recover any stranded ERC-20 token.
     */
    function recoverStrandedToken(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Zero receiver address");
        IERC20(token).safeTransfer(to, amount);
    }
}
