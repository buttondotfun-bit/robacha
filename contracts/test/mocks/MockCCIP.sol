// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";

/**
 * @dev Test-only CCIP router.
 *
 * Records every send, and lets a test deliver a message to a destination
 * receiver on demand. Nothing in `src/` references this file — the production
 * contracts talk to the real Chainlink router address supplied at deployment.
 */
contract MockCCIPRouter is IRouterClient {
    struct Sent {
        uint64 destinationChainSelector;
        address sender;
        bytes receiver;
        bytes data;
        uint256 fee;
    }

    uint256 public fee = 0.001 ether;
    bool public supportedOverride = true;
    uint256 public nextMessageNonce = 1;

    Sent[] public sent;

    function setFee(uint256 fee_) external {
        fee = fee_;
    }

    function setSupported(bool supported) external {
        supportedOverride = supported;
    }

    function sentCount() external view returns (uint256) {
        return sent.length;
    }

    function lastSent() external view returns (Sent memory) {
        return sent[sent.length - 1];
    }

    function isChainSupported(uint64) external view override returns (bool) {
        return supportedOverride;
    }

    function getFee(uint64, Client.EVM2AnyMessage memory) external view override returns (uint256) {
        return fee;
    }

    function ccipSend(uint64 destinationChainSelector, Client.EVM2AnyMessage calldata message)
        external
        payable
        override
        returns (bytes32)
    {
        require(msg.value >= fee, "MockCCIPRouter: fee");
        sent.push(
            Sent({
                destinationChainSelector: destinationChainSelector,
                sender: msg.sender,
                receiver: message.receiver,
                data: message.data,
                fee: msg.value
            })
        );
        return keccak256(abi.encode(destinationChainSelector, msg.sender, nextMessageNonce++));
    }

    /// @dev Deliver a message as the router would on the destination chain.
    function deliver(
        address target,
        bytes32 messageId,
        uint64 sourceChainSelector,
        address sender,
        bytes memory data
    ) external {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: messageId,
            sourceChainSelector: sourceChainSelector,
            sender: abi.encode(sender),
            data: data,
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });
        IAny2EVMMessageReceiver(target).ccipReceive(message);
    }
}

/**
 * @dev Test-only VRF v2.5 coordinator.
 *
 * Issues sequential request ids and lets a test fulfil one with a chosen word,
 * which is how the deterministic settlement tests pin down expected outcomes.
 */
contract MockVRFCoordinator is IVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;
    mapping(uint256 requestId => address consumer) public consumerOf;

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        consumerOf[requestId] = msg.sender;
    }

    function fulfill(uint256 requestId, uint256 word) external {
        uint256[] memory words = new uint256[](1);
        words[0] = word;
        (bool ok, bytes memory err) = consumerOf[requestId].call(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, words)
        );
        if (!ok) {
            assembly {
                revert(add(err, 32), mload(err))
            }
        }
    }

    // ---- Unused subscription surface, present to satisfy the interface ----
    function addConsumer(uint256, address) external {}
    function removeConsumer(uint256, address) external {}
    function cancelSubscription(uint256, address) external {}
    function acceptSubscriptionOwnerTransfer(uint256) external {}
    function requestSubscriptionOwnerTransfer(uint256, address) external {}
    function createSubscription() external returns (uint256) {
        return 1;
    }
    function getSubscription(uint256)
        external
        pure
        returns (uint96, uint96, uint64, address, address[] memory)
    {
        return (0, 0, 0, address(0), new address[](0));
    }
    function pendingRequestExists(uint256) external pure returns (bool) {
        return false;
    }
    function getActiveSubscriptionIds(uint256, uint256) external pure returns (uint256[] memory) {
        return new uint256[](0);
    }
    function fundSubscriptionWithNative(uint256) external payable {}
}
