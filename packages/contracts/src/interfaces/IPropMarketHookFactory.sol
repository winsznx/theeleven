// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

interface IPropMarketHookFactory {
    error NotImplemented();

    event AgentRegistered(address indexed agent);
    event MarketCreated(
        bytes32 indexed marketId,
        address indexed agent,
        address hook,
        PoolId poolId,
        bytes32 commitHash,
        uint64 deadline
    );

    function registerAgent(address agent) external;

    function createMarket(
        bytes32 matchId,
        bytes32 propositionId,
        bytes32 commitHash,
        uint64 marketDeadline,
        uint64 resolveDeadline,
        bytes32 salt
    ) external returns (address hook, PoolId poolId);
}
