// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IRobachaRandomnessConsumer} from "../interfaces/IRobachaRandomness.sol";

/**
 * @title RobachaRandomnessReceiver
 * @notice The Robinhood Chain endpoint that accepts a VRF word returning from
 *         Ethereum and hands it to the gacha.
 *
 * @dev Every layer of the delivery path is checked before the word is accepted:
 *
 *      1. `onlyRouter` (from `CCIPReceiver`) — only the CCIP router may call.
 *      2. Source chain selector must be the configured Ethereum selector.
 *      3. Source sender must be the configured ROBACHA coordinator, decoded from
 *         the message rather than trusted from calldata.
 *      4. The CCIP message id must not have been seen before.
 *      5. The round must not already have been fulfilled here.
 *
 *      Only after all five does it call the gacha, which applies its own check
 *      that the request id matches the one the round is waiting on. A message
 *      from an unexpected source, a duplicate delivery and a replayed message
 *      are each rejected on their own merits.
 */
contract RobachaRandomnessReceiver is CCIPReceiver, AccessControl {
    /// @notice CCIP selector of the chain the coordinator lives on.
    uint64 public sourceChainSelector;

    /// @notice The ROBACHA coordinator contract on the source chain.
    address public sourceCoordinator;

    /// @notice The gacha this receiver delivers to.
    IRobachaRandomnessConsumer public gacha;

    /// @notice CCIP message ids already processed.
    mapping(bytes32 messageId => bool seen) public processedMessages;

    /// @notice Rounds already fulfilled through this receiver.
    mapping(uint256 roundId => bool fulfilled) public fulfilledRounds;

    uint256 public totalDelivered;

    event SourceUpdated(uint64 chainSelector, address coordinator);
    event GachaUpdated(address indexed gacha);
    event RandomnessDelivered(
        uint256 indexed roundId, bytes32 indexed requestId, bytes32 indexed ccipMessageId, uint256 randomWord
    );
    event UnexpectedMessageRejected(bytes32 indexed ccipMessageId, uint64 sourceChainSelector, address sender);

    error ZeroAddress();
    error NotConfigured();
    error UnexpectedSourceChain(uint64 expected, uint64 received);
    error UnexpectedSender(address expected, address received);
    error DuplicateMessage(bytes32 messageId);
    error RoundAlreadyFulfilled(uint256 roundId);
    error MalformedPayload();

    constructor(address admin, address router) CCIPReceiver(router) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setSource(uint64 chainSelector, address coordinator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (coordinator == address(0) || chainSelector == 0) revert ZeroAddress();
        sourceChainSelector = chainSelector;
        sourceCoordinator = coordinator;
        emit SourceUpdated(chainSelector, coordinator);
    }

    function setGacha(IRobachaRandomnessConsumer gacha_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(gacha_) == address(0)) revert ZeroAddress();
        gacha = gacha_;
        emit GachaUpdated(address(gacha_));
    }

    /**
     * @dev `CCIPReceiver` declares this `pure`, so the combined override must be
     *      `pure` too. `IAccessControl` is therefore checked directly instead of
     *      delegating to `AccessControl.supportsInterface`, which is `view`.
     */
    function supportsInterface(bytes4 interfaceId) public pure override(CCIPReceiver, AccessControl) returns (bool) {
        return CCIPReceiver.supportsInterface(interfaceId) || interfaceId == type(IAccessControl).interfaceId;
    }

    /// @dev Reached only through the router; `CCIPReceiver.ccipReceive` enforces that.
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        if (sourceChainSelector == 0 || sourceCoordinator == address(0) || address(gacha) == address(0)) {
            revert NotConfigured();
        }

        if (message.sourceChainSelector != sourceChainSelector) {
            revert UnexpectedSourceChain(sourceChainSelector, message.sourceChainSelector);
        }

        if (message.sender.length != 32) revert MalformedPayload();
        address sender = abi.decode(message.sender, (address));
        if (sender != sourceCoordinator) revert UnexpectedSender(sourceCoordinator, sender);

        if (processedMessages[message.messageId]) revert DuplicateMessage(message.messageId);
        processedMessages[message.messageId] = true;

        if (message.data.length != 96) revert MalformedPayload();
        (uint256 roundId, bytes32 requestId, uint256 randomWord) =
            abi.decode(message.data, (uint256, bytes32, uint256));

        if (fulfilledRounds[roundId]) revert RoundAlreadyFulfilled(roundId);
        fulfilledRounds[roundId] = true;
        ++totalDelivered;

        gacha.fulfillRandomness(roundId, requestId, randomWord);

        emit RandomnessDelivered(roundId, requestId, message.messageId, randomWord);
    }
}
