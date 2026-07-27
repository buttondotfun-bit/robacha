// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @notice The randomness source a ROBACHA round asks for a random word.
 *
 * @dev The production implementation is `RobachaRandomnessSender`, which forwards
 *      the request over Chainlink CCIP to an Ethereum coordinator backed by
 *      Chainlink VRF v2.5. The word returns over CCIP to
 *      `RobachaRandomnessReceiver`, which delivers it to the gacha.
 *
 *      None of the following is acceptable as a source, alone or combined:
 *      `block.timestamp`, `block.prevrandao`, `block.difficulty`, `blockhash`,
 *      the L2 block number, user-supplied entropy, an operator-chosen value, or
 *      anything computed off-chain by ROBACHA. Each is either predictable by a
 *      participant or choosable by the operator, which would make a paid draw
 *      unfair. If no compliant source is configured and funded, public paid
 *      spins stay closed — the system never falls back.
 */
interface IRobachaRandomnessSender {
    /**
     * @notice Ask for one random word for `roundId`.
     * @dev MUST revert unless the caller is the authorised gacha contract, and
     *      MUST be idempotent per round: a second request for a round that
     *      already has one in flight must revert.
     * @return requestId An identifier the fulfilment is matched against.
     */
    function requestRandomness(uint256 roundId) external payable returns (bytes32 requestId);

    /**
     * @notice Whether a request would currently succeed.
     * @dev Reports real readiness — router configured, destination coordinator
     *      set, fee funding present. The frontend disables spins when this is
     *      false rather than letting a user pay into a round that cannot settle.
     */
    function isReady() external view returns (bool ready, string memory reason);

    /// @notice Native fee the sender needs for one CCIP request, in wei.
    function estimateRequestFee() external view returns (uint256);
}

/**
 * @notice The consumer side: how a random word reaches the gacha.
 */
interface IRobachaRandomnessConsumer {
    /**
     * @notice Deliver the random word for a round.
     * @dev The implementation MUST reject a second delivery for the same round,
     *      and MUST reject any caller other than the authorised receiver.
     */
    function fulfillRandomness(uint256 roundId, bytes32 requestId, uint256 randomWord) external;
}
