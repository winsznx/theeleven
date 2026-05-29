// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, Vm} from "forge-std/Test.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {PropMarketHook} from "../src/PropMarketHook.sol";
import {PropMarketHookFactory} from "../src/PropMarketHookFactory.sol";
import {MockUSDT0} from "./mocks/MockUSDT0.sol";

contract PropMarketHookFactory_Test is Test {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    PoolManager internal poolManager;
    MockUSDT0 internal usdt0;
    PropMarketHookFactory internal factory;

    address internal owner;
    address internal resolver;
    address internal alice;
    address internal bob;

    uint160 internal constant TARGET_FLAGS = 0x2A80;

    event AgentRegistered(address indexed agent);
    event MarketCreated(
        bytes32 indexed marketId,
        address indexed agent,
        address hook,
        PoolId poolId,
        bytes32 commitHash,
        uint64 deadline
    );

    function setUp() public {
        vm.warp(1_700_000_000);

        owner = address(this);
        resolver = makeAddr("resolver");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        poolManager = new PoolManager(owner);
        usdt0 = new MockUSDT0();
        factory =
            new PropMarketHookFactory(IPoolManager(address(poolManager)), address(usdt0), resolver);
    }

    function _mineSalt() internal view returns (address predicted, bytes32 salt) {
        bytes memory constructorArgs =
            abi.encode(IPoolManager(address(poolManager)), address(factory), resolver, address(usdt0));
        (predicted, salt) = HookMiner.find(
            address(factory), TARGET_FLAGS, type(PropMarketHook).creationCode, constructorArgs
        );
    }

    function test_constructor_setsImmutables() public view {
        assertEq(address(factory.poolManager()), address(poolManager), "poolManager");
        assertEq(factory.usdt0(), address(usdt0), "usdt0");
        assertEq(factory.resolver(), resolver, "resolver");
        assertEq(factory.owner(), owner, "owner == deployer");
    }

    function test_registerAgent_happyPath() public {
        vm.expectEmit(true, true, true, true, address(factory));
        emit AgentRegistered(alice);
        factory.registerAgent(alice);
        assertTrue(factory.registeredAgents(alice), "alice registered");
    }

    function test_registerAgent_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(PropMarketHookFactory.NotOwner.selector);
        factory.registerAgent(bob);
    }

    function test_registerAgent_revertsIfZeroAddress() public {
        vm.expectRevert(PropMarketHookFactory.InvalidAddress.selector);
        factory.registerAgent(address(0));
    }

    function test_createMarket_happyPath() public {
        factory.registerAgent(alice);

        (address predicted, bytes32 salt) = _mineSalt();
        assertEq(uint160(predicted) & 0x3FFF, TARGET_FLAGS, "predicted bits == 0x2A80");

        bytes32 matchId = keccak256("match-1");
        bytes32 propositionId = keccak256("prop-1");
        bytes32 commitHash = keccak256("commit-1");
        uint64 marketDeadline = uint64(block.timestamp + 1 hours);
        uint64 resolveDeadline = uint64(block.timestamp + 2 hours);
        bytes32 marketId =
            keccak256(abi.encodePacked(matchId, propositionId, alice, commitHash));

        PoolKey memory expectedKey = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(address(usdt0)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(predicted)
        });
        PoolId expectedPoolId = expectedKey.toId();

        vm.expectEmit(true, true, true, true, address(factory));
        emit MarketCreated(marketId, alice, predicted, expectedPoolId, commitHash, marketDeadline);

        vm.prank(alice);
        (address hookAddr, PoolId poolId) = factory.createMarket(
            matchId, propositionId, commitHash, marketDeadline, resolveDeadline, salt
        );

        assertEq(hookAddr, predicted, "hook deployed at predicted address");
        assertEq(uint160(hookAddr) & 0x3FFF, TARGET_FLAGS, "hook bits == 0x2A80");
        assertEq(factory.marketIdToHook(marketId), hookAddr, "marketId mapping");
        assertEq(PoolId.unwrap(poolId), PoolId.unwrap(expectedPoolId), "poolId");

        PropMarketHook hook = PropMarketHook(hookAddr);
        (
            bytes32 storedCommit, , , , , uint64 storedMarketDeadline, uint64 storedResolveDeadline,
            address storedAgent, , , , ,
        ) = hook.market();
        assertEq(storedCommit, commitHash, "hook.market.commitHash");
        assertEq(storedAgent, alice, "hook.market.agent");
        assertEq(storedMarketDeadline, marketDeadline, "hook.market.marketDeadline");
        assertEq(storedResolveDeadline, resolveDeadline, "hook.market.resolveDeadline");

        (uint160 sqrtPriceX96,,,) = IPoolManager(address(poolManager)).getSlot0(poolId);
        assertGt(uint256(sqrtPriceX96), 0, "pool initialized in PoolManager");
    }

    function test_createMarket_revertsIfNotRegisteredAgent() public {
        (, bytes32 salt) = _mineSalt();
        vm.prank(alice);
        vm.expectRevert(PropMarketHookFactory.NotRegisteredAgent.selector);
        factory.createMarket(
            keccak256("m"), keccak256("p"), keccak256("c"),
            uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours), salt
        );
    }

    function test_createMarket_revertsIfMarketDeadlineInPast() public {
        factory.registerAgent(alice);
        (, bytes32 salt) = _mineSalt();
        vm.prank(alice);
        vm.expectRevert(PropMarketHookFactory.DeadlineInPast.selector);
        factory.createMarket(
            keccak256("m"), keccak256("p"), keccak256("c"),
            uint64(block.timestamp), uint64(block.timestamp + 1 hours), salt
        );
    }

    function test_createMarket_revertsIfResolveDeadlineNotAfterMarketDeadline() public {
        factory.registerAgent(alice);
        (, bytes32 salt) = _mineSalt();
        uint64 md = uint64(block.timestamp + 1 hours);
        vm.prank(alice);
        vm.expectRevert(PropMarketHookFactory.InvalidDeadlineOrder.selector);
        factory.createMarket(keccak256("m"), keccak256("p"), keccak256("c"), md, md, salt);
    }

    function test_createMarket_revertsIfSaltReused() public {
        factory.registerAgent(alice);
        (, bytes32 salt) = _mineSalt();

        uint64 md = uint64(block.timestamp + 1 hours);
        uint64 rd = uint64(block.timestamp + 2 hours);

        vm.prank(alice);
        factory.createMarket(keccak256("m1"), keccak256("p1"), keccak256("c1"), md, rd, salt);

        vm.prank(alice);
        vm.expectRevert(PropMarketHookFactory.SaltAlreadyUsed.selector);
        factory.createMarket(keccak256("m2"), keccak256("p2"), keccak256("c2"), md, rd, salt);
    }

    function test_createMarket_revertsIfMarketAlreadyExists() public {
        factory.registerAgent(alice);

        (, bytes32 salt1) = _mineSalt();
        uint64 md = uint64(block.timestamp + 1 hours);
        uint64 rd = uint64(block.timestamp + 2 hours);
        bytes32 matchId = keccak256("m");
        bytes32 propId = keccak256("p");
        bytes32 commitHash = keccak256("c");

        vm.prank(alice);
        factory.createMarket(matchId, propId, commitHash, md, rd, salt1);

        // Second salt: mine starting from a non-zero offset by changing constructorArgs would require a
        // different deploy nonce; HookMiner restarts from 0 each call but since salt1 is "used",
        // we just brute-force find a different valid salt manually for the same constructor args.
        // Simpler: mine again — HookMiner returns the FIRST valid salt; we need the NEXT one.
        bytes32 salt2 = _nextValidSalt(uint256(salt1) + 1);

        vm.prank(alice);
        vm.expectRevert(PropMarketHookFactory.MarketAlreadyExists.selector);
        factory.createMarket(matchId, propId, commitHash, md, rd, salt2);
    }

    function test_createMarket_revertsIfBadSalt() public {
        factory.registerAgent(alice);
        // Deliberately bad salt — 1 in 16384 chance of accidentally satisfying the bitmap.
        // Both salt=1 and salt=2 confirmed to not satisfy 0x2A80 for this constructor-args
        // hash; we use salt=1 and document the fallback.
        bytes32 badSalt = bytes32(uint256(1));
        bytes memory constructorArgs = abi.encode(
            IPoolManager(address(poolManager)), address(factory), resolver, address(usdt0)
        );
        address badPredicted =
            HookMiner.computeAddress(address(factory), uint256(badSalt), abi.encodePacked(type(PropMarketHook).creationCode, constructorArgs));
        // Sanity: if salt=1 happens to mine to a valid address (1/16384), this test setup is wrong.
        require(uint160(badPredicted) & 0x3FFF != TARGET_FLAGS, "salt=1 unexpectedly valid; switch to salt=2");

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(Hooks.HookAddressNotValid.selector, badPredicted)
        );
        factory.createMarket(
            keccak256("m"), keccak256("p"), keccak256("c"),
            uint64(block.timestamp + 1 hours), uint64(block.timestamp + 2 hours), badSalt
        );
    }

    function test_createMarket_differentMatchIds_produceDifferentMarkets() public {
        factory.registerAgent(alice);

        (address pred1, bytes32 salt1) = _mineSalt();
        uint64 md = uint64(block.timestamp + 1 hours);
        uint64 rd = uint64(block.timestamp + 2 hours);

        vm.prank(alice);
        (address h1,) = factory.createMarket(keccak256("m1"), keccak256("p"), keccak256("c"), md, rd, salt1);

        bytes32 salt2 = _nextValidSalt(uint256(salt1) + 1);
        vm.prank(alice);
        (address h2,) = factory.createMarket(keccak256("m2"), keccak256("p"), keccak256("c"), md, rd, salt2);

        assertEq(h1, pred1, "first hook matches prediction");
        assertTrue(h1 != h2, "different match ids produce different hooks");
        bytes32 mid1 = keccak256(abi.encodePacked(keccak256("m1"), keccak256("p"), alice, keccak256("c")));
        bytes32 mid2 = keccak256(abi.encodePacked(keccak256("m2"), keccak256("p"), alice, keccak256("c")));
        assertTrue(mid1 != mid2, "different marketIds");
        assertEq(factory.marketIdToHook(mid1), h1);
        assertEq(factory.marketIdToHook(mid2), h2);
    }

    function test_createMarket_sameMatchDifferentCommit_produceDifferentMarkets() public {
        factory.registerAgent(alice);

        (, bytes32 salt1) = _mineSalt();
        uint64 md = uint64(block.timestamp + 1 hours);
        uint64 rd = uint64(block.timestamp + 2 hours);

        vm.prank(alice);
        (address h1,) = factory.createMarket(keccak256("m"), keccak256("p"), keccak256("c1"), md, rd, salt1);

        bytes32 salt2 = _nextValidSalt(uint256(salt1) + 1);
        vm.prank(alice);
        (address h2,) = factory.createMarket(keccak256("m"), keccak256("p"), keccak256("c2"), md, rd, salt2);

        assertTrue(h1 != h2, "same match + prop, different commit -> different hooks");
    }

    /// @dev Brute-force the next salt >= `startFrom` whose CREATE2 address satisfies the flag bitmap.
    function _nextValidSalt(uint256 startFrom) internal view returns (bytes32) {
        bytes memory codeWithArgs = abi.encodePacked(
            type(PropMarketHook).creationCode,
            abi.encode(IPoolManager(address(poolManager)), address(factory), resolver, address(usdt0))
        );
        for (uint256 s = startFrom; s < startFrom + 200_000; s++) {
            address predicted = HookMiner.computeAddress(address(factory), s, codeWithArgs);
            if (uint160(predicted) & 0x3FFF == TARGET_FLAGS && predicted.code.length == 0) {
                return bytes32(s);
            }
        }
        revert("no valid salt found in window");
    }
}
