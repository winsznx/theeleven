// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IPropMarketHook {
    error NotImplemented();

    function initialize(
        bytes32 commitHash,
        address agent,
        uint64 marketDeadline,
        uint64 resolveDeadline
    ) external;

    function reveal(bytes calldata params, bytes32 salt) external;

    function stake(
        address from,
        uint8 side,
        uint256 amount,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function resolve(uint8 outcome) external;

    function claim() external;

    function refund() external;
}
