// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {RobachaRoles} from "../RobachaRoles.sol";
import {IRobachaRandomnessSender} from "../interfaces/IRobachaRandomness.sol";

interface IGachaView {
    function getRound(uint256 roundId)
        external
        view
        returns (
            uint256 poolId,
            uint256 version,
            uint64 openedAt,
            uint64 closesAt,
            uint64 closedAt,
            uint64 randomnessRequestedAt,
            uint8 state,
            uint16 entryCount,
            uint16 settledCount,
            uint16 refundedCount,
            uint256 baseSpinPriceWei,
            uint256 randomnessSurchargeWei,
            bytes32 requestId,
            uint256 randomWord,
            uint256 escrowWei
        );

    function getEntry(uint256 roundId, uint256 index)
        external
        view
        returns (address user, bool settled, bool refunded, uint256 rewardId);

    function fulfillRandomness(uint256 roundId, bytes32 requestId, uint256 randomWord) external;
}

/**
 * @title RobachaCommitRevealRandomness
 * @notice Operator-run randomness with the operator's freedom of choice removed
 *         as far as a self-hosted scheme allows.
 *
 * @dev READ THIS BEFORE TRUSTING IT.
 *
 * This is weaker than a decentralised beacon, and the difference is not
 * cosmetic. What it does and does not guarantee:
 *
 *  GUARANTEED — the operator cannot choose the outcome.
 *    A commitment is posted before the round it will serve is even opened, and
 *    `requestRandomness` refuses any commitment posted at or after the round's
 *    `openedAt`. So the secret is fixed before a single entry exists, and the
 *    reveal is checked against it. Publishing a different secret is impossible;
 *    the hash will not match.
 *
 *  GUARANTEED — the operator cannot predict the outcome when committing.
 *    The final seed mixes the committed secret with the addresses that actually
 *    entered. At commit time those are unknown, so the reward layout cannot be
 *    computed in advance and a favourable commitment cannot be shopped for.
 *
 *  NOT GUARANTEED — the operator cannot be stopped from withholding.
 *    After the round closes the operator knows the secret and the entrants, so
 *    they can compute the result before revealing. A result they dislike can be
 *    suppressed by simply never calling `reveal`. This is the irreducible
 *    weakness of any self-hosted commit-reveal, and no amount of contract code
 *    removes it.
 *
 * Three things blunt that last one. Withholding pays nobody: the round times
 * out and every entrant is refunded in full, so the operator gains nothing and
 * forfeits the fees. It costs money: `slashMissedReveal` is permissionless and
 * takes from a bond the operator has posted. And it is counted in public:
 * `totalRevealed` and `totalMissed` are on chain forever, so a pattern of
 * convenient failures is visible to anyone who looks.
 *
 * The interface is unchanged, so this contract is both the sender and the
 * receiver from the gacha's point of view and needs no changes there.
 */
contract RobachaCommitRevealRandomness is AccessControl, ReentrancyGuard, IRobachaRandomnessSender {
    struct Commitment {
        bytes32 hash;
        uint64 postedAt;
        bool used;
    }

    struct Pending {
        bytes32 requestId;
        uint256 commitmentIndex;
        uint64 requestedAt;
        bool revealed;
        bool missed;
    }

    /// @notice FIFO queue of commitments posted ahead of time.
    Commitment[] public commitments;
    /// @notice Index of the next commitment that has not been bound to a round.
    uint256 public nextUnused;

    mapping(uint256 roundId => Pending) public pending;

    address public gacha;

    /// @notice How long after a request the operator has to reveal.
    uint64 public revealWindow = 30 minutes;
    uint64 public constant MIN_REVEAL_WINDOW = 5 minutes;
    uint64 public constant MAX_REVEAL_WINDOW = 6 hours;

    /// @notice Charged to the round and paid to this contract to cover the gas
    ///         of revealing and settling. Not revenue; withdrawable only to
    ///         refill the account that actually sends those transactions.
    uint256 public gasReimbursementWei;

    /// @notice Operator stake, slashable when a reveal is missed.
    uint256 public bond;
    /// @notice Share of the bond taken per missed reveal, in basis points.
    uint16 public slashBps = 1000; // 10%
    uint16 public constant MAX_SLASH_BPS = 5000;

    /// @notice Public honesty record. Neither counter can be reset.
    uint256 public totalRevealed;
    uint256 public totalMissed;

    /// @dev Entries scanned when mixing entrant entropy. Matches the pool's
    ///      `maxEntriesPerRound` ceiling so the loop is bounded.
    uint256 private constant MAX_ENTRY_SCAN = 64;

    event CommitmentsPosted(uint256 fromIndex, uint256 count, uint64 postedAt);
    event RandomnessRequested(uint256 indexed roundId, bytes32 indexed requestId, uint256 commitmentIndex);
    event Revealed(uint256 indexed roundId, bytes32 indexed requestId, uint256 randomWord);
    event RevealMissed(uint256 indexed roundId, uint256 slashed);
    event BondDeposited(uint256 amount, uint256 total);
    event BondWithdrawn(address indexed to, uint256 amount);
    event GachaUpdated(address indexed gacha);
    event RevealWindowUpdated(uint64 window);
    event GasReimbursementUpdated(uint256 amount);
    event SlashBpsUpdated(uint16 bps);
    event ReimbursementWithdrawn(address indexed to, uint256 amount);

    error NotGacha();
    error NoCommitmentAvailable();
    error CommitmentNotOlderThanRound(uint64 postedAt, uint64 roundOpenedAt);
    error RoundAlreadyRequested(uint256 roundId);
    error UnknownRound(uint256 roundId);
    error AlreadyRevealed(uint256 roundId);
    error BadSecret();
    error RevealWindowOpen(uint64 until);
    error RevealWindowClosed(uint64 until);
    error WindowOutOfRange(uint64 window);
    error SlashOutOfRange(uint16 bps);
    error InsufficientBond();
    error TransferFailed();
    error ZeroAddress();

    constructor(address admin, address gacha_) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RobachaRoles.POOL_MANAGER_ROLE, admin);
        gacha = gacha_;
    }

    // ------------------------------------------------------------------
    // Commitments
    // ------------------------------------------------------------------

    /**
     * @notice Post commitments for future rounds.
     * @dev Must be kept ahead of demand. A commitment is only usable by a round
     *      that opened strictly after it was posted, so running the queue dry
     *      stalls randomness rather than weakening it — the failure is visible
     *      and safe, which is the right way round.
     */
    function postCommitments(bytes32[] calldata hashes)
        external
        onlyRole(RobachaRoles.POOL_MANAGER_ROLE)
    {
        uint256 from = commitments.length;
        for (uint256 i = 0; i < hashes.length; ++i) {
            commitments.push(Commitment({hash: hashes[i], postedAt: uint64(block.timestamp), used: false}));
        }
        emit CommitmentsPosted(from, hashes.length, uint64(block.timestamp));
    }

    /// @notice Commitments posted but not yet bound to a round.
    function availableCommitments() public view returns (uint256) {
        return commitments.length - nextUnused;
    }

    // ------------------------------------------------------------------
    // Request (called by the gacha)
    // ------------------------------------------------------------------

    /// @inheritdoc IRobachaRandomnessSender
    function requestRandomness(uint256 roundId)
        external
        payable
        nonReentrant
        returns (bytes32 requestId)
    {
        if (msg.sender != gacha || gacha == address(0)) revert NotGacha();
        if (pending[roundId].requestId != bytes32(0)) revert RoundAlreadyRequested(roundId);

        uint256 index = nextUnused;
        if (index >= commitments.length) revert NoCommitmentAvailable();

        Commitment storage commitment = commitments[index];

        // The heart of the scheme. A commitment may only serve a round that did
        // not exist when it was posted, so the secret cannot have been chosen
        // with any knowledge of that round's entries.
        (,, uint64 openedAt,,,,,,,,,,,,) = IGachaView(gacha).getRound(roundId);
        if (commitment.postedAt >= openedAt) {
            revert CommitmentNotOlderThanRound(commitment.postedAt, openedAt);
        }

        commitment.used = true;
        nextUnused = index + 1;

        requestId = keccak256(abi.encode(block.chainid, address(this), roundId, index));
        pending[roundId] = Pending({
            requestId: requestId,
            commitmentIndex: index,
            requestedAt: uint64(block.timestamp),
            revealed: false,
            missed: false
        });

        emit RandomnessRequested(roundId, requestId, index);
    }

    // ------------------------------------------------------------------
    // Reveal
    // ------------------------------------------------------------------

    /**
     * @notice Reveal the secret for a round and deliver its random word.
     * @dev Permissionless on purpose. The secret is the only thing that gates
     *      this, so whoever holds it can push a round through — including a
     *      user the operator has handed it to. That removes one more reason a
     *      round can sit unsettled.
     */
    function reveal(uint256 roundId, bytes32 secret) external nonReentrant {
        Pending storage p = pending[roundId];
        if (p.requestId == bytes32(0)) revert UnknownRound(roundId);
        if (p.revealed) revert AlreadyRevealed(roundId);

        uint64 deadline = p.requestedAt + revealWindow;
        if (block.timestamp > deadline) revert RevealWindowClosed(deadline);

        if (keccak256(abi.encode(secret)) != commitments[p.commitmentIndex].hash) revert BadSecret();

        p.revealed = true;
        ++totalRevealed;

        uint256 randomWord = uint256(
            keccak256(abi.encode(secret, block.chainid, address(this), roundId, _entrantEntropy(roundId)))
        );

        emit Revealed(roundId, p.requestId, randomWord);
        IGachaView(gacha).fulfillRandomness(roundId, p.requestId, randomWord);
    }

    /**
     * @dev Entropy the operator did not control at commit time.
     *
     * Folds in every entrant address and position. The operator picks the
     * secret before knowing who will enter, so the seed cannot be steered by
     * choosing a commitment — only by refusing to reveal, which is what the
     * bond is for.
     */
    function _entrantEntropy(uint256 roundId) internal view returns (bytes32 entropy) {
        (,,,,,,, uint16 entryCount,,,,,,,) = IGachaView(gacha).getRound(roundId);
        uint256 count = entryCount > MAX_ENTRY_SCAN ? MAX_ENTRY_SCAN : entryCount;
        for (uint256 i = 0; i < count; ++i) {
            (address user,,,) = IGachaView(gacha).getEntry(roundId, i);
            entropy = keccak256(abi.encode(entropy, i, user));
        }
    }

    /**
     * @notice Record a missed reveal and slash the bond.
     * @dev Permissionless. The round is left to the gacha's own refund timeout,
     *      which returns every entrant's payment in full — this call exists to
     *      make the failure expensive and to put it on the public record, not
     *      to move anyone's money.
     */
    function slashMissedReveal(uint256 roundId) external nonReentrant {
        Pending storage p = pending[roundId];
        if (p.requestId == bytes32(0)) revert UnknownRound(roundId);
        if (p.revealed) revert AlreadyRevealed(roundId);
        if (p.missed) revert AlreadyRevealed(roundId);

        uint64 deadline = p.requestedAt + revealWindow;
        if (block.timestamp <= deadline) revert RevealWindowOpen(deadline);

        p.missed = true;
        ++totalMissed;

        uint256 slashed = (bond * slashBps) / 10_000;
        if (slashed > bond) slashed = bond;
        bond -= slashed;

        // Slashed value stays in the contract rather than being paid out, so
        // this can never become an incentive for anyone to race the operator.
        emit RevealMissed(roundId, slashed);
    }

    // ------------------------------------------------------------------
    // Views required by the gacha
    // ------------------------------------------------------------------

    /// @inheritdoc IRobachaRandomnessSender
    function isReady() external view returns (bool ready, string memory reason) {
        if (gacha == address(0)) return (false, "gacha not wired to randomness");
        if (availableCommitments() == 0) return (false, "no randomness commitments available");
        if (bond == 0) return (false, "operator bond not posted");
        return (true, "");
    }

    /// @inheritdoc IRobachaRandomnessSender
    function estimateRequestFee() external view returns (uint256) {
        return gasReimbursementWei;
    }

    /// @notice Everything a third party needs to audit a settled round.
    function auditRound(uint256 roundId)
        external
        view
        returns (bytes32 requestId, bytes32 commitmentHash, uint64 commitmentPostedAt, uint64 requestedAt, bool revealed, bool missed)
    {
        Pending memory p = pending[roundId];
        if (p.requestId == bytes32(0)) revert UnknownRound(roundId);
        Commitment memory c = commitments[p.commitmentIndex];
        return (p.requestId, c.hash, c.postedAt, p.requestedAt, p.revealed, p.missed);
    }

    // ------------------------------------------------------------------
    // Bond and configuration
    // ------------------------------------------------------------------

    function depositBond() external payable {
        bond += msg.value;
        emit BondDeposited(msg.value, bond);
    }

    /**
     * @notice Withdraw from the bond.
     * @dev Cannot touch accumulated gas reimbursement, and leaves the contract
     *      reporting itself unready once the bond is gone, so spins close
     *      rather than running unbonded.
     */
    function withdrawBond(address payable to, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount > bond) revert InsufficientBond();
        bond -= amount;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit BondWithdrawn(to, amount);
    }

    /// @notice Withdraw collected gas reimbursement, never the bond.
    function withdrawReimbursement(address payable to, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (to == address(0)) revert ZeroAddress();
        uint256 available = address(this).balance - bond;
        if (amount > available) revert InsufficientBond();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit ReimbursementWithdrawn(to, amount);
    }

    function setGacha(address gacha_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (gacha_ == address(0)) revert ZeroAddress();
        gacha = gacha_;
        emit GachaUpdated(gacha_);
    }

    function setRevealWindow(uint64 window) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (window < MIN_REVEAL_WINDOW || window > MAX_REVEAL_WINDOW) revert WindowOutOfRange(window);
        revealWindow = window;
        emit RevealWindowUpdated(window);
    }

    function setGasReimbursement(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        gasReimbursementWei = amount;
        emit GasReimbursementUpdated(amount);
    }

    function setSlashBps(uint16 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (bps > MAX_SLASH_BPS) revert SlashOutOfRange(bps);
        slashBps = bps;
        emit SlashBpsUpdated(bps);
    }

    /// @dev Accepts the per-round reimbursement the gacha forwards.
    receive() external payable {}
}
