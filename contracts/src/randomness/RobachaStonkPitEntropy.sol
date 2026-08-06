// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {RobachaRoles} from "../RobachaRoles.sol";
import {IRobachaRandomnessSender} from "../interfaces/IRobachaRandomness.sol";

interface IMultiConductor {
    /// @notice Live dynamic quote for one word on the ETH lane.
    function requestFee() external view returns (uint256);
    /// @notice The sealed ceiling. Size every float against this, never the quote.
    function maxRequestFee() external view returns (uint256);
    /// @notice Zero live tapes means a request would revert.
    function liveTapeCount() external view returns (uint256);
    /// @notice Buy a word folded from the next `nPrints` certified prints.
    function request(uint256 nPrints, bytes32 seed) external payable returns (uint256 requestId);
    /// @notice Reclaim the fee for a request still undetermined after the timeout.
    function cancel(uint256 requestId) external;
    /// @notice How long a request must sit undetermined before it can be cancelled.
    function CANCEL_TIMEOUT() external view returns (uint256);
}

interface IGachaConsumer {
    function fulfillRandomness(uint256 roundId, bytes32 requestId, uint256 randomWord) external;
}

/**
 * @title RobachaStonkPitEntropy
 * @notice Buys round randomness from StonkPit's MultiConductor.
 *
 * @dev WHY THIS EXISTS AS AN ADAPTER
 *
 * The gacha reaches its randomness through `IRobachaRandomnessSender` and the
 * pointer is admin-settable, so a source can be replaced without redeploying
 * the gacha, re-permissioning the vault, or stranding a single unclaimed
 * reward. Everything specific to StonkPit is therefore contained here.
 *
 * WHY IT HOLDS A FLOAT, AND WHY THAT IS THE WHOLE PROBLEM
 *
 * The gacha sends at most what the round itself collected in surcharges:
 * `min(fee, surchargePerEntry * entries)`. A round holds at most five entries,
 * so at 0.0001 per entry it can contribute at most 0.0005 — while the
 * conductor's ceiling plus a keeper tip is 0.0006. A round short of seats, or
 * any round at all once the fee drifts up, would underpay, the request would
 * revert, and the round would sit until it timed out and refunded everyone.
 * Systematically refunding paying players is a worse failure than not shipping
 * this.
 *
 * So this contract makes up the difference out of a float. That is Bones' ante
 * pool, and their guide documents exactly how it bit them: a fixed per-seat
 * ante sized against a fee that later rose, draining quietly until the table
 * could not open a round. Three things are done differently here.
 *
 *   1. Readiness is measured against `maxRequestFee()`, never the spot quote,
 *      and against the *worst* case round — one single entry — rather than a
 *      full one. A float that can only serve full rounds is not ready.
 *   2. `isReady` fails closed and the gacha refuses to sell spins when it
 *      returns false. Running dry stops new rounds being sold; it does not
 *      sell rounds that will later refund.
 *   3. Topping up is permissionless, so the float can never be held hostage by
 *      whoever holds the admin key being asleep.
 *
 * ON TRUST, STATED PLAINLY
 *
 * These words are sealed by real mining work and economically secured. They
 * are not VRF. Whoever orders the chain's transactions can pick between
 * outcomes that real work produced, though never author one. That is StonkPit's
 * own description and it is a genuine weakening against a VRF: it replaces
 * "the operator could stall a round" with "the sequencer could choose between
 * real outcomes". Neither is nothing. What bounds the second is that the value
 * at risk in one round stays small, which is true here — a round holds at most
 * five entries and every prize is capped at a quarter of its token's vault
 * inventory.
 */
contract RobachaStonkPitEntropy is IRobachaRandomnessSender, AccessControl, ReentrancyGuard {
    IMultiConductor public immutable conductor;
    address public immutable gacha;

    /**
     * @notice How many certified prints each word folds.
     * @dev Their standards floor is 3; 4 is what their own dice table uses and
     *      more prints means more work behind one word.
     */
    /// @dev uint256, not uint8: their published cheat-sheet says uint8, the
    ///      deployed contract's own ABI says uint256, and the chain wins.
    uint256 public constant N_PRINTS = 4;

    /**
     * @notice Margin held on top of the fee, over and above what a request costs.
     *
     * @dev Nobody is paid this, despite the name. Miners take their tip out of
     *      the conductor's own fee when they call `fulfillAsMiner`, so nothing
     *      here is owed to anyone and this figure only ever makes the float
     *      look smaller than it is. StonkPit's review called the name
     *      misleading and they were right.
     *
     *      It stays because the effect is wanted even if the label was wrong:
     *      it is headroom against the fee moving between a spin being sold and
     *      its round being served, on top of the five-round runway. Renaming it
     *      would change the deployed ABI for no behavioural gain, so the
     *      correction lives here until the next redeploy.
     */
    uint256 public keeperTip = 0.0001 ether;

    /**
     * @notice Rounds of runway the float must hold to report itself ready.
     *
     * @dev One would be literally accurate — a request with that much really
     *      would succeed — and would still be the wrong answer. Readiness is
     *      not asked for its own sake: the gacha refuses to sell spins while it
     *      is false, so a float covering exactly one more round keeps the
     *      machine open right up to the moment it shuts, with no interval in
     *      which anyone could notice and top it up.
     *
     *      Five gives that interval. It closes the machine early, on purpose,
     *      while there is still enough to serve several rounds, so the failure
     *      shows up as runway trending down rather than as a machine that was
     *      fine and then was not.
     */
    uint256 public constant MIN_RUNWAY_ROUNDS = 5;

    /// @notice roundId by conductor requestId, and the reverse.
    mapping(uint256 conductorRequestId => uint256 roundId) public roundOf;
    mapping(uint256 roundId => uint256 conductorRequestId) public requestOf;
    mapping(uint256 roundId => bool delivered) public delivered;

    /// @notice Rounds whose fee has already been reclaimed from the conductor.
    mapping(uint256 roundId => bool reclaimed) public reclaimed;

    event RandomnessBought(uint256 indexed roundId, uint256 indexed requestId, uint256 feePaid, uint256 fromFloat);
    event RandomnessDelivered(uint256 indexed roundId, uint256 indexed requestId, uint256 word);
    event FloatFunded(address indexed from, uint256 amount, uint256 total);
    event FloatWithdrawn(address indexed to, uint256 amount);
    event KeeperTipUpdated(uint256 tip);
    event StrandedRequestReclaimed(uint256 indexed roundId, uint256 indexed requestId, uint256 recovered);

    error NotGacha();
    error NotConductor();
    error ZeroAddress();
    error AlreadyRequested(uint256 roundId);
    error AlreadyDelivered(uint256 roundId);
    error UnknownRequest(uint256 requestId);
    error FloatTooThin(uint256 held, uint256 needed);
    error TransferFailed();
    error NothingToReclaim(uint256 roundId);
    error AlreadyReclaimed(uint256 roundId);

    constructor(address admin, address conductor_, address gacha_) {
        if (admin == address(0) || conductor_ == address(0) || gacha_ == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        conductor = IMultiConductor(conductor_);
        gacha = gacha_;
    }

    /// @notice Anyone may top the float up. Deliberately permissionless.
    receive() external payable {
        emit FloatFunded(msg.sender, msg.value, address(this).balance);
    }

    function fundFloat() external payable {
        emit FloatFunded(msg.sender, msg.value, address(this).balance);
    }

    // ------------------------------------------------------------- requesting

    /**
     * @notice Buy one word for `roundId`.
     * @dev The gacha forwards whatever the round collected, which is usually
     *      less than the fee. The shortfall comes out of the float, and the
     *      float is what this contract exists to manage.
     */
    function requestRandomness(uint256 roundId) external payable override returns (bytes32) {
        if (msg.sender != gacha) revert NotGacha();
        if (requestOf[roundId] != 0) revert AlreadyRequested(roundId);

        uint256 fee = conductor.requestFee();
        uint256 available = address(this).balance; // msg.value is already in here
        if (available < fee + keeperTip) revert FloatTooThin(available, fee + keeperTip);

        uint256 fromFloat = msg.value >= fee ? 0 : fee - msg.value;

        // Domain-separated so two rounds can never present the same seed, and
        // so the seed cannot be steered by anything a player controls.
        bytes32 seed = keccak256(abi.encode(block.chainid, address(this), gacha, roundId));

        uint256 requestId = conductor.request{value: fee}(N_PRINTS, seed);

        roundOf[requestId] = roundId;
        requestOf[roundId] = requestId;

        emit RandomnessBought(roundId, requestId, fee, fromFloat);
        return bytes32(requestId);
    }

    /**
     * @notice The conductor's callback.
     * @dev Gas-capped by the conductor, so it stays cheap and does exactly one
     *      thing. Authenticating the caller is the load-bearing line: without
     *      it anyone could deliver a word of their choosing and settle a round
     *      with it.
     */
    function rawFulfillEntropy(uint256 requestId, bytes32 word) external {
        if (msg.sender != address(conductor)) revert NotConductor();

        uint256 roundId = roundOf[requestId];
        if (roundId == 0) revert UnknownRequest(requestId);
        if (delivered[roundId]) revert AlreadyDelivered(roundId);
        delivered[roundId] = true;

        IGachaConsumer(gacha).fulfillRandomness(roundId, bytes32(requestId), uint256(word));
        emit RandomnessDelivered(roundId, requestId, uint256(word));
    }

    /**
     * @notice Reclaim the fee for a request the conductor never determined.
     *
     * @dev Players are never waiting on this. A round whose word does not
     *      arrive becomes refundable after the gacha's own two hour timeout and
     *      everyone is repaid; the conductor will not release the fee for
     *      forty-eight. So the only thing stranded in between is our money, and
     *      this is what goes and gets it.
     *
     *      Permissionless, and the recovered ETH lands in the float rather than
     *      anywhere a caller could choose. There is nothing to gain by calling
     *      it and no reason to make the float wait on an administrator being
     *      awake — the same reasoning as `fundFloat`.
     *
     *      Every real precondition is the conductor's to enforce: that the
     *      request exists, is still undetermined, belongs to us, and is past
     *      its timeout. Re-checking them here would only be a second copy to
     *      drift. What is checked is what only this contract knows: that the
     *      word never reached us, and that the fee has not already been taken
     *      back.
     */
    function reclaimStrandedRequest(uint256 roundId) external nonReentrant returns (uint256 recovered) {
        uint256 requestId = requestOf[roundId];
        if (requestId == 0) revert NothingToReclaim(roundId);
        if (delivered[roundId]) revert NothingToReclaim(roundId);
        if (reclaimed[roundId]) revert AlreadyReclaimed(roundId);

        reclaimed[roundId] = true;

        uint256 before = address(this).balance;
        conductor.cancel(requestId);
        recovered = address(this).balance - before;

        emit StrandedRequestReclaimed(roundId, requestId, recovered);
    }

    /// @notice When a stranded request becomes reclaimable, per the conductor.
    function cancelTimeout() external view returns (uint256) {
        return conductor.CANCEL_TIMEOUT();
    }

    // -------------------------------------------------------------- readiness

    /**
     * @notice Whether a request would currently succeed.
     * @dev Measured against the ceiling and the worst case round, not the spot
     *      quote and a full one. The gacha refuses to sell spins while this is
     *      false, so an honest "not ready" closes the machine for a few minutes
     *      whereas an optimistic "ready" sells rounds that cannot settle and
     *      refunds them hours later.
     */
    function isReady() external view override returns (bool ready, string memory reason) {
        if (conductor.liveTapeCount() == 0) return (false, "No live entropy tapes on the mining floor");

        // Against the ceiling rather than the live quote, and against several
        // rounds rather than the next one. The fee moves between a spin being
        // sold and its round being served, so a float sized to today's quote is
        // sized to the wrong number.
        uint256 needed = (conductor.maxRequestFee() + keeperTip) * MIN_RUNWAY_ROUNDS;
        if (address(this).balance < needed) return (false, "Entropy float too thin to guarantee a round");

        return (true, "");
    }

    /// @notice What the gacha should forward. The spot quote, capped at nothing.
    function estimateRequestFee() external view override returns (uint256) {
        return conductor.requestFee();
    }

    /// @notice Rounds the float can still guarantee at the fee ceiling.
    function runwayRounds() external view returns (uint256) {
        uint256 perRound = conductor.maxRequestFee() + keeperTip;
        if (perRound == 0) return type(uint256).max;
        return address(this).balance / perRound;
    }

    // ------------------------------------------------------------------ admin

    function setKeeperTip(uint256 tip) external onlyRole(DEFAULT_ADMIN_ROLE) {
        keeperTip = tip;
        emit KeeperTipUpdated(tip);
    }

    function withdrawFloat(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit FloatWithdrawn(to, amount);
    }
}
