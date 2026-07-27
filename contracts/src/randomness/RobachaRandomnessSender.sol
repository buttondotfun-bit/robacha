// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {IRobachaRandomnessSender} from "../interfaces/IRobachaRandomness.sol";
import {RobachaRoles} from "../RobachaRoles.sol";

/**
 * @title RobachaRandomnessSender
 * @notice The Robinhood Chain half of the randomness request path.
 *
 * A closed round asks this contract for a word; it sends a CCIP message to the
 * ROBACHA coordinator on Ethereum, which draws from Chainlink VRF v2.5 and sends
 * the result back to `RobachaRandomnessReceiver`.
 *
 * @dev The CCIP fee is paid in the source chain's native token. The gacha
 *      forwards the round's randomness surcharge with the request, and any
 *      surplus stays here to fund later requests — it is never treated as
 *      protocol revenue and `withdrawUnusedFees` is restricted to the treasury
 *      role so it can only ever be recovered deliberately.
 *
 *      `isReady` is what the interface consults before enabling a spin. It
 *      returns false, with a reason, whenever a request would fail: no router,
 *      no destination coordinator, an unsupported lane, or not enough native
 *      balance to cover the fee. Spins stay closed rather than taking payment
 *      into a round that could not settle.
 */
contract RobachaRandomnessSender is AccessControl, ReentrancyGuard, IRobachaRandomnessSender {
    /// @notice Gas the coordinator's `ccipReceive` is allowed on Ethereum.
    uint256 public destinationGasLimit = 500_000;

    IRouterClient public immutable router;

    /// @notice CCIP selector of the chain the coordinator lives on.
    uint64 public destinationChainSelector;

    /// @notice The ROBACHA coordinator contract on the destination chain.
    address public destinationCoordinator;

    /// @notice The gacha contract permitted to request randomness.
    address public gacha;

    /// @notice Round a request belongs to, keyed by our request id.
    mapping(bytes32 requestId => uint256 roundId) public roundOfRequest;
    /// @notice Our request id for a round, once one exists.
    mapping(uint256 roundId => bytes32 requestId) public requestOfRound;
    /// @notice The CCIP message id a request was dispatched as.
    mapping(bytes32 requestId => bytes32 messageId) public messageOfRequest;

    uint256 public totalRequests;
    uint256 public totalFeesPaid;

    event RandomnessDispatched(
        uint256 indexed roundId, bytes32 indexed requestId, bytes32 indexed ccipMessageId, uint256 fee
    );
    event DestinationUpdated(uint64 chainSelector, address coordinator);
    event GachaUpdated(address indexed gacha);
    event DestinationGasLimitUpdated(uint256 gasLimit);
    event UnusedFeesWithdrawn(address indexed to, uint256 amount);
    event FeesFunded(address indexed from, uint256 amount);

    error ZeroAddress();
    error NotGacha();
    error DestinationNotConfigured();
    error RoundAlreadyRequested(uint256 roundId);
    error InsufficientFeeBalance(uint256 required, uint256 available);
    error GasLimitOutOfRange(uint256 gasLimit);
    error TransferFailed();

    constructor(address admin, IRouterClient router_) {
        if (admin == address(0) || address(router_) == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RobachaRoles.TREASURY_ROLE, admin);
        router = router_;
    }

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------

    function setDestination(uint64 chainSelector, address coordinator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (coordinator == address(0) || chainSelector == 0) revert ZeroAddress();
        destinationChainSelector = chainSelector;
        destinationCoordinator = coordinator;
        emit DestinationUpdated(chainSelector, coordinator);
    }

    function setGacha(address gacha_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (gacha_ == address(0)) revert ZeroAddress();
        gacha = gacha_;
        emit GachaUpdated(gacha_);
    }

    function setDestinationGasLimit(uint256 gasLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (gasLimit < 100_000 || gasLimit > 2_500_000) revert GasLimitOutOfRange(gasLimit);
        destinationGasLimit = gasLimit;
        emit DestinationGasLimitUpdated(gasLimit);
    }

    /// @notice Top up the native balance used to pay CCIP fees.
    function fundFees() external payable {
        emit FeesFunded(msg.sender, msg.value);
    }

    /// @notice Recover native balance that is not needed for CCIP fees.
    function withdrawUnusedFees(address to, uint256 amount) external nonReentrant onlyRole(RobachaRoles.TREASURY_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit UnusedFeesWithdrawn(to, amount);
    }

    // ------------------------------------------------------------------
    // Requesting
    // ------------------------------------------------------------------

    /// @inheritdoc IRobachaRandomnessSender
    function requestRandomness(uint256 roundId) external payable nonReentrant returns (bytes32 requestId) {
        if (msg.sender != gacha || gacha == address(0)) revert NotGacha();
        if (destinationCoordinator == address(0) || destinationChainSelector == 0) revert DestinationNotConfigured();
        if (requestOfRound[roundId] != bytes32(0)) revert RoundAlreadyRequested(roundId);

        // Binding the chain id and this contract means a request id from one
        // deployment can never be replayed against another.
        requestId = keccak256(abi.encode(block.chainid, address(this), roundId));

        Client.EVM2AnyMessage memory message = _buildMessage(roundId, requestId);
        uint256 fee = router.getFee(destinationChainSelector, message);
        if (fee > address(this).balance) revert InsufficientFeeBalance(fee, address(this).balance);

        roundOfRequest[requestId] = roundId;
        requestOfRound[roundId] = requestId;
        ++totalRequests;
        totalFeesPaid += fee;

        bytes32 messageId = router.ccipSend{value: fee}(destinationChainSelector, message);
        messageOfRequest[requestId] = messageId;

        emit RandomnessDispatched(roundId, requestId, messageId, fee);

        // Let the gacha record that the message is genuinely in flight. This is
        // the only state transition this contract can honestly assert.
        IRobachaGachaCrossChain(gacha).markCrossChainPending(roundId);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    /// @inheritdoc IRobachaRandomnessSender
    function isReady() external view returns (bool ready, string memory reason) {
        if (address(router) == address(0)) return (false, "ccip router not set");
        if (destinationChainSelector == 0 || destinationCoordinator == address(0)) {
            return (false, "randomness destination not configured");
        }
        if (gacha == address(0)) return (false, "gacha not wired to randomness sender");
        if (!router.isChainSupported(destinationChainSelector)) {
            return (false, "ccip lane to randomness coordinator unsupported");
        }

        uint256 fee = _estimateFee();
        if (fee == 0) return (false, "ccip fee could not be estimated");
        if (address(this).balance < fee) return (false, "ccip fee balance too low");

        return (true, "");
    }

    /// @inheritdoc IRobachaRandomnessSender
    function estimateRequestFee() external view returns (uint256) {
        return _estimateFee();
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    function _buildMessage(uint256 roundId, bytes32 requestId) internal view returns (Client.EVM2AnyMessage memory) {
        return Client.EVM2AnyMessage({
            receiver: abi.encode(destinationCoordinator),
            data: abi.encode(roundId, requestId),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            feeToken: address(0), // native
            extraArgs: Client._argsToBytes(
                Client.GenericExtraArgsV2({gasLimit: destinationGasLimit, allowOutOfOrderExecution: true})
            )
        });
    }

    /// @dev Quotes a representative message so the estimate matches a real send.
    function _estimateFee() internal view returns (uint256) {
        if (destinationChainSelector == 0 || destinationCoordinator == address(0)) return 0;
        Client.EVM2AnyMessage memory message = _buildMessage(0, bytes32(0));
        try router.getFee(destinationChainSelector, message) returns (uint256 fee) {
            return fee;
        } catch {
            return 0;
        }
    }
}

/// @dev The single gacha entry point this contract needs.
interface IRobachaGachaCrossChain {
    function markCrossChainPending(uint256 roundId) external;
}
