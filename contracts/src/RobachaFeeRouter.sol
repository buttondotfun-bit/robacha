// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RobachaRoles} from "./RobachaRoles.sol";

/**
 * @title RobachaFeeRouter
 * @notice Splits every base spin payment between the protocol treasury, the
 *         operations reserve and the reward reserve, and accounts for each
 *         routed wei.
 *
 * @dev Design notes that matter for safety:
 *
 *      - Routing **accrues** rather than pushes. A push to a treasury that is a
 *        contract with an expensive or reverting receive hook would make every
 *        spin settlement revert; accrual plus a pull withdrawal cannot be
 *        griefed and cannot trap funds.
 *      - The three components must total exactly `BPS_DENOMINATOR`, checked on
 *        proposal and re-checked on execution.
 *      - Fee changes are timelocked. A proposal records the exact values and the
 *        earliest execution time; executing different values is impossible
 *        because the values are read from the stored proposal.
 *      - The active split is read by the pool registry when a pool version is
 *        created and is snapshotted there, so a fee change can never alter the
 *        economics of a pool that is already selling spins.
 */
contract RobachaFeeRouter is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Hard ceiling on protocol revenue, enforced on every change.
    uint16 public constant MAX_PROTOCOL_FEE_BPS = 2_000;

    /// @notice Hard ceiling on the operations reserve, enforced on every change.
    uint16 public constant MAX_OPERATIONS_FEE_BPS = 500;

    /// @notice Delay a fee change must sit for before it can be executed.
    uint256 public constant FEE_TIMELOCK = 48 hours;

    struct FeeSplit {
        uint16 protocolFeeBps;
        uint16 operationsFeeBps;
        uint16 rewardReserveBps;
    }

    struct PendingFeeChange {
        uint16 protocolFeeBps;
        uint16 operationsFeeBps;
        uint16 rewardReserveBps;
        uint64 executableAt;
        bool exists;
    }

    /// @notice The split applied to base spin payments routed from now on.
    FeeSplit public activeSplit;

    /// @notice The queued change, if any.
    PendingFeeChange public pendingFeeChange;

    address public protocolTreasury;
    address public operationsTreasury;
    address public rewardReserveTreasury;

    /// @notice Randomness funding account. Surcharges are routed here, never to profit.
    address public randomnessTreasury;

    /// @notice Withdrawable balance per destination, in wei.
    mapping(address account => uint256 amount) public accrued;

    /// @notice Lifetime gross base-spin revenue received, in wei.
    uint256 public lifetimeBaseRevenue;
    /// @notice Lifetime wei routed to the protocol treasury.
    uint256 public lifetimeProtocolRevenue;
    /// @notice Lifetime wei routed to the operations reserve.
    uint256 public lifetimeOperationsRevenue;
    /// @notice Lifetime wei routed to the reward reserve.
    uint256 public lifetimeRewardReserve;
    /// @notice Lifetime randomness surcharge received, in wei. Not revenue.
    uint256 public lifetimeRandomnessSurcharge;
    /// @notice Lifetime wei withdrawn from the randomness account to pay real costs.
    uint256 public lifetimeRandomnessSpend;
    /// @notice Lifetime wei withdrawn across all destinations.
    uint256 public lifetimeWithdrawn;

    /// @notice Base revenue attributed to a pool version, in wei.
    mapping(uint256 poolVersionKey => uint256 amount) public baseRevenueByPoolVersion;

    event FeesRouted(
        uint256 indexed poolId,
        uint256 indexed version,
        uint256 indexed roundId,
        uint256 baseAmount,
        uint256 protocolAmount,
        uint256 operationsAmount,
        uint256 rewardReserveAmount
    );
    event RandomnessSurchargeReceived(uint256 indexed roundId, uint256 amount);
    event RandomnessSpendWithdrawn(address indexed to, uint256 amount, string memo);
    event RevenueWithdrawn(address indexed account, address indexed to, uint256 amount);
    event FeeChangeProposed(
        uint16 protocolFeeBps, uint16 operationsFeeBps, uint16 rewardReserveBps, uint64 executableAt
    );
    event FeeChangeCancelled(uint16 protocolFeeBps, uint16 operationsFeeBps, uint16 rewardReserveBps);
    event FeeChangeExecuted(uint16 protocolFeeBps, uint16 operationsFeeBps, uint16 rewardReserveBps);
    event TreasuriesUpdated(
        address protocolTreasury, address operationsTreasury, address rewardReserveTreasury, address randomnessTreasury
    );
    event StrandedTokenRecovered(address indexed token, address indexed to, uint256 amount);

    error ZeroAddress();
    error FeeTotalInvalid(uint256 total);
    error ProtocolFeeTooHigh(uint16 bps);
    error OperationsFeeTooHigh(uint16 bps);
    error NoPendingFeeChange();
    error TimelockNotElapsed(uint64 executableAt);
    error NothingAccrued();
    error TransferFailed();
    error ValueMismatch(uint256 expected, uint256 received);

    constructor(
        address admin,
        address protocolTreasury_,
        address operationsTreasury_,
        address rewardReserveTreasury_,
        address randomnessTreasury_,
        uint16 protocolFeeBps_,
        uint16 operationsFeeBps_,
        uint16 rewardReserveBps_
    ) {
        if (
            admin == address(0) || protocolTreasury_ == address(0) || operationsTreasury_ == address(0)
                || rewardReserveTreasury_ == address(0) || randomnessTreasury_ == address(0)
        ) revert ZeroAddress();

        _validateSplit(protocolFeeBps_, operationsFeeBps_, rewardReserveBps_);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RobachaRoles.TREASURY_ROLE, admin);

        protocolTreasury = protocolTreasury_;
        operationsTreasury = operationsTreasury_;
        rewardReserveTreasury = rewardReserveTreasury_;
        randomnessTreasury = randomnessTreasury_;

        activeSplit = FeeSplit({
            protocolFeeBps: protocolFeeBps_,
            operationsFeeBps: operationsFeeBps_,
            rewardReserveBps: rewardReserveBps_
        });

        emit TreasuriesUpdated(protocolTreasury_, operationsTreasury_, rewardReserveTreasury_, randomnessTreasury_);
        emit FeeChangeExecuted(protocolFeeBps_, operationsFeeBps_, rewardReserveBps_);
    }

    // ------------------------------------------------------------------
    // Routing
    // ------------------------------------------------------------------

    /**
     * @notice Route a settled round's base payment and randomness surcharge.
     * @dev Called by the gacha contract at settlement — never at entry — so a
     *      round that is refunded never routes anything.
     *
     *      The split applied is the one passed in by the caller, which is the
     *      snapshot taken when the pool version was created. That is what makes
     *      a live pool's economics immune to a fee change.
     */
    function routeSettlement(
        uint256 poolId,
        uint256 version,
        uint256 roundId,
        uint256 baseAmount,
        uint256 surchargeAmount,
        uint16 protocolFeeBps_,
        uint16 operationsFeeBps_,
        uint16 rewardReserveBps_
    ) external payable onlyRole(RobachaRoles.GACHA_ROLE) {
        if (msg.value != baseAmount + surchargeAmount) {
            revert ValueMismatch(baseAmount + surchargeAmount, msg.value);
        }
        _validateSplit(protocolFeeBps_, operationsFeeBps_, rewardReserveBps_);

        // Integer division leaves a remainder of at most 2 wei; it is assigned
        // to the reward reserve so the three parts always sum to `baseAmount`.
        uint256 protocolAmount = (baseAmount * protocolFeeBps_) / BPS_DENOMINATOR;
        uint256 operationsAmount = (baseAmount * operationsFeeBps_) / BPS_DENOMINATOR;
        uint256 rewardAmount = baseAmount - protocolAmount - operationsAmount;

        accrued[protocolTreasury] += protocolAmount;
        accrued[operationsTreasury] += operationsAmount;
        accrued[rewardReserveTreasury] += rewardAmount;

        lifetimeBaseRevenue += baseAmount;
        lifetimeProtocolRevenue += protocolAmount;
        lifetimeOperationsRevenue += operationsAmount;
        lifetimeRewardReserve += rewardAmount;
        baseRevenueByPoolVersion[_poolVersionKey(poolId, version)] += baseAmount;

        if (surchargeAmount != 0) {
            accrued[randomnessTreasury] += surchargeAmount;
            lifetimeRandomnessSurcharge += surchargeAmount;
            emit RandomnessSurchargeReceived(roundId, surchargeAmount);
        }

        emit FeesRouted(poolId, version, roundId, baseAmount, protocolAmount, operationsAmount, rewardAmount);
    }

    // ------------------------------------------------------------------
    // Withdrawals
    // ------------------------------------------------------------------

    /**
     * @notice Withdraw everything accrued to `account` to that same account.
     * @dev Deliberately not payable-to-arbitrary: funds can only ever leave to
     *      the destination they were accrued for, so a compromised treasury role
     *      cannot redirect revenue.
     */
    function withdraw(address account) external nonReentrant onlyRole(RobachaRoles.TREASURY_ROLE) {
        uint256 amount = accrued[account];
        if (amount == 0) revert NothingAccrued();

        accrued[account] = 0;
        lifetimeWithdrawn += amount;
        if (account == randomnessTreasury) lifetimeRandomnessSpend += amount;

        (bool ok,) = account.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit RevenueWithdrawn(account, account, amount);
        if (account == randomnessTreasury) {
            emit RandomnessSpendWithdrawn(account, amount, "randomness funding");
        }
    }

    /// @notice Total wei this contract still owes across every destination.
    function totalLiabilities() public view returns (uint256) {
        return accrued[protocolTreasury] + accrued[operationsTreasury] + accrued[rewardReserveTreasury]
            + accrued[randomnessTreasury];
    }

    /**
     * @notice Recover an ERC-20 sent here by accident.
     * @dev This contract only ever handles native ETH, so any ERC-20 balance is
     *      stranded by definition and recovering it cannot touch accounted funds.
     */
    function recoverStrandedToken(address token, address to, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
        emit StrandedTokenRecovered(token, to, amount);
    }

    // ------------------------------------------------------------------
    // Fee configuration (timelocked)
    // ------------------------------------------------------------------

    function proposeFeeChange(uint16 protocolFeeBps_, uint16 operationsFeeBps_, uint16 rewardReserveBps_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _validateSplit(protocolFeeBps_, operationsFeeBps_, rewardReserveBps_);

        uint64 executableAt = uint64(block.timestamp + FEE_TIMELOCK);
        pendingFeeChange = PendingFeeChange({
            protocolFeeBps: protocolFeeBps_,
            operationsFeeBps: operationsFeeBps_,
            rewardReserveBps: rewardReserveBps_,
            executableAt: executableAt,
            exists: true
        });

        emit FeeChangeProposed(protocolFeeBps_, operationsFeeBps_, rewardReserveBps_, executableAt);
    }

    function cancelFeeChange() external onlyRole(DEFAULT_ADMIN_ROLE) {
        PendingFeeChange memory pending = pendingFeeChange;
        if (!pending.exists) revert NoPendingFeeChange();

        delete pendingFeeChange;
        emit FeeChangeCancelled(pending.protocolFeeBps, pending.operationsFeeBps, pending.rewardReserveBps);
    }

    function executeFeeChange() external onlyRole(DEFAULT_ADMIN_ROLE) {
        PendingFeeChange memory pending = pendingFeeChange;
        if (!pending.exists) revert NoPendingFeeChange();
        if (block.timestamp < pending.executableAt) revert TimelockNotElapsed(pending.executableAt);

        // Re-validate: the caps are constants, but re-checking keeps the
        // execution path self-contained rather than trusting proposal time.
        _validateSplit(pending.protocolFeeBps, pending.operationsFeeBps, pending.rewardReserveBps);

        activeSplit = FeeSplit({
            protocolFeeBps: pending.protocolFeeBps,
            operationsFeeBps: pending.operationsFeeBps,
            rewardReserveBps: pending.rewardReserveBps
        });
        delete pendingFeeChange;

        emit FeeChangeExecuted(activeSplit.protocolFeeBps, activeSplit.operationsFeeBps, activeSplit.rewardReserveBps);
    }

    function setTreasuries(
        address protocolTreasury_,
        address operationsTreasury_,
        address rewardReserveTreasury_,
        address randomnessTreasury_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (
            protocolTreasury_ == address(0) || operationsTreasury_ == address(0) || rewardReserveTreasury_ == address(0)
                || randomnessTreasury_ == address(0)
        ) revert ZeroAddress();

        // Move any accrued balance with the destination so a treasury rotation
        // never strands funds at the old address.
        _migrateAccrual(protocolTreasury, protocolTreasury_);
        _migrateAccrual(operationsTreasury, operationsTreasury_);
        _migrateAccrual(rewardReserveTreasury, rewardReserveTreasury_);
        _migrateAccrual(randomnessTreasury, randomnessTreasury_);

        protocolTreasury = protocolTreasury_;
        operationsTreasury = operationsTreasury_;
        rewardReserveTreasury = rewardReserveTreasury_;
        randomnessTreasury = randomnessTreasury_;

        emit TreasuriesUpdated(protocolTreasury_, operationsTreasury_, rewardReserveTreasury_, randomnessTreasury_);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    /// @notice The split a new pool version should snapshot.
    function currentSplit() external view returns (uint16 protocolBps, uint16 operationsBps, uint16 rewardBps) {
        FeeSplit memory split = activeSplit;
        return (split.protocolFeeBps, split.operationsFeeBps, split.rewardReserveBps);
    }

    function poolVersionRevenue(uint256 poolId, uint256 version) external view returns (uint256) {
        return baseRevenueByPoolVersion[_poolVersionKey(poolId, version)];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    function _validateSplit(uint16 protocolBps, uint16 operationsBps, uint16 rewardBps) internal pure {
        if (protocolBps > MAX_PROTOCOL_FEE_BPS) revert ProtocolFeeTooHigh(protocolBps);
        if (operationsBps > MAX_OPERATIONS_FEE_BPS) revert OperationsFeeTooHigh(operationsBps);

        uint256 total = uint256(protocolBps) + operationsBps + rewardBps;
        if (total != BPS_DENOMINATOR) revert FeeTotalInvalid(total);
    }

    function _migrateAccrual(address from, address to) internal {
        if (from == to || from == address(0)) return;
        uint256 amount = accrued[from];
        if (amount == 0) return;
        accrued[from] = 0;
        accrued[to] += amount;
    }

    function _poolVersionKey(uint256 poolId, uint256 version) internal pure returns (uint256) {
        return (poolId << 128) | version;
    }
}
