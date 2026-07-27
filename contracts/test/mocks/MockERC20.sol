// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Test-only ERC-20. Never deployed by the production scripts.
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_)
        ERC20(name_, symbol_)
    {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev ERC-20 whose transfer always fails, for failure-path tests.
contract RevertingERC20 is ERC20 {
    constructor() ERC20("Reverting", "REV") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address, uint256) public pure override returns (bool) {
        revert("transfer disabled");
    }
}

/// @dev Fee-on-transfer ERC-20: skims 1% on every transfer. The vault must reject it.
contract FeeOnTransferERC20 is ERC20 {
    constructor() ERC20("Fee On Transfer", "FOT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = value / 100;
        super._update(from, to, value - fee);
        super._update(from, address(0xdead), fee);
    }
}

/// @dev Rebasing ERC-20: an external actor can shrink a holder's balance.
contract RebasingERC20 is ERC20 {
    constructor() ERC20("Rebasing", "RBS") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function rebaseDown(address account, uint256 amount) external {
        _burn(account, amount);
    }
}

/// @dev Not an ERC-20 at all. `decimals()` reverts, so allowlisting must fail.
contract NotAToken {
    function decimals() external pure returns (uint8) {
        revert("not a token");
    }
}
