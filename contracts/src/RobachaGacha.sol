// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {RobachaFeeRouter} from "./RobachaFeeRouter.sol";
import {RobachaPoolRegistry} from "./RobachaPoolRegistry.sol";
import {RobachaRewardVault} from "./RobachaRewardVault.sol";
import {RobachaRoles} from "./RobachaRoles.sol";
import {IRobachaRandomnessConsumer, IRobachaRandomnessSender} from "./interfaces/IRobachaRandomness.sol";

/**
 * @title RobachaGacha
 * @notice Sells spin entries into batched rounds and settles them against a
 *         single verifiable random word.
 *
 * The shape of a round:
 *
 *   1. `spin` escrows the full payment and appends entries to the open round.
 *      No reward is chosen here, and nothing is routed to a treasury yet.
 *   2. The round closes when it is full or its window ends. After that no entry
 *      can be added — the entry list a random word settles is fixed before the
 *      word is ever requested.
 *   3. `requestRoundRandomness` asks the randomness sender for one word.
 *   4. `fulfillRandomness` stores the word. Only the authorised receiver may
 *      call it, and only once per round.
 *   5. `settleEntries` derives each entry's own value from the word by
 *      domain-separated hashing, assigns a reward and reserves it in the vault.
 *      Settlement is batched so a large round can never exceed the block limit.
 *   6. Once every entry is settled the round's escrow is routed to the fee
 *      router using the fee split snapshotted on the pool version.
 *
 * Failure is handled explicitly rather than by an operator picking a result. If
 * the word does not arrive before the timeout the round becomes refundable and
 * every participant can withdraw. An administrator cannot supply a word, cannot
 * replace one, and cannot choose a reward.
 */
contract RobachaGacha is AccessControl, Pausable, ReentrancyGuard, IRobachaRandomnessConsumer {
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Floor on the randomness timeout, so it can never trap a user for long.
    uint32 public constant MIN_RANDOMNESS_TIMEOUT = 10 minutes;
    /// @notice Ceiling on the randomness timeout.
    uint32 public constant MAX_RANDOMNESS_TIMEOUT = 24 hours;

    /**
     * @notice Round lifecycle.
     *
     * @dev `CrossChainPending` is set when the sender confirms a CCIP message
     *      was dispatched. `VRFPending` and `ResultReturning` are Ethereum-side
     *      conditions this chain cannot observe — they are never set here, and
     *      the indexer derives them from the Ethereum coordinator's own events.
     *      They exist in this enum so the on-chain and off-chain models share
     *      one vocabulary.
     */
    enum RoundState {
        None,
        Open,
        Closed,
        RandomnessRequested,
        CrossChainPending,
        VRFPending,
        ResultReturning,
        RandomnessReceived,
        Settled,
        Failed,
        Refundable,
        Cancelled
    }

    struct Round {
        uint256 poolId;
        uint256 version;
        uint64 openedAt;
        uint64 closesAt;
        uint64 closedAt;
        uint64 randomnessRequestedAt;
        RoundState state;
        uint16 entryCount;
        uint16 settledCount;
        uint16 refundedCount;
        uint256 baseSpinPriceWei;
        uint256 randomnessSurchargeWei;
        bytes32 requestId;
        uint256 randomWord;
        /// @notice Escrowed wei still attributable to this round.
        uint256 escrowWei;
    }

    struct Entry {
        address user;
        bool settled;
        bool refunded;
        uint256 rewardId; // 0 when no reward was assigned
    }

    struct Reward {
        uint256 rewardId;
        uint256 roundId;
        uint256 entryIndex;
        address user;
        address token;
        uint256 amount;
        uint8 tierIndex;
        bool claimed;
    }

    RobachaPoolRegistry public immutable registry;
    RobachaRewardVault public immutable vault;
    RobachaFeeRouter public immutable feeRouter;

    /// @notice The randomness sender. Spins are impossible while unset.
    IRobachaRandomnessSender public randomnessSender;

    /// @notice The only address permitted to deliver a random word.
    address public randomnessReceiver;

    /// @notice How long after closing a round may wait before becoming refundable.
    uint32 public randomnessTimeout = 2 hours;

    uint256 public nextRoundId = 1;
    uint256 public nextRewardId = 1;

    mapping(uint256 roundId => Round) private _rounds;
    mapping(uint256 roundId => Entry[]) private _entries;
    mapping(uint256 rewardId => Reward) private _rewards;
    mapping(address user => uint256[] rewardIds) private _rewardsByUser;

    /// @notice The open round for a pool version, 0 when none.
    mapping(uint256 poolVersionKey => uint256 roundId) public openRoundOf;

    /// @notice Entries a wallet has bought on a pool version, for per-wallet caps.
    mapping(uint256 poolVersionKey => mapping(address user => uint256 count)) public entriesByWallet;

    /// @notice Refundable wei owed to a wallet.
    mapping(address user => uint256 amount) public refundable;

    /// @notice Wei escrowed in rounds that have not settled or been refunded.
    uint256 public totalEscrow;

    /// @notice Wei owed to users as refunds and not yet withdrawn.
    uint256 public totalRefundable;

    event RoundOpened(uint256 indexed roundId, uint256 indexed poolId, uint256 indexed version, uint64 closesAt);
    event SpinEntered(
        uint256 indexed roundId,
        address indexed user,
        uint256 firstEntryIndex,
        uint16 quantity,
        uint256 baseAmount,
        uint256 surchargeAmount
    );
    event RoundClosed(uint256 indexed roundId, uint16 entryCount, uint64 closedAt);
    event RandomnessRequested(uint256 indexed roundId, bytes32 indexed requestId, uint64 requestedAt);
    event RandomnessReceived(uint256 indexed roundId, bytes32 indexed requestId);
    event RewardAssigned(
        uint256 indexed rewardId,
        uint256 indexed roundId,
        address indexed user,
        uint256 entryIndex,
        address token,
        uint256 amount,
        uint8 tierIndex
    );
    event EntryUnfunded(uint256 indexed roundId, uint256 entryIndex, address indexed user, uint256 refundWei);
    event RoundSettled(uint256 indexed roundId, uint256 routedBaseWei, uint256 routedSurchargeWei, uint16 refundedEntries);
    event RoundRefundable(uint256 indexed roundId, string reason);
    event RoundCancelled(uint256 indexed roundId);
    event SpinRefunded(address indexed user, uint256 amount);
    event RewardClaimed(uint256 indexed rewardId, address indexed user, address indexed token, uint256 amount);
    event RandomnessSenderUpdated(address indexed sender);
    event RandomnessReceiverUpdated(address indexed receiver);
    event RandomnessTimeoutUpdated(uint32 timeout);

    error ZeroAddress();
    error RandomnessUnavailable();
    error PoolUnavailable(uint256 poolId);
    error QuantityInvalid(uint16 quantity);
    error QuantityExceedsRound(uint16 quantity, uint16 remaining);
    error WalletCapExceeded(uint256 held, uint16 cap);
    error IncorrectPayment(uint256 expected, uint256 received);
    error RoundNotFound(uint256 roundId);
    error RoundNotOpen(uint256 roundId);
    error RoundStillOpen(uint256 roundId);
    error RoundNotClosed(uint256 roundId);
    error RoundAlreadyRequested(uint256 roundId);
    error RoundHasNoEntries(uint256 roundId);
    error NotRandomnessReceiver();
    error NotRandomnessSender();
    error RandomnessAlreadyDelivered(uint256 roundId);
    error RequestIdMismatch(bytes32 expected, bytes32 received);
    error NothingToSettle(uint256 roundId);
    error TimeoutNotElapsed(uint256 roundId, uint64 refundableAt);
    error NothingRefundable();
    error TransferFailed();
    error RewardNotFound(uint256 rewardId);
    error NotRewardOwner(uint256 rewardId);
    error RewardAlreadyClaimed(uint256 rewardId);
    error TimeoutOutOfRange(uint32 timeout);

    constructor(address admin, RobachaPoolRegistry registry_, RobachaRewardVault vault_, RobachaFeeRouter feeRouter_) {
        if (
            admin == address(0) || address(registry_) == address(0) || address(vault_) == address(0)
                || address(feeRouter_) == address(0)
        ) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RobachaRoles.PAUSER_ROLE, admin);

        registry = registry_;
        vault = vault_;
        feeRouter = feeRouter_;
    }

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------

    function setRandomnessSender(IRobachaRandomnessSender sender) external onlyRole(DEFAULT_ADMIN_ROLE) {
        randomnessSender = sender;
        emit RandomnessSenderUpdated(address(sender));
    }

    function setRandomnessReceiver(address receiver) external onlyRole(DEFAULT_ADMIN_ROLE) {
        randomnessReceiver = receiver;
        emit RandomnessReceiverUpdated(receiver);
    }

    function setRandomnessTimeout(uint32 timeout) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (timeout < MIN_RANDOMNESS_TIMEOUT || timeout > MAX_RANDOMNESS_TIMEOUT) revert TimeoutOutOfRange(timeout);
        randomnessTimeout = timeout;
        emit RandomnessTimeoutUpdated(timeout);
    }

    function pause() external onlyRole(RobachaRoles.PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(RobachaRoles.PAUSER_ROLE) {
        _unpause();
    }

    // ------------------------------------------------------------------
    // Spinning
    // ------------------------------------------------------------------

    /**
     * @notice Buy `quantity` entries in the current round of `poolId`.
     * @dev Escrows the full payment. No reward is chosen here — the caller
     *      cannot influence the outcome, because the outcome does not exist yet.
     */
    function spin(uint256 poolId, uint16 quantity) external payable nonReentrant whenNotPaused {
        if (quantity == 0) revert QuantityInvalid(quantity);

        (uint256 version, bool open) = registry.currentPoolVersion(poolId);
        if (!open) revert PoolUnavailable(poolId);

        (bool ready,) = _randomnessReady();
        if (!ready) revert RandomnessUnavailable();

        RobachaPoolRegistry.PoolVersion memory pv = registry.getVersion(poolId, version);
        if (quantity > pv.maxQuantityPerTx) revert QuantityInvalid(quantity);

        uint256 key = _poolVersionKey(poolId, version);

        if (pv.maxQuantityPerWallet != 0) {
            uint256 held = entriesByWallet[key][msg.sender] + quantity;
            if (held > pv.maxQuantityPerWallet) revert WalletCapExceeded(held, pv.maxQuantityPerWallet);
        }

        uint256 baseAmount = pv.baseSpinPriceWei * quantity;
        uint256 surchargeAmount = pv.randomnessSurchargeWei * quantity;
        uint256 total = baseAmount + surchargeAmount;
        if (msg.value != total) revert IncorrectPayment(total, msg.value);

        uint256 roundId = _currentOpenRound(poolId, version, pv, key, quantity);
        Round storage round = _rounds[roundId];

        // `_currentOpenRound` guarantees the quantity fits, because a purchase
        // larger than the remaining capacity starts a fresh round rather than
        // being rejected. `maxQuantityPerTx <= maxEntriesPerRound` is enforced
        // by the registry, so a fresh round can always hold the whole purchase.
        uint16 remaining = pv.maxEntriesPerRound - round.entryCount;
        if (quantity > remaining) revert QuantityExceedsRound(quantity, remaining);

        // The first paid entry freezes this version's economics for good.
        registry.lock(poolId, version);

        uint256 firstIndex = _entries[roundId].length;
        for (uint16 i = 0; i < quantity; ++i) {
            _entries[roundId].push(Entry({user: msg.sender, settled: false, refunded: false, rewardId: 0}));
        }

        round.entryCount += quantity;
        round.escrowWei += total;
        totalEscrow += total;
        entriesByWallet[key][msg.sender] += quantity;

        emit SpinEntered(roundId, msg.sender, firstIndex, quantity, baseAmount, surchargeAmount);

        // Close immediately when the round is now full, so the entry set is
        // fixed the moment it can no longer grow.
        if (round.entryCount == pv.maxEntriesPerRound) {
            _closeRound(roundId, key);
        }
    }

    /// @notice Close a round whose window has elapsed. Callable by anyone.
    function closeRound(uint256 roundId) external nonReentrant {
        Round storage round = _rounds[roundId];
        if (round.state != RoundState.Open) revert RoundNotOpen(roundId);
        if (block.timestamp < round.closesAt) revert RoundStillOpen(roundId);
        _closeRound(roundId, _poolVersionKey(round.poolId, round.version));
    }

    /**
     * @notice Ask the randomness sender for this round's word.
     * @dev Permissionless: the request is not a privileged action, and leaving
     *      it open means a round cannot be stranded by an operator failing to
     *      act. The CCIP fee is paid from the surcharge the round escrowed.
     */
    function requestRoundRandomness(uint256 roundId) external nonReentrant {
        Round storage round = _rounds[roundId];
        if (round.state == RoundState.None) revert RoundNotFound(roundId);
        if (round.state != RoundState.Closed) revert RoundNotClosed(roundId);
        if (round.requestId != bytes32(0)) revert RoundAlreadyRequested(roundId);
        if (round.entryCount == 0) revert RoundHasNoEntries(roundId);

        IRobachaRandomnessSender sender = randomnessSender;
        if (address(sender) == address(0)) revert RandomnessUnavailable();

        uint256 fee = sender.estimateRequestFee();
        uint256 surchargePot = round.randomnessSurchargeWei * round.entryCount;
        // The surcharge exists to pay this fee. Never spend more than the round
        // itself escrowed, so one round can never consume another's funds.
        uint256 spend = fee <= surchargePot ? fee : surchargePot;

        round.state = RoundState.RandomnessRequested;
        round.randomnessRequestedAt = uint64(block.timestamp);
        round.escrowWei -= spend;
        totalEscrow -= spend;

        bytes32 requestId = sender.requestRandomness{value: spend}(roundId);
        round.requestId = requestId;

        emit RandomnessRequested(roundId, requestId, uint64(block.timestamp));
    }

    /// @notice Record that the CCIP message for a round is in flight.
    function markCrossChainPending(uint256 roundId) external {
        if (msg.sender != address(randomnessSender)) revert NotRandomnessSender();
        Round storage round = _rounds[roundId];
        if (round.state == RoundState.RandomnessRequested) {
            round.state = RoundState.CrossChainPending;
        }
    }

    // ------------------------------------------------------------------
    // Randomness delivery and settlement
    // ------------------------------------------------------------------

    /// @inheritdoc IRobachaRandomnessConsumer
    function fulfillRandomness(uint256 roundId, bytes32 requestId, uint256 randomWord) external {
        if (randomnessReceiver == address(0) || msg.sender != randomnessReceiver) revert NotRandomnessReceiver();

        Round storage round = _rounds[roundId];
        if (round.state == RoundState.None) revert RoundNotFound(roundId);
        if (
            round.state != RoundState.RandomnessRequested && round.state != RoundState.CrossChainPending
                && round.state != RoundState.Closed
        ) revert RandomnessAlreadyDelivered(roundId);
        if (round.requestId != requestId) revert RequestIdMismatch(round.requestId, requestId);

        round.randomWord = randomWord;
        round.state = RoundState.RandomnessReceived;

        emit RandomnessReceived(roundId, requestId);
    }

    /**
     * @notice Settle up to `maxEntries` entries of a fulfilled round.
     * @dev Batched so a full round cannot exceed the block gas limit, and
     *      permissionless so settlement never depends on an operator.
     */
    function settleEntries(uint256 roundId, uint16 maxEntries) external nonReentrant {
        Round storage round = _rounds[roundId];
        if (round.state != RoundState.RandomnessReceived) revert NothingToSettle(roundId);
        if (maxEntries == 0) revert NothingToSettle(roundId);

        uint16 from = round.settledCount;
        uint16 to = from + maxEntries;
        if (to > round.entryCount) to = round.entryCount;
        if (to == from) revert NothingToSettle(roundId);

        uint256 poolId = round.poolId;
        uint256 version = round.version;
        uint256 randomWord = round.randomWord;

        // Read the reward table once for the whole batch.
        RobachaPoolRegistry.RewardSlot[] memory slots = registry.getRewards(poolId, version);
        uint16[] memory probabilities = registry.getProbabilities(poolId, version);

        Entry[] storage entries = _entries[roundId];
        uint16 newlyRefunded;

        for (uint16 index = from; index < to; ++index) {
            Entry storage entry = entries[index];
            if (entry.settled) continue;
            entry.settled = true;

            bytes32 seed =
                keccak256(abi.encode(randomWord, block.chainid, poolId, version, roundId, index, entry.user));

            (bool assigned, address token, uint256 amount, uint8 tierIndex) = _draw(seed, slots, probabilities);

            if (!assigned) {
                // Nothing in the pool can pay this entry. It is refunded in full
                // rather than substituted with a smaller reward.
                uint256 owed = round.baseSpinPriceWei + round.randomnessSurchargeWei;
                if (owed > round.escrowWei) owed = round.escrowWei;
                entry.refunded = true;
                ++newlyRefunded;
                round.escrowWei -= owed;
                totalEscrow -= owed;
                refundable[entry.user] += owed;
                totalRefundable += owed;
                emit EntryUnfunded(roundId, index, entry.user, owed);
                continue;
            }

            vault.reserve(token, amount);

            uint256 rewardId = nextRewardId++;
            _rewards[rewardId] = Reward({
                rewardId: rewardId,
                roundId: roundId,
                entryIndex: index,
                user: entry.user,
                token: token,
                amount: amount,
                tierIndex: tierIndex,
                claimed: false
            });
            _rewardsByUser[entry.user].push(rewardId);
            entry.rewardId = rewardId;

            emit RewardAssigned(rewardId, roundId, entry.user, index, token, amount, tierIndex);
        }

        round.settledCount = to;
        round.refundedCount += newlyRefunded;

        if (to == round.entryCount) {
            _finaliseRound(roundId);
        }
    }

    /**
     * @notice Mark a round refundable because randomness never arrived.
     * @dev Permissionless and time-gated. No administrator can trigger it early
     *      and none can substitute a result instead.
     */
    function markRoundRefundable(uint256 roundId) external nonReentrant {
        Round storage round = _rounds[roundId];
        if (round.state == RoundState.None) revert RoundNotFound(roundId);
        if (
            round.state != RoundState.Closed && round.state != RoundState.RandomnessRequested
                && round.state != RoundState.CrossChainPending
        ) revert NothingToSettle(roundId);

        uint64 refundableAt = round.closedAt + randomnessTimeout;
        if (block.timestamp < refundableAt) revert TimeoutNotElapsed(roundId, refundableAt);

        _makeRefundable(roundId, "randomness timeout");
    }

    /// @notice Withdraw everything owed to the caller from refunded entries.
    function withdrawRefund() external nonReentrant {
        uint256 amount = refundable[msg.sender];
        if (amount == 0) revert NothingRefundable();

        refundable[msg.sender] = 0;
        totalRefundable -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit SpinRefunded(msg.sender, amount);
    }

    // ------------------------------------------------------------------
    // Claiming
    // ------------------------------------------------------------------

    function claim(uint256 rewardId) external nonReentrant {
        _claim(rewardId);
    }

    function claimMany(uint256[] calldata rewardIds) external nonReentrant {
        for (uint256 i = 0; i < rewardIds.length; ++i) {
            _claim(rewardIds[i]);
        }
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getRound(uint256 roundId) external view returns (Round memory) {
        return _rounds[roundId];
    }

    function getEntry(uint256 roundId, uint256 index) external view returns (Entry memory) {
        return _entries[roundId][index];
    }

    function entryCount(uint256 roundId) external view returns (uint256) {
        return _entries[roundId].length;
    }

    function getReward(uint256 rewardId) external view returns (Reward memory) {
        return _rewards[rewardId];
    }

    function rewardsOf(address user) external view returns (uint256[] memory) {
        return _rewardsByUser[user];
    }

    /// @notice The open round for a pool, or 0 when the pool has none right now.
    function openRound(uint256 poolId) external view returns (uint256) {
        (uint256 version,) = registry.currentPoolVersion(poolId);
        if (version == 0) return 0;
        return openRoundOf[_poolVersionKey(poolId, version)];
    }

    /**
     * @notice Everything the interface needs to decide whether a spin is
     *         possible, and to say precisely why when it is not.
     */
    function spinReadiness(uint256 poolId)
        external
        view
        returns (
            bool ready,
            bool poolOpen,
            bool notPaused,
            bool randomnessAvailable,
            uint256 version,
            uint256 baseSpinPriceWei,
            uint256 randomnessSurchargeWei,
            string memory randomnessReason
        )
    {
        (version, poolOpen) = registry.currentPoolVersion(poolId);
        notPaused = !paused();
        (randomnessAvailable, randomnessReason) = _randomnessReady();

        if (version != 0) {
            RobachaPoolRegistry.PoolVersion memory pv = registry.getVersion(poolId, version);
            baseSpinPriceWei = pv.baseSpinPriceWei;
            randomnessSurchargeWei = pv.randomnessSurchargeWei;
        }

        ready = poolOpen && notPaused && randomnessAvailable && baseSpinPriceWei != 0;
    }

    /// @notice Total price for `quantity` entries, split for disclosure.
    function quote(uint256 poolId, uint16 quantity)
        external
        view
        returns (uint256 baseAmount, uint256 surchargeAmount, uint256 total)
    {
        (uint256 version,) = registry.currentPoolVersion(poolId);
        if (version == 0) return (0, 0, 0);
        RobachaPoolRegistry.PoolVersion memory pv = registry.getVersion(poolId, version);
        baseAmount = pv.baseSpinPriceWei * quantity;
        surchargeAmount = pv.randomnessSurchargeWei * quantity;
        total = baseAmount + surchargeAmount;
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    function _claim(uint256 rewardId) internal {
        Reward storage reward = _rewards[rewardId];
        if (reward.rewardId == 0) revert RewardNotFound(rewardId);
        if (reward.user != msg.sender) revert NotRewardOwner(rewardId);
        if (reward.claimed) revert RewardAlreadyClaimed(rewardId);

        reward.claimed = true;
        vault.pay(reward.token, msg.sender, reward.amount);

        emit RewardClaimed(rewardId, msg.sender, reward.token, reward.amount);
    }

    function _randomnessReady() internal view returns (bool ready, string memory reason) {
        IRobachaRandomnessSender sender = randomnessSender;
        if (address(sender) == address(0)) return (false, "randomness sender not configured");
        if (randomnessReceiver == address(0)) return (false, "randomness receiver not configured");
        return sender.isReady();
    }

    function _currentOpenRound(
        uint256 poolId,
        uint256 version,
        RobachaPoolRegistry.PoolVersion memory pv,
        uint256 key,
        uint16 quantity
    ) internal returns (uint256 roundId) {
        roundId = openRoundOf[key];

        if (roundId != 0) {
            Round storage existing = _rounds[roundId];
            bool expired = block.timestamp >= existing.closesAt;
            // A purchase that will not fit in what is left of the open round
            // closes it and starts a new one, rather than reverting and making
            // the user guess how many entries the round has room for.
            bool fits = pv.maxEntriesPerRound - existing.entryCount >= quantity;
            if (existing.state == RoundState.Open && !expired && fits) {
                return roundId;
            }
            if (existing.state == RoundState.Open) {
                _closeRound(roundId, key);
            }
        }

        roundId = nextRoundId++;
        uint64 closesAt = uint64(block.timestamp + pv.roundDuration);

        Round storage round = _rounds[roundId];
        round.poolId = poolId;
        round.version = version;
        round.openedAt = uint64(block.timestamp);
        round.closesAt = closesAt;
        round.state = RoundState.Open;
        round.baseSpinPriceWei = pv.baseSpinPriceWei;
        round.randomnessSurchargeWei = pv.randomnessSurchargeWei;

        openRoundOf[key] = roundId;
        emit RoundOpened(roundId, poolId, version, closesAt);
    }

    function _closeRound(uint256 roundId, uint256 key) internal {
        Round storage round = _rounds[roundId];
        round.state = RoundState.Closed;
        round.closedAt = uint64(block.timestamp);
        if (openRoundOf[key] == roundId) openRoundOf[key] = 0;

        emit RoundClosed(roundId, round.entryCount, round.closedAt);

        // A round that closed with no entries has nothing to settle or refund.
        if (round.entryCount == 0) {
            round.state = RoundState.Cancelled;
            emit RoundCancelled(roundId);
        }
    }

    /**
     * @dev Derive one entry's result from the round's word.
     *
     *      Three independent values are taken from the seed by domain-separated
     *      hashing, so the tier, the slot within that tier and the amount are
     *      uncorrelated. The seed already binds the chain id, pool, version,
     *      round, entry index and the entrant's address, so no two entries can
     *      share a derived value even within one round.
     */
    function _draw(bytes32 seed, RobachaPoolRegistry.RewardSlot[] memory slots, uint16[] memory probabilities)
        internal
        view
        returns (bool assigned, address token, uint256 amount, uint8 tierIndex)
    {
        uint256 tierRoll = uint256(keccak256(abi.encode(seed, "robacha.tier"))) % BPS_DENOMINATOR;

        uint256 cumulative;
        uint8 chosenTier;
        for (uint8 i = 0; i < probabilities.length; ++i) {
            cumulative += probabilities[i];
            if (tierRoll < cumulative) {
                chosenTier = i;
                break;
            }
        }

        uint256 slotRoll = uint256(keccak256(abi.encode(seed, "robacha.slot")));
        uint256 amountRoll = uint256(keccak256(abi.encode(seed, "robacha.amount")));

        // Try the drawn tier first, then the remaining tiers in a deterministic
        // order, so an exhausted tier degrades predictably instead of silently
        // upgrading the entry.
        for (uint8 offset = 0; offset < probabilities.length; ++offset) {
            uint8 tier = uint8((uint256(chosenTier) + offset) % probabilities.length);
            (bool ok, address t, uint256 a) = _drawFromTier(slots, tier, slotRoll, amountRoll);
            if (ok) return (true, t, a, tier);
        }

        return (false, address(0), 0, chosenTier);
    }

    function _drawFromTier(
        RobachaPoolRegistry.RewardSlot[] memory slots,
        uint8 tier,
        uint256 slotRoll,
        uint256 amountRoll
    ) internal view returns (bool ok, address token, uint256 amount) {
        uint256 count;
        for (uint256 i = 0; i < slots.length; ++i) {
            if (slots[i].tierIndex == tier) ++count;
        }
        if (count == 0) return (false, address(0), 0);

        uint256 start = slotRoll % count;

        // Walk this tier's slots from a random start, so an exhausted slot falls
        // through to another slot of the same rarity rather than another tier.
        for (uint256 step = 0; step < count; ++step) {
            uint256 target = (start + step) % count;
            uint256 slotIndex = _nthSlotOfTier(slots, tier, target);
            RobachaPoolRegistry.RewardSlot memory slot = slots[slotIndex];

            uint256 span = slot.maxAmount - slot.minAmount + 1;
            uint256 candidate = slot.minAmount + (amountRoll % span);
            uint256 free = vault.available(slot.token);

            if (free >= candidate) return (true, slot.token, candidate);
            if (free >= slot.minAmount) return (true, slot.token, slot.minAmount);
        }

        return (false, address(0), 0);
    }

    function _nthSlotOfTier(RobachaPoolRegistry.RewardSlot[] memory slots, uint8 tier, uint256 n)
        internal
        pure
        returns (uint256)
    {
        uint256 seen;
        for (uint256 i = 0; i < slots.length; ++i) {
            if (slots[i].tierIndex != tier) continue;
            if (seen == n) return i;
            ++seen;
        }
        // Unreachable: callers only pass `n` below the tier's slot count.
        return slots.length;
    }

    function _finaliseRound(uint256 roundId) internal {
        Round storage round = _rounds[roundId];

        // Refunded entries already had their share moved out of the escrow, so
        // whatever is left belongs to the entries that were actually paid: the
        // base take, plus whatever surcharge the randomness request did not use.
        uint256 escrow = round.escrowWei;
        uint16 paidCount = round.entryCount - round.refundedCount;

        uint256 routedBase = round.baseSpinPriceWei * paidCount;
        if (routedBase > escrow) routedBase = escrow;
        uint256 routedSurcharge = escrow - routedBase;

        round.escrowWei = 0;
        totalEscrow -= escrow;
        round.state = RoundState.Settled;

        uint256 routed = routedBase + routedSurcharge;
        if (routed != 0) {
            RobachaPoolRegistry.PoolVersion memory pv = registry.getVersion(round.poolId, round.version);
            feeRouter.routeSettlement{value: routed}(
                round.poolId,
                round.version,
                roundId,
                routedBase,
                routedSurcharge,
                pv.protocolFeeBps,
                pv.operationsFeeBps,
                pv.rewardReserveBps
            );
        }

        emit RoundSettled(roundId, routedBase, routedSurcharge, round.refundedCount);
    }

    function _makeRefundable(uint256 roundId, string memory reason) internal {
        Round storage round = _rounds[roundId];
        Entry[] storage entries = _entries[roundId];

        uint256 escrow = round.escrowWei;
        uint256 outstanding;
        for (uint256 i = 0; i < entries.length; ++i) {
            if (!entries[i].refunded && !entries[i].settled) ++outstanding;
        }

        // The randomness request may already have spent part of the surcharge
        // pot. Splitting what remains evenly means the loss falls equally on
        // every participant rather than on whoever is last in the list; the
        // base price is always covered because the request can only ever be
        // paid out of the surcharge.
        uint256 share = outstanding == 0 ? 0 : escrow / outstanding;
        uint256 remainder = outstanding == 0 ? 0 : escrow % outstanding;
        uint256 released;

        for (uint256 i = 0; i < entries.length; ++i) {
            Entry storage entry = entries[i];
            if (entry.refunded || entry.settled) continue;
            entry.refunded = true;

            uint256 owed = share;
            if (remainder != 0) {
                ++owed;
                --remainder;
            }
            released += owed;
            refundable[entry.user] += owed;
        }

        round.escrowWei = escrow - released;
        round.refundedCount = round.entryCount;
        round.state = RoundState.Refundable;
        totalEscrow -= released;
        totalRefundable += released;

        emit RoundRefundable(roundId, reason);
    }

    function _poolVersionKey(uint256 poolId, uint256 version) internal pure returns (uint256) {
        return (poolId << 128) | version;
    }

    // Deliberately no `receive`: this contract only ever holds user escrow and
    // pending refunds, and a stray transfer would sit outside that accounting.
    // The randomness sender keeps any unspent CCIP fee to cover future requests.
}
