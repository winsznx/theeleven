// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IUSDT0} from "../../src/interfaces/IUSDT0.sol";

contract MockUSDT0 is IUSDT0 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(bytes32 => bool)) internal _authState;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8,
        bytes32,
        bytes32
    ) external {
        require(!_authState[from][nonce], "auth used");
        require(block.timestamp > validAfter, "too early");
        require(block.timestamp < validBefore, "expired");
        require(balanceOf[from] >= value, "insufficient");
        _authState[from][nonce] = true;
        balanceOf[from] -= value;
        balanceOf[to] += value;
    }

    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        return _authState[authorizer][nonce];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
