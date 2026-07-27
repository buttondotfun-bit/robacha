// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title RobachaRoles
 * @notice The single definition of every privileged role across the ROBACHA
 *         contracts. Defining them once means a role granted on one contract
 *         cannot silently mean something different on another.
 *
 * @dev `DEFAULT_ADMIN_ROLE` is OpenZeppelin's `0x00` and is not redefined here.
 *      The deployer holds it only long enough to wire the system together; the
 *      post-deployment script transfers it to the admin address and renounces
 *      the deployer's grants.
 */
library RobachaRoles {
    /// @notice Creates pool versions, sets probabilities, activates and closes pools.
    bytes32 internal constant POOL_MANAGER_ROLE = keccak256("ROBACHA_POOL_MANAGER_ROLE");

    /// @notice May pause and unpause. Held by an address that can act quickly.
    bytes32 internal constant PAUSER_ROLE = keccak256("ROBACHA_PAUSER_ROLE");

    /// @notice Withdraws accrued protocol revenue to the configured treasuries.
    bytes32 internal constant TREASURY_ROLE = keccak256("ROBACHA_TREASURY_ROLE");

    /// @notice Deposits reward inventory into, and withdraws surplus from, the vault.
    bytes32 internal constant VAULT_MANAGER_ROLE = keccak256("ROBACHA_VAULT_MANAGER_ROLE");

    /// @notice Held only by the randomness receiver contract. Delivers randomness.
    bytes32 internal constant RANDOMNESS_ROLE = keccak256("ROBACHA_RANDOMNESS_ROLE");

    /// @notice Held only by the gacha contract. Reserves and releases vault inventory.
    bytes32 internal constant GACHA_ROLE = keccak256("ROBACHA_GACHA_ROLE");
}
