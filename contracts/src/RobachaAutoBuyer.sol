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

/**
 * @dev The V3 router's exact-input calls.
 *
 * `exactInputSingle` is the one hop case and takes the fee tier directly.
 * `exactInput` walks a longer route, where the fee for each hop is packed into
 * the path bytes rather than passed alongside it: token, then uint24 fee, then
 * the next token, repeating. So a two hop route is 43 bytes and a three hop
 * route is 66, which is why the path is `bytes` here and `address[]` on V2.
 *
 * The `deadline` field is absent because SwapRouter02 dropped it. Deadlines
 * there are the caller's problem, and ours is the block itself: a swap that is
 * not mined in this block is not mined at all, since the call originates from
 * a transaction of ours.
 */
interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @dev Uniswap V4's singleton, verified on chain against the deployed
 *      PoolManager's own ABI rather than written from memory.
 *
 * V4 has no per-pool contract and no swap entry point that can simply be
 * called. Everything goes through `unlock`: the caller asks to be unlocked,
 * the manager calls `unlockCallback` back, and only inside that callback may
 * the caller swap. It then has to square its own books before returning —
 * anything it owes is `settle`d, anything it is owed is `take`n — and the
 * manager reverts if the accounts do not balance. That is why the swap logic
 * below lives in a callback rather than inline.
 */
interface IPoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }

    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        external
        returns (int256 delta);
    function sync(address currency) external;
    function settle() external payable returns (uint256);
    function take(address currency, address to, uint256 amount) external;
}

/**
 * @dev Uniswap's original V3 SwapRouter, which SwapRouter02 replaced.
 *
 * The only difference that matters here is `deadline`, which the original
 * takes and its successor dropped. That single extra field shifts every
 * argument after it, so calling one router with the other's struct does not
 * fail cleanly — it succeeds against garbage, and the field that ends up
 * garbage is `amountOutMinimum`. A swap with no slippage floor is a worse
 * outcome than a reverted one, which is why these are separate venues rather
 * than one call site with a flag.
 */
interface IUniswapV3RouterLegacy {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

interface IWETH9 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
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

    /// @notice Which router interface a venue speaks.
    enum Venue {
        V2,
        V3,
        V4,
        /// The original SwapRouter. Same pools as V3, different call shape.
        V3Legacy
    }

    /// @dev V4's price bounds. A swap must name a limit; these mean "no limit".
    uint160 constant MIN_SQRT_PRICE = 4295128739 + 1;
    uint160 constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342 - 1;

    /**
     * @notice How to trade one token, when the default venue will not do.
     * @param router The router to send the swap through.
     * @param venue  Which interface that router speaks. The two are not
     *               interchangeable: pointing a V2 call at a V3 router reverts,
     *               which is exactly how this was found out the expensive way.
     * @param path   V2 hop list. Empty on a V3 route.
     * @param v3Path V3 packed path: token, uint24 fee, token, repeating. Empty
     *               on a V2 route. The fee tier lives inside the bytes, which
     *               is why V3 cannot reuse `path` — a plain address list has
     *               nowhere to put it, and the tier is not guessable. ROB, for
     *               instance, exists only at 1% and not at all at 0.05%.
     */
    struct Route {
        address router;
        Venue venue;
        address[] path;
        bytes v3Path;
        /// V4 only. The pool is identified by the whole key, not an address.
        IPoolManager.PoolKey v4Key;
    }

    /// @notice ETH -> token. Empty router means "use the default venue".
    mapping(address token => Route route) private _buyRoutes;

    /// @notice token -> ETH. Empty router means "use the default venue".
    mapping(address token => Route route) private _sellRoutes;

    event TokensBoughtAndFunded(address indexed token, uint256 ethSpent, uint256 tokensReceived);
    event TokensSoldForEth(address indexed token, uint256 tokensSpent, uint256 ethReceived);
    event BuyRouteSet(address indexed token, address indexed router, address[] path);
    event SellRouteSet(address indexed token, address indexed router, address[] path);
    event BuyRouteSetV3(address indexed token, address indexed router, bytes path);
    event V4RouteSet(address indexed token, address indexed manager, uint24 fee, int24 tickSpacing);
    event SellRouteSetV3(address indexed token, address indexed router, bytes path);
    event BuyRouteCleared(address indexed token);
    event SellRouteCleared(address indexed token);

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance(uint256 held, uint256 requested);
    error PathTooShort();
    error PathMustStartWith(address expected, address actual);
    error PathMustEndWith(address expected, address actual);
    /// @dev A V3 path is 20 + (23 * hops) bytes. Anything else is malformed.
    error MalformedV3Path(uint256 length);
    error PoolKeyMissingToken(address token);
    error PoolKeyMisordered();
    error NotThePoolManager();
    error V4SwapReturnedNothing();
    error InsufficientOutput(uint256 received, uint256 minimum);

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
        _buyRoutes[token] = Route({router: router, venue: Venue.V2, path: path, v3Path: "", v4Key: _emptyKey()});
        emit BuyRouteSet(token, router, path);
    }

    /**
     * @notice Point a token's buys at a Uniswap V3 pool.
     * @param v3Path Packed as token, uint24 fee, token, repeating. Must start
     *               at WETH and end at the token being bought.
     * @dev Needed because the V2 interface cannot reach a V3 pool at all. ROB's
     *      only market is a V3 pool at the 1% tier, and a V2 call against the
     *      router fronting it simply reverts.
     */
    function setBuyRouteV3(address token, address router, bytes calldata v3Path)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0) || router == address(0)) revert ZeroAddress();
        _requireV3Path(v3Path, WETH, token);
        address[] memory empty;
        _buyRoutes[token] = Route({router: router, venue: Venue.V3, path: empty, v3Path: v3Path, v4Key: _emptyKey()});
        emit BuyRouteSetV3(token, router, v3Path);
    }

    /**
     * @notice Point a token at its Uniswap V4 pool, for both buying and selling.
     * @param manager The PoolManager singleton.
     * @param key     The pool's full key. V4 identifies a pool by the hash of
     *                this, so there is no address to point at and nothing to
     *                look up from the token alone.
     * @dev One call covers both directions, unlike V2 and V3 where the path
     *      has to be reversed. A V4 swap direction is just `zeroForOne`, so the
     *      same key serves both and splitting it would only create a way for
     *      the two to disagree.
     *
     *      The key must name this token as one of its two currencies, or it
     *      describes a different pool entirely and the swap would deliver
     *      something else into the vault.
     */
    function setV4Route(address token, address manager, IPoolManager.PoolKey calldata key)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0) || manager == address(0)) revert ZeroAddress();
        if (key.currency0 != token && key.currency1 != token) revert PoolKeyMissingToken(token);
        // currency0 < currency1 is V4's own invariant; a key breaking it hashes
        // to a pool that was never initialised.
        if (key.currency0 >= key.currency1) revert PoolKeyMisordered();

        address[] memory empty;
        Route memory route =
            Route({router: manager, venue: Venue.V4, path: empty, v3Path: "", v4Key: key});
        _buyRoutes[token] = route;
        _sellRoutes[token] = route;
        emit V4RouteSet(token, manager, key.fee, key.tickSpacing);
    }

    /// @notice The V4 pool a token trades through, if one is configured.
    function v4Route(address token) external view returns (address manager, IPoolManager.PoolKey memory key) {
        Route storage route = _buyRoutes[token];
        if (route.venue != Venue.V4) return (address(0), key);
        return (route.router, route.v4Key);
    }

    /**
     * @notice Point a token at a pool fronted by the original SwapRouter.
     * @dev Same packed path as V3 — the pools are identical, only the router's
     *      argument list differs. SUSHI is the case in point: its market sits
     *      on a third V3 factory whose router predates SwapRouter02.
     */
    function setBuyRouteV3Legacy(address token, address router, bytes calldata v3Path)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0) || router == address(0)) revert ZeroAddress();
        _requireV3Path(v3Path, WETH, token);
        address[] memory empty;
        _buyRoutes[token] =
            Route({router: router, venue: Venue.V3Legacy, path: empty, v3Path: v3Path, v4Key: _emptyKey()});
        emit BuyRouteSetV3(token, router, v3Path);
    }

    /// @notice The selling half of a legacy SwapRouter route.
    function setSellRouteV3Legacy(address token, address router, bytes calldata v3Path)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0) || router == address(0)) revert ZeroAddress();
        _requireV3Path(v3Path, token, WETH);
        address[] memory empty;
        _sellRoutes[token] =
            Route({router: router, venue: Venue.V3Legacy, path: empty, v3Path: v3Path, v4Key: _emptyKey()});
        emit SellRouteSetV3(token, router, v3Path);
    }

    /// @notice Point a token's sales at a Uniswap V3 pool.
    function setSellRouteV3(address token, address router, bytes calldata v3Path)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0) || router == address(0)) revert ZeroAddress();
        _requireV3Path(v3Path, token, WETH);
        address[] memory empty;
        _sellRoutes[token] = Route({router: router, venue: Venue.V3, path: empty, v3Path: v3Path, v4Key: _emptyKey()});
        emit SellRouteSetV3(token, router, v3Path);
    }

    /// @notice Point a token's sales at a specific venue and path.
    function setSellRoute(address token, address router, address[] calldata path)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (token == address(0) || router == address(0)) revert ZeroAddress();
        _requirePath(path, token, WETH);
        _sellRoutes[token] = Route({router: router, venue: Venue.V2, path: path, v3Path: "", v4Key: _emptyKey()});
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

    /**
     * @notice The V2 route a buy would take right now, default included.
     * @dev Reports the default for a token configured on V3, since there is no
     *      address list to report. Read `buyRouteV3` alongside it: a non-empty
     *      path there means this is not the route that will be taken.
     */
    function buyRoute(address token) external view returns (address router, address[] memory path) {
        return _resolve(_buyRoutes[token], WETH, token);
    }

    /// @notice The V2 route a sale would take right now, default included.
    function sellRoute(address token) external view returns (address router, address[] memory path) {
        return _resolve(_sellRoutes[token], token, WETH);
    }

    /// @notice The V3 buy route, or a zero router and empty path if there is none.
    function buyRouteV3(address token) external view returns (address router, bytes memory path) {
        Route storage route = _buyRoutes[token];
        if (route.venue != Venue.V3) return (address(0), "");
        return (route.router, route.v3Path);
    }

    /// @notice The V3 sell route, or a zero router and empty path if there is none.
    function sellRouteV3(address token) external view returns (address router, bytes memory path) {
        Route storage route = _sellRoutes[token];
        if (route.venue != Venue.V3) return (address(0), "");
        return (route.router, route.v3Path);
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

        Route storage route = _buyRoutes[token];

        if (route.venue == Venue.V4 && route.router != address(0)) {
            uint256 before = IERC20(token).balanceOf(address(this));
            _v4Swap(route, token, ethAmount, true);
            amountOut = IERC20(token).balanceOf(address(this)) - before;
            // V4 has no amountOutMinimum of its own: the pool only understands
            // a price limit, and a price limit is not a slippage floor. So the
            // caller's minimum is enforced here, after the fact, by reverting
            // the whole transaction — swap included.
            if (amountOut < minAmountOut) revert InsufficientOutput(amountOut, minAmountOut);
        } else if (route.venue == Venue.V3Legacy && route.router != address(0)) {
            uint256 before = IERC20(token).balanceOf(address(this));
            IUniswapV3RouterLegacy(route.router).exactInput{value: ethAmount}(
                IUniswapV3RouterLegacy.ExactInputParams({
                    path: route.v3Path,
                    recipient: address(this),
                    // This block is the deadline: a swap not mined now is not
                    // mined, since it originates from a transaction of ours.
                    deadline: block.timestamp,
                    amountIn: ethAmount,
                    amountOutMinimum: minAmountOut
                })
            );
            amountOut = IERC20(token).balanceOf(address(this)) - before;
        } else if (route.venue == Venue.V3 && route.router != address(0)) {
            // Measured rather than taken from the return value, for the same
            // reason as the sell side: what the vault can pay out is what
            // actually arrived.
            uint256 before = IERC20(token).balanceOf(address(this));
            IUniswapV3Router(route.router).exactInput{value: ethAmount}(
                IUniswapV3Router.ExactInputParams({
                    path: route.v3Path,
                    recipient: address(this),
                    amountIn: ethAmount,
                    amountOutMinimum: minAmountOut
                })
            );
            amountOut = IERC20(token).balanceOf(address(this)) - before;
        } else {
            (address router, address[] memory path) = _resolve(route, WETH, token);
            uint256[] memory amounts = IUniswapV2Router02(router).swapExactETHForTokens{value: ethAmount}(
                minAmountOut, path, address(this), block.timestamp + 300
            );
            amountOut = amounts[amounts.length - 1];
        }

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

        Route storage route = _sellRoutes[token];
        uint256 before = address(this).balance;
        address router;

        if (route.venue == Venue.V4 && route.router != address(0)) {
            // No approval: V4 is paid by transferring into the manager between
            // sync and settle, not by it pulling from an allowance.
            _v4Swap(route, token, tokenAmount, false);
            ethOut = address(this).balance - before;
            if (ethOut < minEthOut) revert InsufficientOutput(ethOut, minEthOut);
            emit TokensSoldForEth(token, tokenAmount, ethOut);
            return ethOut;
        } else if (route.venue == Venue.V3Legacy && route.router != address(0)) {
            router = route.router;
            IERC20(token).forceApprove(router, tokenAmount);

            uint256 wethOut = IUniswapV3RouterLegacy(router).exactInput(
                IUniswapV3RouterLegacy.ExactInputParams({
                    path: route.v3Path,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: tokenAmount,
                    amountOutMinimum: minEthOut
                })
            );
            IWETH9(WETH).withdraw(wethOut);
        } else if (route.venue == Venue.V3 && route.router != address(0)) {
            router = route.router;
            IERC20(token).forceApprove(router, tokenAmount);

            // V3 pays out WETH, not ETH — there is no swapExactTokensForETH
            // here. Taking delivery as WETH and unwrapping it ourselves keeps
            // this to one call, where the router's own unwrap helper would mean
            // a multicall and a second thing to get wrong.
            uint256 wethOut = IUniswapV3Router(router).exactInput(
                IUniswapV3Router.ExactInputParams({
                    path: route.v3Path,
                    recipient: address(this),
                    amountIn: tokenAmount,
                    amountOutMinimum: minEthOut
                })
            );
            IWETH9(WETH).withdraw(wethOut);
        } else {
            address[] memory path;
            (router, path) = _resolve(route, token, WETH);
            IERC20(token).forceApprove(router, tokenAmount);
            IUniswapV2Router02(router).swapExactTokensForETH(
                tokenAmount, minEthOut, path, address(this), block.timestamp + 300
            );
        }

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

    /**
     * @dev A V3 path is 20 bytes of token, then 23 bytes per additional hop
     *      (3 fee + 20 token). Checked on write for the same reason as V2: a
     *      path that does not start and end where it claims buys the wrong
     *      asset, and the vault would accept it as the prize it was meant to be.
     */
    function _requireV3Path(bytes calldata v3Path, address from, address to) private pure {
        if (v3Path.length < 43 || (v3Path.length - 20) % 23 != 0) revert MalformedV3Path(v3Path.length);

        address first = address(bytes20(v3Path[0:20]));
        address last = address(bytes20(v3Path[v3Path.length - 20:v3Path.length]));
        if (first != from) revert PathMustStartWith(from, first);
        if (last != to) revert PathMustEndWith(to, last);
    }

    function _requirePath(address[] calldata path, address from, address to) private pure {
        if (path.length < 2) revert PathTooShort();
        if (path[0] != from) revert PathMustStartWith(from, path[0]);
        if (path[path.length - 1] != to) revert PathMustEndWith(to, path[path.length - 1]);
    }

    // -------------------------------------------------------------------- V4

    /// @dev What `unlock` carries across into the callback.
    struct V4Call {
        IPoolManager.PoolKey key;
        address token;
        uint256 amountIn;
        bool buying;
    }

    /**
     * @dev Starts a V4 swap. The real work happens in `unlockCallback`.
     *
     * The manager will not let anyone swap outside an unlock, so this cannot be
     * collapsed into a direct call however much simpler that would read.
     */
    function _v4Swap(Route storage route, address token, uint256 amountIn, bool buying) private {
        IPoolManager(route.router).unlock(
            abi.encode(V4Call({key: route.v4Key, token: token, amountIn: amountIn, buying: buying}))
        );
    }

    /**
     * @notice Called back by the PoolManager during `unlock`. Not for anyone else.
     * @dev Every V4 swap runs here, because the manager grants the right to swap
     *      only for the duration of this call and revokes it on return.
     *
     *      The access check is the important line. Without it anyone could
     *      invoke this directly and have the contract settle a swap it never
     *      asked for, paying out of its own balance. `msg.sender` is the only
     *      thing that distinguishes a real callback from a forged one, since
     *      the arguments are attacker-supplied either way.
     *
     *      Settlement is not optional bookkeeping: the manager reverts the
     *      whole unlock unless every currency this swap moved is squared off.
     *      A negative delta is a debt we pay, a positive one is a credit we
     *      collect, and the direction of each depends on which way the swap
     *      went.
     */
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        V4Call memory call = abi.decode(data, (V4Call));
        // Checked against the route rather than a stored flag: the manager for
        // this token is what we configured, and nothing else may call in.
        if (msg.sender != _buyRoutes[call.token].router || msg.sender == address(0)) {
            revert NotThePoolManager();
        }

        bool nativeIsCurrency0 = call.key.currency0 == address(0);
        // Buying spends the pool's currency0 side when that side is ETH.
        bool zeroForOne = call.buying ? nativeIsCurrency0 : !nativeIsCurrency0;

        int256 delta = IPoolManager(msg.sender).swap(
            call.key,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                // Negative means exact input: spend precisely this much.
                amountSpecified: -int256(call.amountIn),
                sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE
            }),
            ""
        );

        (int128 delta0, int128 delta1) = _unpack(delta);
        if (delta0 == 0 && delta1 == 0) revert V4SwapReturnedNothing();

        _resolve(call.key.currency0, delta0);
        _resolve(call.key.currency1, delta1);

        return "";
    }

    /// @dev Pay what we owe on this currency, or collect what we are owed.
    function _resolve(address currency, int128 delta) private {
        if (delta < 0) {
            uint256 owed = uint256(uint128(-delta));
            if (currency == address(0)) {
                // Native ETH is settled by value, with no sync beforehand.
                IPoolManager(msg.sender).settle{value: owed}();
            } else {
                // An ERC-20 is settled by depositing it between sync and
                // settle: sync snapshots the balance, the transfer moves the
                // tokens, settle credits the difference.
                IPoolManager(msg.sender).sync(currency);
                IERC20(currency).safeTransfer(msg.sender, owed);
                IPoolManager(msg.sender).settle();
            }
        } else if (delta > 0) {
            IPoolManager(msg.sender).take(currency, address(this), uint256(uint128(delta)));
        }
    }

    /// @dev BalanceDelta packs both amounts into one int256: amount0 high, amount1 low.
    function _unpack(int256 delta) private pure returns (int128 amount0, int128 amount1) {
        assembly {
            amount0 := sar(128, delta)
            amount1 := signextend(15, delta)
        }
    }

    function _emptyKey() private pure returns (IPoolManager.PoolKey memory) {
        return IPoolManager.PoolKey({
            currency0: address(0),
            currency1: address(0),
            fee: 0,
            tickSpacing: 0,
            hooks: address(0)
        });
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
