// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/contracts/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title EthereumRobachaRandomnessCoordinator
 * @notice The Ethereum half of ROBACHA's randomness path.
 *
 * Receives a request over CCIP from `RobachaRandomnessSender` on Robinhood Chain,
 * draws one word from Chainlink VRF v2.5, and returns it over CCIP to
 * `RobachaRandomnessReceiver`.
 *
 * @dev This contract does not inherit `VRFConsumerBaseV2Plus` because that base
 *      brings its own `ConfirmedOwner` ownership model, which would sit awkwardly
 *      beside the role model the rest of ROBACHA uses. The consumer callback is
 *      implemented directly with the same guarantee the base provides: only the
 *      configured VRF coordinator may call `rawFulfillRandomWords`.
 *
 *      Validation on the inbound CCIP message:
 *        - `onlyRouter`, from `CCIPReceiver`
 *        - source chain selector matches the configured Robinhood selector
 *        - source sender matches the configured ROBACHA sender
 *        - the CCIP message id has not been seen
 *        - the round has not already been requested
 *
 *      Validation on the VRF callback:
 *        - caller is the configured coordinator
 *        - the VRF request id maps to a known round
 *        - that round has not already been fulfilled
 */
contract EthereumRobachaRandomnessCoordinator is CCIPReceiver, AccessControl, ReentrancyGuard {
    struct PendingRequest {
        uint256 roundId;
        bytes32 robachaRequestId;
        bool fulfilled;
        bool returned;
    }

    // ---- VRF configuration (official Chainlink values, supplied at deploy) ----
    IVRFCoordinatorV2Plus public immutable vrfCoordinator;
    uint256 public vrfSubscriptionId;
    bytes32 public vrfKeyHash;
    uint32 public vrfCallbackGasLimit = 300_000;
    uint16 public vrfRequestConfirmations = 3;

    // ---- Return path over CCIP ----
    IRouterClient public immutable returnRouter;
    uint64 public robinhoodChainSelector;
    address public robinhoodSender;
    address public robinhoodReceiver;
    uint256 public returnGasLimit = 500_000;

    mapping(uint256 vrfRequestId => PendingRequest) public requests;
    mapping(uint256 roundId => uint256 vrfRequestId) public vrfRequestOfRound;
    mapping(bytes32 ccipMessageId => bool seen) public processedMessages;

    uint256 public totalRequested;
    uint256 public totalFulfilled;
    uint256 public totalReturned;

    event RandomnessRequestReceived(
        uint256 indexed roundId, bytes32 indexed robachaRequestId, bytes32 indexed ccipMessageId
    );
    event VRFRequested(uint256 indexed roundId, uint256 indexed vrfRequestId);
    event VRFFulfilled(uint256 indexed roundId, uint256 indexed vrfRequestId, uint256 randomWord);
    event RandomnessReturned(uint256 indexed roundId, bytes32 indexed ccipMessageId, uint256 fee);
    event VRFConfigUpdated(uint256 subscriptionId, bytes32 keyHash, uint32 callbackGasLimit, uint16 confirmations);
    event ReturnPathUpdated(uint64 chainSelector, address sender, address receiver, uint256 gasLimit);
    event ReturnFeesFunded(address indexed from, uint256 amount);
    event ReturnFeesWithdrawn(address indexed to, uint256 amount);

    error ZeroAddress();
    error NotConfigured();
    error OnlyVRFCoordinator(address expected, address received);
    error UnexpectedSourceChain(uint64 expected, uint64 received);
    error UnexpectedSender(address expected, address received);
    error DuplicateMessage(bytes32 messageId);
    error RoundAlreadyRequested(uint256 roundId);
    error UnknownVRFRequest(uint256 vrfRequestId);
    error RequestAlreadyFulfilled(uint256 vrfRequestId);
    error NoRandomWords();
    error InsufficientReturnFee(uint256 required, uint256 available);
    error TransferFailed();
    error ConfirmationsOutOfRange(uint16 confirmations);
    error CallbackGasOutOfRange(uint32 gasLimit);
    error MalformedPayload();

    constructor(address admin, address ccipRouter, address vrfCoordinator_) CCIPReceiver(ccipRouter) {
        if (admin == address(0) || vrfCoordinator_ == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        vrfCoordinator = IVRFCoordinatorV2Plus(vrfCoordinator_);
        returnRouter = IRouterClient(ccipRouter);
    }

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------

    function setVRFConfig(uint256 subscriptionId, bytes32 keyHash, uint32 callbackGasLimit, uint16 confirmations)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // Chainlink's documented bounds for Ethereum mainnet VRF v2.5.
        if (confirmations < 3 || confirmations > 200) revert ConfirmationsOutOfRange(confirmations);
        if (callbackGasLimit < 100_000 || callbackGasLimit > 2_500_000) revert CallbackGasOutOfRange(callbackGasLimit);

        vrfSubscriptionId = subscriptionId;
        vrfKeyHash = keyHash;
        vrfCallbackGasLimit = callbackGasLimit;
        vrfRequestConfirmations = confirmations;

        emit VRFConfigUpdated(subscriptionId, keyHash, callbackGasLimit, confirmations);
    }

    function setReturnPath(uint64 chainSelector, address sender, address receiver, uint256 gasLimit)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (chainSelector == 0 || sender == address(0) || receiver == address(0)) revert ZeroAddress();
        robinhoodChainSelector = chainSelector;
        robinhoodSender = sender;
        robinhoodReceiver = receiver;
        returnGasLimit = gasLimit;
        emit ReturnPathUpdated(chainSelector, sender, receiver, gasLimit);
    }

    /// @notice Top up the native balance used to pay the return CCIP fee.
    function fundReturnFees() external payable {
        emit ReturnFeesFunded(msg.sender, msg.value);
    }

    function withdrawReturnFees(address to, uint256 amount) external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit ReturnFeesWithdrawn(to, amount);
    }

    /**
     * @dev `CCIPReceiver` declares this `pure`, so the combined override must be
     *      `pure` too. `IAccessControl` is therefore checked directly instead of
     *      delegating to `AccessControl.supportsInterface`, which is `view`.
     */
    function supportsInterface(bytes4 interfaceId) public pure override(CCIPReceiver, AccessControl) returns (bool) {
        return CCIPReceiver.supportsInterface(interfaceId) || interfaceId == type(IAccessControl).interfaceId;
    }

    // ------------------------------------------------------------------
    // Inbound: a round wants a word
    // ------------------------------------------------------------------

    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        if (robinhoodChainSelector == 0 || robinhoodSender == address(0) || robinhoodReceiver == address(0)) {
            revert NotConfigured();
        }
        if (vrfSubscriptionId == 0 || vrfKeyHash == bytes32(0)) revert NotConfigured();

        if (message.sourceChainSelector != robinhoodChainSelector) {
            revert UnexpectedSourceChain(robinhoodChainSelector, message.sourceChainSelector);
        }

        if (message.sender.length != 32) revert MalformedPayload();
        address sender = abi.decode(message.sender, (address));
        if (sender != robinhoodSender) revert UnexpectedSender(robinhoodSender, sender);

        if (processedMessages[message.messageId]) revert DuplicateMessage(message.messageId);
        processedMessages[message.messageId] = true;

        if (message.data.length != 64) revert MalformedPayload();
        (uint256 roundId, bytes32 robachaRequestId) = abi.decode(message.data, (uint256, bytes32));

        if (vrfRequestOfRound[roundId] != 0) revert RoundAlreadyRequested(roundId);

        emit RandomnessRequestReceived(roundId, robachaRequestId, message.messageId);

        uint256 vrfRequestId = vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: vrfKeyHash,
                subId: vrfSubscriptionId,
                requestConfirmations: vrfRequestConfirmations,
                callbackGasLimit: vrfCallbackGasLimit,
                numWords: 1,
                // Paid from the LINK-funded subscription rather than in native ETH.
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );

        requests[vrfRequestId] =
            PendingRequest({roundId: roundId, robachaRequestId: robachaRequestId, fulfilled: false, returned: false});
        vrfRequestOfRound[roundId] = vrfRequestId;
        ++totalRequested;

        emit VRFRequested(roundId, vrfRequestId);
    }

    // ------------------------------------------------------------------
    // VRF callback
    // ------------------------------------------------------------------

    /**
     * @notice Chainlink's callback.
     * @dev Named and shaped exactly as `VRFConsumerBaseV2Plus` expects, and
     *      guarded by the same check: only the configured coordinator may call.
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        if (msg.sender != address(vrfCoordinator)) revert OnlyVRFCoordinator(address(vrfCoordinator), msg.sender);
        if (randomWords.length == 0) revert NoRandomWords();

        PendingRequest storage pending = requests[requestId];
        if (pending.robachaRequestId == bytes32(0)) revert UnknownVRFRequest(requestId);
        if (pending.fulfilled) revert RequestAlreadyFulfilled(requestId);

        pending.fulfilled = true;
        ++totalFulfilled;

        emit VRFFulfilled(pending.roundId, requestId, randomWords[0]);

        _returnRandomness(requestId, randomWords[0]);
    }

    /**
     * @notice Re-send a word whose return message failed.
     * @dev The word itself is not re-drawn — it is read back from the stored
     *      request, so a retry can never change a round's outcome. It exists
     *      only for the case where the return CCIP send reverted on fee balance.
     */
    function retryReturn(uint256 requestId, uint256 randomWord) external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        PendingRequest storage pending = requests[requestId];
        if (pending.robachaRequestId == bytes32(0)) revert UnknownVRFRequest(requestId);
        if (!pending.fulfilled) revert UnknownVRFRequest(requestId);
        if (pending.returned) revert RequestAlreadyFulfilled(requestId);
        _returnRandomness(requestId, randomWord);
    }

    function _returnRandomness(uint256 requestId, uint256 randomWord) internal {
        PendingRequest storage pending = requests[requestId];

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(robinhoodReceiver),
            data: abi.encode(pending.roundId, pending.robachaRequestId, randomWord),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            feeToken: address(0),
            extraArgs: Client._argsToBytes(
                Client.GenericExtraArgsV2({gasLimit: returnGasLimit, allowOutOfOrderExecution: true})
            )
        });

        uint256 fee = returnRouter.getFee(robinhoodChainSelector, message);
        if (fee > address(this).balance) revert InsufficientReturnFee(fee, address(this).balance);

        pending.returned = true;
        ++totalReturned;

        bytes32 messageId = returnRouter.ccipSend{value: fee}(robinhoodChainSelector, message);
        emit RandomnessReturned(pending.roundId, messageId, fee);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    /// @notice Whether this side is fully configured and funded to serve a request.
    function isReady() external view returns (bool ready, string memory reason) {
        if (vrfSubscriptionId == 0 || vrfKeyHash == bytes32(0)) return (false, "vrf not configured");
        if (robinhoodChainSelector == 0 || robinhoodReceiver == address(0)) return (false, "return path not configured");
        if (!returnRouter.isChainSupported(robinhoodChainSelector)) return (false, "return ccip lane unsupported");
        if (address(this).balance == 0) return (false, "return ccip fee balance empty");
        return (true, "");
    }
}
