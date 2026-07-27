// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RobachaFeeRouter} from "../src/RobachaFeeRouter.sol";
import {RobachaGacha} from "../src/RobachaGacha.sol";
import {RobachaPoolRegistry} from "../src/RobachaPoolRegistry.sol";
import {RobachaRewardVault} from "../src/RobachaRewardVault.sol";
import {RobachaRoles} from "../src/RobachaRoles.sol";
import {RobachaRandomnessSender} from "../src/randomness/RobachaRandomnessSender.sol";
import {RobachaRandomnessReceiver} from "../src/randomness/RobachaRandomnessReceiver.sol";
import {EthereumRobachaRandomnessCoordinator} from "../src/randomness/EthereumRobachaRandomnessCoordinator.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {MockCCIPRouter, MockVRFCoordinator} from "./mocks/MockCCIP.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/**
 * @dev Shared fixture: the full ROBACHA system wired exactly as the deployment
 *      script wires it, with the Chainlink router and VRF coordinator replaced
 *      by test doubles. Every other contract under test is the production one.
 */
abstract contract RobachaBase is Test {
    // Official mainnet selectors, so the tests exercise the same values the
    // deployment configures. Sourced from contracts/config/chainlink.json.
    uint64 internal constant ROBINHOOD_SELECTOR = 6180753054346818345;
    uint64 internal constant ETHEREUM_SELECTOR = 5009297550715157269;

    uint16 internal constant PROTOCOL_BPS = 1_200;
    uint16 internal constant OPERATIONS_BPS = 300;
    uint16 internal constant REWARD_BPS = 8_500;

    uint256 internal constant BASE_PRICE = 0.004 ether;
    uint256 internal constant SURCHARGE = 0.0012 ether;

    address internal admin = makeAddr("admin");
    address internal protocolTreasury = makeAddr("protocolTreasury");
    address internal operationsTreasury = makeAddr("operationsTreasury");
    address internal rewardTreasury = makeAddr("rewardTreasury");
    address internal randomnessTreasury = makeAddr("randomnessTreasury");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    RobachaFeeRouter internal feeRouter;
    RobachaRewardVault internal vault;
    RobachaPoolRegistry internal registry;
    RobachaGacha internal gacha;
    RobachaRandomnessSender internal sender;
    RobachaRandomnessReceiver internal receiver;
    EthereumRobachaRandomnessCoordinator internal coordinator;

    MockCCIPRouter internal router;
    MockVRFCoordinator internal vrf;

    MockERC20 internal tokenA;
    MockERC20 internal tokenB;
    MockERC20 internal tokenC;

    uint256 internal poolId;

    function setUp() public virtual {
        router = new MockCCIPRouter();
        vrf = new MockVRFCoordinator();

        feeRouter = new RobachaFeeRouter(
            admin,
            protocolTreasury,
            operationsTreasury,
            rewardTreasury,
            randomnessTreasury,
            PROTOCOL_BPS,
            OPERATIONS_BPS,
            REWARD_BPS
        );
        vault = new RobachaRewardVault(admin);
        registry = new RobachaPoolRegistry(admin, vault, feeRouter);
        gacha = new RobachaGacha(admin, registry, vault, feeRouter);

        sender = new RobachaRandomnessSender(admin, IRouterClient(address(router)));
        receiver = new RobachaRandomnessReceiver(admin, address(router));
        coordinator = new EthereumRobachaRandomnessCoordinator(admin, address(router), address(vrf));

        vm.startPrank(admin);

        vault.grantRole(RobachaRoles.GACHA_ROLE, address(gacha));
        feeRouter.grantRole(RobachaRoles.GACHA_ROLE, address(gacha));
        registry.setGacha(address(gacha));

        gacha.setRandomnessSender(sender);
        gacha.setRandomnessReceiver(address(receiver));

        sender.setGacha(address(gacha));
        sender.setDestination(ETHEREUM_SELECTOR, address(coordinator));

        receiver.setSource(ETHEREUM_SELECTOR, address(coordinator));
        receiver.setGacha(gacha);

        coordinator.setVRFConfig(
            1, bytes32(uint256(0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9)), 300_000, 3
        );
        coordinator.setReturnPath(ROBINHOOD_SELECTOR, address(sender), address(receiver), 500_000);

        vm.stopPrank();

        // Fee balances for both CCIP hops.
        vm.deal(address(sender), 1 ether);
        vm.deal(address(coordinator), 1 ether);

        tokenA = new MockERC20("Token A", "AAA", 18);
        tokenB = new MockERC20("Token B", "BBB", 18);
        tokenC = new MockERC20("Token C", "CCC", 6);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    // ------------------------------------------------------------------
    // Fixture helpers
    // ------------------------------------------------------------------

    function _fundVault(MockERC20 token, uint256 amount) internal {
        token.mint(admin, amount);
        vm.startPrank(admin);
        token.approve(address(vault), amount);
        vault.fund(address(token), amount);
        vm.stopPrank();
    }

    /// @dev A three-tier pool with one reward slot per tier, fully funded.
    function _createStandardPool() internal returns (uint256 id) {
        _fundVault(tokenA, 1_000_000e18);
        _fundVault(tokenB, 1_000_000e18);
        _fundVault(tokenC, 1_000_000e6);

        vm.startPrank(admin);
        registry.setTokenAllowlisted(address(tokenA), true);
        registry.setTokenAllowlisted(address(tokenB), true);
        registry.setTokenAllowlisted(address(tokenC), true);

        id = registry.createPool("Genesis Pool");

        uint16[] memory probabilities = new uint16[](3);
        probabilities[0] = 7_000; // common
        probabilities[1] = 2_500; // rare
        probabilities[2] = 500; // legendary
        registry.setProbabilities(id, 1, probabilities);

        registry.addReward(id, 1, address(tokenA), 0, 100e18, 200e18);
        registry.addReward(id, 1, address(tokenB), 1, 500e18, 900e18);
        registry.addReward(id, 1, address(tokenC), 2, 1_000e6, 5_000e6);

        registry.setEconomics(id, 1, BASE_PRICE, SURCHARGE);
        registry.setRoundConfig(id, 1, 25, 60, 10, 0);
        registry.activate(id, 1, 0, 0);
        vm.stopPrank();

        poolId = id;
    }

    function _spin(address who, uint256 id, uint16 quantity) internal {
        (,, uint256 total) = gacha.quote(id, quantity);
        vm.prank(who);
        gacha.spin{value: total}(id, quantity);
    }

    /// @dev Drive one full round through CCIP → VRF → CCIP with a chosen word.
    function _fulfilRound(uint256 roundId, uint256 word) internal {
        RobachaGacha.Round memory round = gacha.getRound(roundId);
        if (round.state == RobachaGacha.RoundState.Open) {
            vm.warp(round.closesAt + 1);
            gacha.closeRound(roundId);
        }

        gacha.requestRoundRandomness(roundId);

        // Robinhood → Ethereum
        MockCCIPRouter.Sent memory outbound = router.lastSent();
        router.deliver(
            address(coordinator), keccak256(abi.encode("out", roundId)), ROBINHOOD_SELECTOR, address(sender), outbound.data
        );

        // VRF fulfilment triggers the return message.
        uint256 vrfRequestId = coordinator.vrfRequestOfRound(roundId);
        vrf.fulfill(vrfRequestId, word);

        // Ethereum → Robinhood
        MockCCIPRouter.Sent memory inbound = router.lastSent();
        router.deliver(
            address(receiver), keccak256(abi.encode("in", roundId)), ETHEREUM_SELECTOR, address(coordinator), inbound.data
        );
    }
}
