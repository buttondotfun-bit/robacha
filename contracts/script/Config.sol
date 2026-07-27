// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title RobachaDeployConfig
 * @notice Every externally-owned value the deployment needs, in one place.
 *
 * @dev The Chainlink values are the official ones for Robinhood Chain and
 *      Ethereum mainnet, recorded in `contracts/config/chainlink.json` with the
 *      endpoints they were read from. None is guessed. If a value is not known
 *      it is left zero and the script that needs it refuses to run rather than
 *      substituting a placeholder.
 */
library RobachaDeployConfig {
    // ---- Robinhood Chain mainnet ----
    uint256 internal constant ROBINHOOD_CHAIN_ID = 4663;
    uint64 internal constant ROBINHOOD_CCIP_SELECTOR = 6180753054346818345;
    address internal constant ROBINHOOD_CCIP_ROUTER = 0x06fC836cf9839B1cd891C440A0a45242DA6Ae1c9;
    address internal constant ROBINHOOD_LINK = 0x492641F648a4986844848E0beFE66D14817bCE34;

    // ---- Ethereum mainnet ----
    uint256 internal constant ETHEREUM_CHAIN_ID = 1;
    uint64 internal constant ETHEREUM_CCIP_SELECTOR = 5009297550715157269;
    address internal constant ETHEREUM_CCIP_ROUTER = 0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D;
    address internal constant ETHEREUM_LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;

    // ---- Chainlink VRF v2.5 on Ethereum mainnet ----
    address internal constant VRF_COORDINATOR = 0xD7f86b4b8Cae7D942340FF628F82735b7a20893a;
    bytes32 internal constant VRF_KEY_HASH_200_GWEI =
        0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9;
    bytes32 internal constant VRF_KEY_HASH_500_GWEI =
        0x3fd2fec10d06ee8f65e7f2e95f5c56511359ece3f33960ad8a866ae24a8ff10b;
    bytes32 internal constant VRF_KEY_HASH_1000_GWEI =
        0xc6bf2e7b88e5cfbb4946ff23af846494ae1f3c65270b79ee7876c9aa99d3d45f;
    uint16 internal constant VRF_MIN_CONFIRMATIONS = 3;

    // ---- Initial fee split, in basis points ----
    uint16 internal constant PROTOCOL_FEE_BPS = 1_200; // 12%
    uint16 internal constant OPERATIONS_FEE_BPS = 300; // 3%
    uint16 internal constant REWARD_RESERVE_BPS = 8_500; // 85%
}
