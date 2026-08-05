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

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IRobachaRewardVault {
    function fund(address token, uint256 amount) external;
}

/**
 * @title RobachaAutoBuyer
 * @notice Turns ETH into reward inventory and reward inventory back into ETH,
 *         depositing anything it buys straight into the reward vault.
 *
 * @dev WHY ROUTES ARE CONFIGURABLE
 *
 * This contract used to hardcode one router and assume a direct [WETH, token]
 * pair existed on it. That assumption quietly decided which tokens the machine
 * could hold, and it was wrong for most of them. Quoting 0.001 ETH against the
 * single hardcoded router returned ~0% for TENDIES and 4663, 68.5% for PONS,
 * and no pair at all for BRODIE — not because those tokens lack liquidity, but
 * because their liquidity sits on venues that router cannot see. CASHCAT is
 * already in the pool with only 0.0183 ETH reachable while its real market is
 * elsewhere, and ROB trades on a different factory entirely.
 *
 * So a route is per token: which router to use, and the exact path to walk.
 * Anything without a configured route falls back to the old behaviour — the
 * default router and a direct [WETH, token] hop — so tokens that already
 * worked keep working and nothing has to be migrated on day one.
 *
 * WHY SELLING EXISTS
 *
 * The reward reserve is funded in ETH and spent buying prizes, which is a
 * one-way street that works only while spins are paid in ETH. Revenue arriving
 * as an ERC-20 has to become ETH before it can restock anything, and doing
 * that by hand does not scale and tends not to happen. `sellForEth` closes
 * the loop.
 *
 * SLIPPAGE IS THE CALLER'S JOB
 *
 * Every swap takes an explicit minimum and passes it to the router, which is
 * what actually enforces it. Passing zero is accepted and is unprotected — a
 * sandwich can take nearly the whole trade. That is deliberate: this contract
 * cannot know a fair price without an oracle, and an oracle on a thin pair is
 * a worse problem than the one it solves. The caller quotes first.
 */
contract RobachaAutoBuyer is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address public constant SWAP_ROUTER = 0x89e5DB8B5aA49aA85AC63f691524311AEB649eba;

    IRobachaRewardVault public immutable vault;

    /**
     * @notice How to trade one token, when the default venue will not do.
     * @param router The router to send the swap through.
     * @param path   The full hop list, validated on write so a bad path cannot
     *               be stored and only discovered mid-swap.
     */
    struct Route {
        address router;
        address[] path;
    }

    /// @notice ETH -> token. Empty router means "use the default venue".
    mapping(address token => Route route) private _buyRoutes;

    /// @notice token -> ETH. Empty router means "use the default venue".
    mapping(address token => Route route) private _sellRoutes;

    event TokensBoughtAndFunded(address indexed token, uint256 ethSpent, uint256 tokensReceived);
    event TokensSoldForEth(address indexed token, uint256 tokensSpent, uint256 ethReceived);
    event BuyRouteSet(address indexed token, address indexed router, address[] path);
    event SellRouteSet(address indexed token, address indexed router, address[] path);
    event BuyRouteCleared(address indexed token);
    event SellRouteCleared(address indexed token);

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance(uint256 held, uint256 requested);
    error PathTooShort();
    error PathMustStartWith(address expected, address actual);
    error PathMustEndWith(address expected, address actual);

    constructor(address admin, address vault_) {
        if (admin == address(0) || vault_ == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RobachaRoles.POOL_MANAGER_ROLE, admin);
        vault = IRobachaRewardVault(vault_);
    }

    receive() external payable {}

    // ---------------------------------------------------------------- routes

    /**
     * @notice Point a token's buys at a specific venue and path.
     * @dev Validated here rather than at swap time. A path that does not start
     *      at WETH or end at the token cannot buy what it claims to, and
     *      storing it would turn a typo into a swap that succeeds while
     *      delivering the wrong asset into the prize vault.
     */
    function setBuyRoute(address token, address router, address[] calldata path)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0) || router == address(0)) revert ZeroAddress();
        _requirePath(path, WETH, token);
        _buyRoutes[token] = Route({router: router, path: path});
        emit BuyRouteSet(token, router, path);
    }

    /// @notice Point a token's sales at a specific venue and path.
    function setSellRoute(address token, address router, address[] calldata path)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0) || router == address(0)) revert ZeroAddress();
        _requirePath(path, token, WETH);
        _sellRoutes[token] = Route({router: router, path: path});
        emit SellRouteSet(token, router, path);
    }

    /// @notice Drop a custom buy route, returning the token to the default venue.
    function clearBuyRoute(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        delete _buyRoutes[token];
        emit BuyRouteCleared(token);
    }

    /// @notice Drop a custom sell route, returning the token to the default venue.
    function clearSellRoute(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        delete _sellRoutes[token];
        emit SellRouteCleared(token);
    }

    /// @notice The route a buy would take right now, default included.
    function buyRoute(address token) external view returns (address router, address[] memory path) {
        return _resolve(_buyRoutes[token], WETH, token);
    }

    /// @notice The route a sale would take right now, default included.
    function sellRoute(address token) external view returns (address router, address[] memory path) {
        return _resolve(_sellRoutes[token], token, WETH);
    }

    // ----------------------------------------------------------------- swaps

    /**
     * @notice Spend ETH on a reward token and deposit it into the vault.
     * @param minAmountOut Enforced by the router. Zero means unprotected.
     * @dev The second parameter is a dead V3 pool fee, kept so existing callers
     *      and scripts do not have to change.
     */
    function swapAndFund(
        address token,
        uint24, // poolFee, unused since the move to V2
        uint256 ethAmount,
        uint256 minAmountOut
    ) external payable onlyRole(RobachaRoles.POOL_MANAGER_ROLE) nonReentrant returns (uint256 amountOut) {
        if (ethAmount == 0) revert ZeroAmount();
        if (address(this).balance < ethAmount) revert InsufficientBalance(address(this).balance, ethAmount);

        (address router, address[] memory path) = _resolve(_buyRoutes[token], WETH, token);

        uint256[] memory amounts = IUniswapV2Router02(router).swapExactETHForTokens{value: ethAmount}(
            minAmountOut, path, address(this), block.timestamp + 300
        );
        amountOut = amounts[amounts.length - 1];

        // forceApprove, not approve: a token that requires the allowance be
        // zeroed before it is raised would revert on the second buy, and the
        // first buy having worked is exactly how that goes unnoticed.
        IERC20(token).forceApprove(address(vault), amountOut);
        vault.fund(token, amountOut);

        emit TokensBoughtAndFunded(token, ethAmount, amountOut);
    }

    /**
     * @notice Sell a token this contract holds back into ETH.
     * @param minEthOut Enforced by the router. Zero means unprotected.
     * @dev The ETH stays here rather than being forwarded, so it lands in the
     *      same balance `swapAndFund` spends from and can be turned straight
     *      into prizes. Nothing is bought automatically: which token to restock
     *      is a decision, and the proceeds of one sale are rarely destined for
     *      one purchase.
     */
    function sellForEth(address token, uint256 tokenAmount, uint256 minEthOut)
        external
        onlyRole(RobachaRoles.POOL_MANAGER_ROLE)
        nonReentrant
        returns (uint256 ethOut)
    {
        if (tokenAmount == 0) revert ZeroAmount();
        uint256 held = IERC20(token).balanceOf(address(this));
        if (held < tokenAmount) revert InsufficientBalance(held, tokenAmount);

        (address router, address[] memory path) = _resolve(_sellRoutes[token], token, WETH);

        IERC20(token).forceApprove(router, tokenAmount);

        uint256 before = address(this).balance;
        IUniswapV2Router02(router).swapExactTokensForETH(
            tokenAmount, minEthOut, path, address(this), block.timestamp + 300
        );
        // Measured rather than taken from the router's return value: a
        // fee-on-transfer token delivers less than it reports, and this number
        // is what the reserve can actually spend.
        ethOut = address(this).balance - before;

        // Leave no standing allowance behind on a router we do not control.
        IERC20(token).forceApprove(router, 0);

        emit TokensSoldForEth(token, tokenAmount, ethOut);
    }

    // ------------------------------------------------------------- internals

    function _resolve(Route storage stored, address from, address to)
        private
        view
        returns (address router, address[] memory path)
    {
        if (stored.router != address(0)) return (stored.router, stored.path);

        path = new address[](2);
        path[0] = from;
        path[1] = to;
        return (SWAP_ROUTER, path);
    }

    function _requirePath(address[] calldata path, address from, address to) private pure {
        if (path.length < 2) revert PathTooShort();
        if (path[0] != from) revert PathMustStartWith(from, path[0]);
        if (path[path.length - 1] != to) revert PathMustEndWith(to, path[path.length - 1]);
    }

    // ------------------------------------------------------------- emergency

    /**
     * @notice Withdraw native ETH in case of emergency.
     */
    function withdrawEth(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    /**
     * @notice Recover any stranded ERC-20 token.
     */
    function recoverStrandedToken(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }
}
