// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";

import {IPropMarketHookFactory} from "./interfaces/IPropMarketHookFactory.sol";
import {PropMarketHook} from "./PropMarketHook.sol";

contract PropMarketHookFactory is IPropMarketHookFactory {
    using PoolIdLibrary for PoolKey;

    /// @notice 1:1 starting sqrt price (Q64.96) — pool is an anchor for hook lifecycle, not a swap venue.
    uint160 private constant SQRT_PRICE_1_1 = 79228162514264337593543950336;
    uint24 private constant POOL_FEE = 3000;
    int24 private constant TICK_SPACING = 60;

    IPoolManager public immutable poolManager;
    address public immutable usdt0;
    address public immutable resolver;
    address public owner;

    mapping(bytes32 => address) public marketIdToHook;
    mapping(address => bool) public registeredAgents;
    mapping(bytes32 => bool) public usedSalts;

    error NotOwner();
    error NotRegisteredAgent();
    error MarketAlreadyExists();
    error SaltAlreadyUsed();
    error InvalidAddress();
    error DeadlineInPast();
    error InvalidDeadlineOrder();

    constructor(IPoolManager _poolManager, address _usdt0, address _resolver) {
        poolManager = _poolManager;
        usdt0 = _usdt0;
        resolver = _resolver;
        owner = msg.sender;
    }

    function registerAgent(address agent) external {
        if (msg.sender != owner) revert NotOwner();
        if (agent == address(0)) revert InvalidAddress();
        registeredAgents[agent] = true;
        emit AgentRegistered(agent);
    }

    /// @notice Deploys a fresh PropMarketHook via CREATE2 and binds it to a v4 Pool.
    /// @dev Salt is mined off-chain by the agent (see HookMiner). A bad salt that
    ///      produces an address without the 0x2A80 bitmap bubbles up as BaseHook's
    ///      `HookAddressNotValid(address)` from the inner constructor — this
    ///      contract does not catch or re-wrap that revert. Gas for the failed
    ///      CREATE2 + constructor is consumed before the revert fires.
    function createMarket(
        bytes32 matchId,
        bytes32 propositionId,
        bytes32 commitHash,
        uint64 marketDeadline,
        uint64 resolveDeadline,
        bytes32 salt
    ) external returns (address hook, PoolId poolId) {
        if (!registeredAgents[msg.sender]) revert NotRegisteredAgent();
        if (marketDeadline <= block.timestamp) revert DeadlineInPast();
        if (resolveDeadline <= marketDeadline) revert InvalidDeadlineOrder();
        if (usedSalts[salt]) revert SaltAlreadyUsed();

        bytes32 marketId = keccak256(abi.encodePacked(matchId, propositionId, msg.sender, commitHash));
        if (marketIdToHook[marketId] != address(0)) revert MarketAlreadyExists();

        usedSalts[salt] = true;

        PropMarketHook deployedHook =
            new PropMarketHook{salt: salt}(poolManager, address(this), resolver, usdt0);
        hook = address(deployedHook);

        deployedHook.initialize(commitHash, msg.sender, marketDeadline, resolveDeadline);

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(usdt0),
            fee: POOL_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hook)
        });
        poolManager.initialize(key, SQRT_PRICE_1_1);

        poolId = key.toId();
        marketIdToHook[marketId] = hook;

        emit MarketCreated(marketId, msg.sender, hook, poolId, commitHash, marketDeadline);
    }
}
