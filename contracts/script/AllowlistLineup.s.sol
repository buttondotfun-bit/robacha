// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

interface IRegistry {
    function setTokenAllowlisted(address token, bool allowed) external;
    function allowlistedTokens(address token) external view returns (bool);
}

interface IERC20Symbol {
    function symbol() external view returns (string memory);
}

/**
 * @notice Approves the lined-up tokens as reward tokens on the registry.
 *
 * Allowlisting is the first of two steps and is worth understanding as
 * distinct from the second. This only tells the registry that a token is
 * *permitted* as a reward; it does not put it in a pool, does not give it odds,
 * and does not make it payable. A token can sit allowlisted indefinitely
 * without anyone ever pulling it.
 *
 * Putting it in a pool is the separate, heavier step: a locked version cannot
 * be edited, so it means publishing a new version with the token in its reward
 * slots and stocking the vault to cover the maximum that slot can pay. See
 * ExpandGenesisPool.s.sol.
 *
 * The site reflects that split honestly — "Approved" for allowlisted, "Loaded"
 * only once a token is in the live pool's published slots — so running this
 * changes a label from "Lined up" to "Approved" and nothing else. It does not
 * make the token pullable and the interface will not claim it does.
 *
 * A caveat that applies to both of these in particular: the AutoBuyer can only
 * restock through one hardcoded Uniswap V2 router, and PONS returns about 68%
 * of market value through it while TENDIES returns effectively nothing. They
 * can be allowlisted and even placed in a pool, but they cannot be restocked
 * automatically out of the reward reserve until the AutoBuyer takes a route per
 * token. Stocking them today means funding the vault by hand.
 *
 * Addresses are verified below by reading `symbol()` back before writing
 * anything — several tickers on this chain have multiple contracts using them,
 * and approving an impostor would let the machine hand one out as a prize.
 */
contract AllowlistLineup is Script {
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    address constant TENDIES = 0x45242320DBB855EeA8Fd36804C6487E10E97FCF9;

    function run() external {
        IRegistry registry = IRegistry(vm.envAddress("ROBACHA_POOL_REGISTRY"));

        address[2] memory tokens = [PONS, TENDIES];
        string[2] memory expected = ["PONS", "TENDIES"];

        // Check every address before opening a broadcast, so a mismatch stops
        // the run rather than half-applying it.
        for (uint256 i = 0; i < tokens.length; ++i) {
            string memory actual = IERC20Symbol(tokens[i]).symbol();
            require(
                keccak256(bytes(actual)) == keccak256(bytes(expected[i])),
                "symbol() does not match the expected ticker - wrong contract"
            );
            console2.log("verified", expected[i], tokens[i]);
        }

        vm.startBroadcast();
        for (uint256 i = 0; i < tokens.length; ++i) {
            if (!registry.allowlistedTokens(tokens[i])) {
                registry.setTokenAllowlisted(tokens[i], true);
            }
        }
        vm.stopBroadcast();

        for (uint256 i = 0; i < tokens.length; ++i) {
            console2.log(expected[i], "allowlisted:", registry.allowlistedTokens(tokens[i]));
            require(registry.allowlistedTokens(tokens[i]), "allowlisting did not take effect");
        }
    }
}
