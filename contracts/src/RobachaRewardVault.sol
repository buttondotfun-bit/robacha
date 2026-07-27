// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {RobachaRoles} from "./RobachaRoles.sol";

/**
 * @title RobachaRewardVault
 * @notice Custodies reward inventory and tracks liabilities against it.
 *
 * Core invariant, enforced on every state change:
 *
 *     reserved[token] <= IERC20(token).balanceOf(address(this))
 *
 * `reserved` is the total owed to users whose rewards have been assigned but
 * not yet claimed. Anything above it is free inventory that a spin may draw
 * from. The vault refuses to reserve beyond its own balance, so the gacha can
 * never promise a reward the vault cannot pay.
 *
 * @dev Non-standard ERC-20 behaviour is rejected rather than accommodated:
 *
 *      - **Fee-on-transfer**: `fund` measures the balance delta and reverts if
 *        it differs from the stated amount. A token that skims on transfer
 *        cannot enter the vault, so a reward can never be assigned at a size
 *        the vault will fail to pay out.
 *      - **Rebasing**: `depositedNet` tracks deposits minus payouts. A token
 *        whose balance drifts below that figure is reported unhealthy by
 *        `isSolvent`, and `available` floors at zero rather than underflowing.
 *        The pool-activation validator refuses to activate on an unhealthy token.
 */
contract RobachaRewardVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    /// @notice Amount owed to users per token (assigned, unclaimed).
    mapping(address token => uint256 amount) public reserved;

    /// @notice Deposits minus payouts, per token. Balance below this signals drift.
    mapping(address token => uint256 amount) public depositedNet;

    /// @notice Every token that has ever been funded, for reporting.
    EnumerableSet.AddressSet private _knownTokens;

    event Funded(address indexed token, address indexed from, uint256 amount);
    event Reserved(address indexed token, uint256 amount, uint256 totalReserved);
    event Released(address indexed token, uint256 amount, uint256 totalReserved);
    event Paid(address indexed token, address indexed to, uint256 amount);
    event SurplusWithdrawn(address indexed token, address indexed to, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientAvailable(address token, uint256 requested, uint256 available);
    error InsufficientReserved(address token, uint256 requested, uint256 reserved);
    error NonStandardTransfer(address token, uint256 expected, uint256 received);

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RobachaRoles.VAULT_MANAGER_ROLE, admin);
        _grantRole(RobachaRoles.PAUSER_ROLE, admin);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    /// @notice Inventory free to back new reward assignments.
    function available(address token) public view returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 owed = reserved[token];
        // A deflationary or rebasing token could push balance below liabilities.
        // Report zero rather than underflowing.
        return balance > owed ? balance - owed : 0;
    }

    function balanceOf(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice True when the vault's real balance still covers what it has
     *         promised and has not drifted below its own accounting.
     */
    function isSolvent(address token) external view returns (bool) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        return balance >= reserved[token] && balance >= depositedNet[token];
    }

    function knownTokenCount() external view returns (uint256) {
        return _knownTokens.length();
    }

    function knownTokenAt(uint256 index) external view returns (address) {
        return _knownTokens.at(index);
    }

    function knownTokens() external view returns (address[] memory) {
        return _knownTokens.values();
    }

    // ------------------------------------------------------------------
    // Funding
    // ------------------------------------------------------------------

    /**
     * @notice Pull `amount` of `token` from the caller into the vault.
     * @dev Reverts when the received amount differs from the stated amount,
     *      which is how fee-on-transfer tokens are kept out.
     */
    function fund(address token, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        onlyRole(RobachaRoles.VAULT_MANAGER_ROLE)
    {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - before;
        if (received != amount) revert NonStandardTransfer(token, amount, received);

        depositedNet[token] += received;
        _knownTokens.add(token);

        emit Funded(token, msg.sender, received);
    }

    // ------------------------------------------------------------------
    // Liabilities
    // ------------------------------------------------------------------

    /// @notice Record a new liability. Reverts unless free inventory covers it.
    function reserve(address token, uint256 amount) external onlyRole(RobachaRoles.GACHA_ROLE) {
        if (amount == 0) revert ZeroAmount();
        uint256 free = available(token);
        if (amount > free) revert InsufficientAvailable(token, amount, free);

        uint256 total = reserved[token] + amount;
        reserved[token] = total;
        emit Reserved(token, amount, total);
    }

    /// @notice Drop a liability without paying it (e.g. a cancelled assignment).
    function release(address token, uint256 amount) external onlyRole(RobachaRoles.GACHA_ROLE) {
        uint256 owed = reserved[token];
        if (amount > owed) revert InsufficientReserved(token, amount, owed);

        uint256 total = owed - amount;
        reserved[token] = total;
        emit Released(token, amount, total);
    }

    /**
     * @notice Settle a reserved liability by transferring to the claimant.
     * @dev Reduces `reserved` before transferring — checks-effects-interactions.
     *      Claims stay open while paused: pausing stops new spins, it does not
     *      withhold a reward a user has already been assigned.
     */
    function pay(address token, address to, uint256 amount) external nonReentrant onlyRole(RobachaRoles.GACHA_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        uint256 owed = reserved[token];
        if (amount > owed) revert InsufficientReserved(token, amount, owed);

        reserved[token] = owed - amount;
        depositedNet[token] = depositedNet[token] > amount ? depositedNet[token] - amount : 0;
        IERC20(token).safeTransfer(to, amount);

        emit Paid(token, to, amount);
    }

    // ------------------------------------------------------------------
    // Operations
    // ------------------------------------------------------------------

    /**
     * @notice Withdraw inventory that is not owed to any user.
     * @dev Cannot touch reserved balances, so an operator can never strand a
     *      user's unclaimed reward. This is the emergency path as well: pause
     *      the gacha first, let liabilities settle, then withdraw the surplus.
     */
    function withdrawSurplus(address token, address to, uint256 amount)
        external
        nonReentrant
        onlyRole(RobachaRoles.VAULT_MANAGER_ROLE)
    {
        if (to == address(0)) revert ZeroAddress();
        uint256 free = available(token);
        if (amount > free) revert InsufficientAvailable(token, amount, free);

        depositedNet[token] = depositedNet[token] > amount ? depositedNet[token] - amount : 0;
        IERC20(token).safeTransfer(to, amount);
        emit SurplusWithdrawn(token, to, amount);
    }

    function pause() external onlyRole(RobachaRoles.PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(RobachaRoles.PAUSER_ROLE) {
        _unpause();
    }
}
