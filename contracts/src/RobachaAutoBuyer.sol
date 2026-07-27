// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {RobachaRoles} from "./RobachaRoles.sol";

interface IUniswapV2Router02 {
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);
}

interface IRobachaRewardVault {
    function fund(address token, uint256 amount) external;
}

/**
 * @title RobachaAutoBuyer
 * @notice Receives native ETH (from initial funding or routed rewards) and
 *         swaps it for reward tokens using Uniswap V2 on Robinhood Chain,
 *         then automatically deposits those tokens into the reward vault.
 */
contract RobachaAutoBuyer is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address public constant SWAP_ROUTER = 0x89e5DB8B5aA49aA85AC63f691524311AEB649eba;

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
        uint24, // poolFee parameter kept for ABI compatibility, unused in V2
        uint256 ethAmount,
        uint256 minAmountOut
    ) external payable onlyRole(RobachaRoles.POOL_MANAGER_ROLE) nonReentrant returns (uint256 amountOut) {
        require(address(this).balance >= ethAmount, "Insufficient ETH balance");
        require(ethAmount > 0, "Zero ETH amount");

        // 1. Prepare path
        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = token;

        // 2. Perform Swap ETH -> Token
        uint256[] memory amounts = IUniswapV2Router02(SWAP_ROUTER).swapExactETHForTokens{value: ethAmount}(
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );

        amountOut = amounts[amounts.length - 1];

        // 3. Approve vault and fund
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
