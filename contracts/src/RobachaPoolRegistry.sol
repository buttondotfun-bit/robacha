// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {RobachaRewardVault} from "./RobachaRewardVault.sol";
import {RobachaFeeRouter} from "./RobachaFeeRouter.sol";
import {RobachaRoles} from "./RobachaRoles.sol";

/**
 * @title RobachaPoolRegistry
 * @notice Owns pool definitions and their versions, and enforces the rule that
 *         a pool's economics cannot change once it has taken a paid spin.
 *
 * @dev A "pool version" is the unit of immutability. Editing a live pool is not
 *      a permitted operation — the operator creates a new version instead. The
 *      lock is set by the gacha contract on the first paid entry, so it cannot
 *      be side-stepped by an administrator.
 *
 *      What is frozen at lock time:
 *        - the tier probabilities and their ordering
 *        - the reward slots, their tier assignment and their amount ranges
 *        - the base spin price and the randomness surcharge
 *        - the fee split snapshot
 *        - the round size and duration
 *
 *      What remains operable after lock: activation, pausing and closing. Those
 *      change availability, never economics.
 */
contract RobachaPoolRegistry is AccessControl {
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Upper bound on reward slots per version, to keep settlement bounded.
    uint256 public constant MAX_REWARDS_PER_VERSION = 64;

    /// @notice Upper bound on tiers per version.
    uint256 public constant MAX_TIERS = 8;

    /// @notice Hard ceiling on entries settled by a single randomness word.
    uint16 public constant MAX_ENTRIES_PER_ROUND_LIMIT = 100;

    /// @notice Hard ceiling on how long a round may stay open.
    uint32 public constant MAX_ROUND_DURATION = 1 hours;

    struct RewardSlot {
        address token;
        uint8 tierIndex;
        uint256 minAmount;
        uint256 maxAmount;
    }

    struct PoolVersion {
        uint256 poolId;
        uint256 version;
        string name;
        // Economics
        uint256 baseSpinPriceWei;
        uint256 randomnessSurchargeWei;
        uint16 protocolFeeBps;
        uint16 operationsFeeBps;
        uint16 rewardReserveBps;
        // Round shape
        uint16 maxEntriesPerRound;
        uint32 roundDuration;
        uint16 maxQuantityPerTx;
        uint16 maxQuantityPerWallet; // 0 = unlimited
        // Lifecycle
        uint64 startTime;
        uint64 endTime; // 0 = open-ended
        bool active;
        bool closed;
        uint64 lockedAt; // set on first paid spin; 0 while editable
        bool configured; // true once probabilities and rewards are set
    }

    /// @notice Next pool id to be issued.
    uint256 public nextPoolId = 1;

    /// @notice Latest version number issued per pool.
    mapping(uint256 poolId => uint256 version) public latestVersion;

    /// @notice The version currently activated for a pool, 0 when none.
    mapping(uint256 poolId => uint256 version) public activeVersion;

    mapping(uint256 poolId => mapping(uint256 version => PoolVersion)) private _versions;
    mapping(uint256 poolId => mapping(uint256 version => uint16[])) private _tierProbabilityBps;
    mapping(uint256 poolId => mapping(uint256 version => RewardSlot[])) private _rewards;

    /// @notice Tokens an operator has explicitly approved for use as rewards.
    mapping(address token => bool allowed) public allowlistedTokens;

    RobachaRewardVault public immutable vault;
    RobachaFeeRouter public immutable feeRouter;

    /// @notice The gacha contract permitted to lock a version.
    address public gacha;

    event PoolCreated(uint256 indexed poolId, uint256 indexed version, string name);
    event PoolVersionCreated(uint256 indexed poolId, uint256 indexed version, string name);
    event PoolEconomicsSet(
        uint256 indexed poolId,
        uint256 indexed version,
        uint256 baseSpinPriceWei,
        uint256 randomnessSurchargeWei,
        uint16 protocolFeeBps,
        uint16 operationsFeeBps,
        uint16 rewardReserveBps
    );
    event PoolRoundConfigSet(
        uint256 indexed poolId,
        uint256 indexed version,
        uint16 maxEntriesPerRound,
        uint32 roundDuration,
        uint16 maxQuantityPerTx,
        uint16 maxQuantityPerWallet
    );
    event PoolProbabilitiesSet(uint256 indexed poolId, uint256 indexed version, uint16[] probabilityBps);
    event PoolRewardAdded(
        uint256 indexed poolId,
        uint256 indexed version,
        uint256 slotIndex,
        address indexed token,
        uint8 tierIndex,
        uint256 minAmount,
        uint256 maxAmount
    );
    event PoolActivated(uint256 indexed poolId, uint256 indexed version, uint64 startTime, uint64 endTime);
    event PoolDeactivated(uint256 indexed poolId, uint256 indexed version);
    event PoolClosed(uint256 indexed poolId, uint256 indexed version);
    event PoolLocked(uint256 indexed poolId, uint256 indexed version, uint64 lockedAt);
    event TokenAllowlisted(address indexed token, bool allowed);
    event GachaUpdated(address indexed gacha);

    error ZeroAddress();
    error UnknownPoolVersion(uint256 poolId, uint256 version);
    error PoolLockedCannotEdit(uint256 poolId, uint256 version);
    error PoolAlreadyActive(uint256 poolId, uint256 version);
    error PoolNotConfigured(uint256 poolId, uint256 version);
    error PoolClosedAlready(uint256 poolId, uint256 version);
    error ProbabilityTotalInvalid(uint256 total);
    error TooManyTiers(uint256 count);
    error TooManyRewards(uint256 count);
    error TierIndexOutOfRange(uint8 tierIndex, uint256 tierCount);
    error TokenNotAllowlisted(address token);
    error InvalidAmountRange(uint256 minAmount, uint256 maxAmount);
    error TierHasNoRewards(uint8 tierIndex);
    error InsufficientInventory(address token, uint256 required, uint256 available);
    error VaultUnhealthy(address token);
    error RoundConfigInvalid();
    error NotGacha();
    error SpinPriceZero();
    error TokenMetadataUnreadable(address token);
    error VersionMismatch(uint256 expected, uint256 provided);

    constructor(address admin, RobachaRewardVault vault_, RobachaFeeRouter feeRouter_) {
        if (admin == address(0) || address(vault_) == address(0) || address(feeRouter_) == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RobachaRoles.POOL_MANAGER_ROLE, admin);
        vault = vault_;
        feeRouter = feeRouter_;
    }

    // ------------------------------------------------------------------
    // Wiring
    // ------------------------------------------------------------------

    function setGacha(address gacha_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (gacha_ == address(0)) revert ZeroAddress();
        gacha = gacha_;
        emit GachaUpdated(gacha_);
    }

    /**
     * @notice Approve or revoke a token for use as reward inventory.
     * @dev Revoking does not affect an already-locked version; that version's
     *      reward definitions are immutable by design.
     */
    function setTokenAllowlisted(address token, bool allowed) external onlyRole(RobachaRoles.POOL_MANAGER_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        if (allowed) {
            // Reading metadata proves the address is a live ERC-20 rather than
            // an EOA or an unrelated contract.
            try IERC20Metadata(token).decimals() returns (uint8) {}
            catch {
                revert TokenMetadataUnreadable(token);
            }
        }
        allowlistedTokens[token] = allowed;
        emit TokenAllowlisted(token, allowed);
    }

    // ------------------------------------------------------------------
    // Authoring
    // ------------------------------------------------------------------

    /// @notice Create a brand-new pool at version 1.
    function createPool(string calldata name) external onlyRole(RobachaRoles.POOL_MANAGER_ROLE) returns (uint256 poolId) {
        poolId = nextPoolId++;
        _createVersion(poolId, 1, name);
        emit PoolCreated(poolId, 1, name);
    }

    /**
     * @notice Create the next version of an existing pool.
     * @dev This is the only way to change the economics of a pool that has
     *      already sold spins.
     */
    function createPoolVersion(uint256 poolId, string calldata name)
        external
        onlyRole(RobachaRoles.POOL_MANAGER_ROLE)
        returns (uint256 version)
    {
        if (latestVersion[poolId] == 0) revert UnknownPoolVersion(poolId, 0);
        version = latestVersion[poolId] + 1;
        _createVersion(poolId, version, name);
    }

    function setEconomics(
        uint256 poolId,
        uint256 version,
        uint256 baseSpinPriceWei,
        uint256 randomnessSurchargeWei
    ) external onlyRole(RobachaRoles.POOL_MANAGER_ROLE) {
        PoolVersion storage pv = _editable(poolId, version);
        if (baseSpinPriceWei == 0) revert SpinPriceZero();

        // The split is snapshotted here, so a later fee change cannot alter the
        // economics of this version.
        (uint16 protocolBps, uint16 operationsBps, uint16 rewardBps) = feeRouter.currentSplit();

        pv.baseSpinPriceWei = baseSpinPriceWei;
        pv.randomnessSurchargeWei = randomnessSurchargeWei;
        pv.protocolFeeBps = protocolBps;
        pv.operationsFeeBps = operationsBps;
        pv.rewardReserveBps = rewardBps;

        emit PoolEconomicsSet(
            poolId, version, baseSpinPriceWei, randomnessSurchargeWei, protocolBps, operationsBps, rewardBps
        );
    }

    function setRoundConfig(
        uint256 poolId,
        uint256 version,
        uint16 maxEntriesPerRound,
        uint32 roundDuration,
        uint16 maxQuantityPerTx,
        uint16 maxQuantityPerWallet
    ) external onlyRole(RobachaRoles.POOL_MANAGER_ROLE) {
        PoolVersion storage pv = _editable(poolId, version);
        if (
            maxEntriesPerRound == 0 || maxEntriesPerRound > MAX_ENTRIES_PER_ROUND_LIMIT || roundDuration == 0
                || roundDuration > MAX_ROUND_DURATION || maxQuantityPerTx == 0 || maxQuantityPerTx > maxEntriesPerRound
        ) revert RoundConfigInvalid();

        pv.maxEntriesPerRound = maxEntriesPerRound;
        pv.roundDuration = roundDuration;
        pv.maxQuantityPerTx = maxQuantityPerTx;
        pv.maxQuantityPerWallet = maxQuantityPerWallet;

        emit PoolRoundConfigSet(poolId, version, maxEntriesPerRound, roundDuration, maxQuantityPerTx, maxQuantityPerWallet);
    }

    /**
     * @notice Set the tier probabilities. They must total exactly 10,000 bps.
     * @dev Replacing probabilities clears the reward slots, because a slot's
     *      tier index is only meaningful against a given tier list.
     */
    function setProbabilities(uint256 poolId, uint256 version, uint16[] calldata probabilityBps)
        external
        onlyRole(RobachaRoles.POOL_MANAGER_ROLE)
    {
        PoolVersion storage pv = _editable(poolId, version);
        if (probabilityBps.length == 0 || probabilityBps.length > MAX_TIERS) {
            revert TooManyTiers(probabilityBps.length);
        }

        uint256 total;
        for (uint256 i = 0; i < probabilityBps.length; ++i) {
            total += probabilityBps[i];
        }
        if (total != BPS_DENOMINATOR) revert ProbabilityTotalInvalid(total);

        delete _tierProbabilityBps[poolId][version];
        for (uint256 i = 0; i < probabilityBps.length; ++i) {
            _tierProbabilityBps[poolId][version].push(probabilityBps[i]);
        }
        delete _rewards[poolId][version];
        pv.configured = false;

        emit PoolProbabilitiesSet(poolId, version, probabilityBps);
    }

    function addReward(uint256 poolId, uint256 version, address token, uint8 tierIndex, uint256 minAmount, uint256 maxAmount)
        external
        onlyRole(RobachaRoles.POOL_MANAGER_ROLE)
    {
        PoolVersion storage pv = _editable(poolId, version);

        uint256 tierCount = _tierProbabilityBps[poolId][version].length;
        if (tierIndex >= tierCount) revert TierIndexOutOfRange(tierIndex, tierCount);
        if (!allowlistedTokens[token]) revert TokenNotAllowlisted(token);
        if (minAmount == 0 || maxAmount < minAmount) revert InvalidAmountRange(minAmount, maxAmount);

        RewardSlot[] storage slots = _rewards[poolId][version];
        if (slots.length >= MAX_REWARDS_PER_VERSION) revert TooManyRewards(slots.length);

        slots.push(RewardSlot({token: token, tierIndex: tierIndex, minAmount: minAmount, maxAmount: maxAmount}));
        pv.configured = _everyTierHasRewards(poolId, version);

        emit PoolRewardAdded(poolId, version, slots.length - 1, token, tierIndex, minAmount, maxAmount);
    }

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    /**
     * @notice Activate a version for paid spins.
     * @dev Runs the on-chain half of the launch validator. The off-chain half
     *      (market data, liquidity, indexer health) is checked by the admin
     *      application before this is ever called; both must pass.
     */
    function activate(uint256 poolId, uint256 version, uint64 startTime, uint64 endTime)
        external
        onlyRole(RobachaRoles.POOL_MANAGER_ROLE)
    {
        PoolVersion storage pv = _requireVersion(poolId, version);
        if (pv.active) revert PoolAlreadyActive(poolId, version);
        if (pv.closed) revert PoolClosedAlready(poolId, version);
        if (!pv.configured) revert PoolNotConfigured(poolId, version);
        if (pv.baseSpinPriceWei == 0) revert SpinPriceZero();
        if (pv.maxEntriesPerRound == 0 || pv.roundDuration == 0) revert RoundConfigInvalid();

        _requireProbabilitiesValid(poolId, version);
        _requireSolvent(poolId, version);

        // Deactivate whichever version was live for this pool.
        uint256 previous = activeVersion[poolId];
        if (previous != 0 && previous != version) {
            _versions[poolId][previous].active = false;
            emit PoolDeactivated(poolId, previous);
        }

        pv.active = true;
        pv.startTime = startTime == 0 ? uint64(block.timestamp) : startTime;
        pv.endTime = endTime;
        activeVersion[poolId] = version;

        emit PoolActivated(poolId, version, pv.startTime, endTime);
    }

    function deactivate(uint256 poolId, uint256 version) external onlyRole(RobachaRoles.POOL_MANAGER_ROLE) {
        PoolVersion storage pv = _requireVersion(poolId, version);
        pv.active = false;
        if (activeVersion[poolId] == version) activeVersion[poolId] = 0;
        emit PoolDeactivated(poolId, version);
    }

    /// @notice Permanently close a version. Assigned rewards stay claimable.
    function close(uint256 poolId, uint256 version) external onlyRole(RobachaRoles.POOL_MANAGER_ROLE) {
        PoolVersion storage pv = _requireVersion(poolId, version);
        pv.active = false;
        pv.closed = true;
        if (activeVersion[poolId] == version) activeVersion[poolId] = 0;
        emit PoolClosed(poolId, version);
    }

    /**
     * @notice Freeze a version's economics. Called by the gacha on the first
     *         paid entry and by nothing else.
     */
    function lock(uint256 poolId, uint256 version) external {
        if (msg.sender != gacha) revert NotGacha();
        PoolVersion storage pv = _requireVersion(poolId, version);
        if (pv.lockedAt != 0) return;
        pv.lockedAt = uint64(block.timestamp);
        emit PoolLocked(poolId, version, pv.lockedAt);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getVersion(uint256 poolId, uint256 version) external view returns (PoolVersion memory) {
        return _requireVersionView(poolId, version);
    }

    function getProbabilities(uint256 poolId, uint256 version) external view returns (uint16[] memory) {
        return _tierProbabilityBps[poolId][version];
    }

    function getRewards(uint256 poolId, uint256 version) external view returns (RewardSlot[] memory) {
        return _rewards[poolId][version];
    }

    function rewardCount(uint256 poolId, uint256 version) external view returns (uint256) {
        return _rewards[poolId][version].length;
    }

    function getReward(uint256 poolId, uint256 version, uint256 index) external view returns (RewardSlot memory) {
        return _rewards[poolId][version][index];
    }

    /// @notice The version a spin would enter right now, or (0,0) if none.
    function currentPoolVersion(uint256 poolId) external view returns (uint256 version, bool open) {
        version = activeVersion[poolId];
        if (version == 0) return (0, false);
        PoolVersion storage pv = _versions[poolId][version];
        open = pv.active && !pv.closed && block.timestamp >= pv.startTime
            && (pv.endTime == 0 || block.timestamp < pv.endTime);
    }

    /**
     * @notice The on-chain activation checks, exposed for the admin UI so the
     *         operator sees exactly what would fail before sending a transaction.
     */
    function activationReadiness(uint256 poolId, uint256 version)
        external
        view
        returns (
            bool configured,
            bool probabilitiesValid,
            bool roundConfigValid,
            bool priceSet,
            bool inventorySolvent,
            address firstUnfundedToken
        )
    {
        PoolVersion storage pv = _versions[poolId][version];
        configured = pv.configured;
        priceSet = pv.baseSpinPriceWei != 0;
        roundConfigValid = pv.maxEntriesPerRound != 0 && pv.roundDuration != 0;

        uint16[] storage probabilities = _tierProbabilityBps[poolId][version];
        uint256 total;
        for (uint256 i = 0; i < probabilities.length; ++i) {
            total += probabilities[i];
        }
        probabilitiesValid = probabilities.length != 0 && total == BPS_DENOMINATOR;

        inventorySolvent = true;
        RewardSlot[] storage slots = _rewards[poolId][version];
        for (uint256 i = 0; i < slots.length; ++i) {
            if (vault.available(slots[i].token) < slots[i].maxAmount || !vault.isSolvent(slots[i].token)) {
                inventorySolvent = false;
                firstUnfundedToken = slots[i].token;
                break;
            }
        }
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    function _createVersion(uint256 poolId, uint256 version, string calldata name) internal {
        PoolVersion storage pv = _versions[poolId][version];
        pv.poolId = poolId;
        pv.version = version;
        pv.name = name;
        latestVersion[poolId] = version;
        emit PoolVersionCreated(poolId, version, name);
    }

    function _requireVersion(uint256 poolId, uint256 version) internal view returns (PoolVersion storage pv) {
        pv = _versions[poolId][version];
        if (pv.version != version || version == 0) revert UnknownPoolVersion(poolId, version);
    }

    function _requireVersionView(uint256 poolId, uint256 version) internal view returns (PoolVersion memory) {
        PoolVersion memory pv = _versions[poolId][version];
        if (pv.version != version || version == 0) revert UnknownPoolVersion(poolId, version);
        return pv;
    }

    /// @dev A version may only be edited before its first paid spin.
    function _editable(uint256 poolId, uint256 version) internal view returns (PoolVersion storage pv) {
        pv = _requireVersion(poolId, version);
        if (pv.lockedAt != 0) revert PoolLockedCannotEdit(poolId, version);
        if (pv.active) revert PoolAlreadyActive(poolId, version);
    }

    function _requireProbabilitiesValid(uint256 poolId, uint256 version) internal view {
        uint16[] storage probabilities = _tierProbabilityBps[poolId][version];
        if (probabilities.length == 0 || probabilities.length > MAX_TIERS) revert TooManyTiers(probabilities.length);

        uint256 total;
        for (uint256 i = 0; i < probabilities.length; ++i) {
            total += probabilities[i];
        }
        if (total != BPS_DENOMINATOR) revert ProbabilityTotalInvalid(total);
    }

    /**
     * @dev Every tier with non-zero probability must have at least one reward
     *      slot, otherwise a draw could land on a tier with nothing to give.
     */
    function _everyTierHasRewards(uint256 poolId, uint256 version) internal view returns (bool) {
        uint16[] storage probabilities = _tierProbabilityBps[poolId][version];
        RewardSlot[] storage slots = _rewards[poolId][version];
        if (probabilities.length == 0 || slots.length == 0) return false;

        for (uint256 tier = 0; tier < probabilities.length; ++tier) {
            if (probabilities[tier] == 0) continue;
            bool found;
            for (uint256 i = 0; i < slots.length; ++i) {
                if (slots[i].tierIndex == tier) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    /**
     * @dev Every reward slot must be funded to at least its own maximum, so any
     *      single winning draw is payable at the moment of activation.
     */
    function _requireSolvent(uint256 poolId, uint256 version) internal view {
        RewardSlot[] storage slots = _rewards[poolId][version];
        for (uint256 i = 0; i < slots.length; ++i) {
            address token = slots[i].token;
            if (!vault.isSolvent(token)) revert VaultUnhealthy(token);
            uint256 free = vault.available(token);
            if (free < slots[i].maxAmount) revert InsufficientInventory(token, slots[i].maxAmount, free);
        }
    }
}
