// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, Vm} from "forge-std/Test.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {PropMarketHook} from "../src/PropMarketHook.sol";
import {MockUSDT0} from "./mocks/MockUSDT0.sol";

contract PropMarketHook_Resolve_Test is Test {
    address constant HOOK_ADDR = address(uint160(0x2A80));
    address constant POOL_MANAGER = address(0xdead);

    address internal factory;
    address internal agent;
    address internal resolver;
    address internal alice;
    address internal bob;

    PropMarketHook internal hook;
    MockUSDT0 internal usdt0;

    bytes internal constant PARAMS = hex"deadbeefcafebabe";
    bytes32 internal constant SALT = bytes32(uint256(0xa11ce));

    uint64 internal marketDeadline;
    uint64 internal resolveDeadline;

    uint8 internal constant STATE_REVEALED = 2;
    uint8 internal constant STATE_COMMITTED = 1;
    uint8 internal constant SIDE_YES = 1;
    uint8 internal constant SIDE_NO = 2;

    event MarketResolved(uint8 outcome, address resolver, uint64 resolvedAt);
    event MarketRefunded(uint64 refundedAt);

    function setUp() public {
        vm.warp(1_700_000_000);

        factory = makeAddr("factory");
        agent = makeAddr("agent");
        resolver = makeAddr("resolver");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        usdt0 = new MockUSDT0();

        bytes memory args = abi.encode(IPoolManager(POOL_MANAGER), factory, resolver, address(usdt0));
        deployCodeTo("PropMarketHook.sol:PropMarketHook", args, HOOK_ADDR);
        hook = PropMarketHook(HOOK_ADDR);

        marketDeadline = uint64(block.timestamp + 1 hours);
        resolveDeadline = uint64(block.timestamp + 2 hours);

        bytes32 commitHash = keccak256(abi.encodePacked(PARAMS, SALT, agent));
        vm.prank(factory);
        hook.initialize(commitHash, agent, marketDeadline, resolveDeadline);
        hook.reveal(PARAMS, SALT);

        usdt0.mint(alice, 100e6);
        usdt0.mint(bob, 100e6);

        vm.prank(alice);
        hook.stake(alice, SIDE_YES, 10e6, block.timestamp - 5, block.timestamp + 600, bytes32(uint256(1)), 0, bytes32(0), bytes32(0));
        vm.prank(bob);
        hook.stake(bob, SIDE_NO, 6e6, block.timestamp - 5, block.timestamp + 600, bytes32(uint256(2)), 0, bytes32(0), bytes32(0));
    }

    function test_resolve_happyPath_yes() public {
        vm.expectEmit(true, true, true, true, HOOK_ADDR);
        emit MarketResolved(SIDE_YES, resolver, uint64(block.timestamp));

        vm.prank(resolver);
        hook.resolve(SIDE_YES);

        (,,,,,,,,,, uint8 outcome,, bool resolved) = hook.market();
        assertEq(outcome, SIDE_YES, "outcome=yes");
        assertTrue(resolved, "resolved flag");
    }

    function test_resolve_happyPath_no() public {
        vm.expectEmit(true, true, true, true, HOOK_ADDR);
        emit MarketResolved(SIDE_NO, resolver, uint64(block.timestamp));

        vm.prank(resolver);
        hook.resolve(SIDE_NO);

        (,,,,,,,,,, uint8 outcome,, bool resolved) = hook.market();
        assertEq(outcome, SIDE_NO, "outcome=no");
        assertTrue(resolved, "resolved flag");
    }

    function test_resolve_revertsIfNotResolver() public {
        vm.prank(makeAddr("rando"));
        vm.expectRevert(PropMarketHook.NotResolver.selector);
        hook.resolve(SIDE_YES);
    }

    function test_resolve_revertsIfNotRevealed() public {
        // Fresh hook with a different valid-mask address, only initialized (not revealed).
        address freshHook = address(uint160(0x2A80) | (uint160(1) << 14));
        bytes memory args = abi.encode(IPoolManager(POOL_MANAGER), factory, resolver, address(usdt0));
        deployCodeTo("PropMarketHook.sol:PropMarketHook", args, freshHook);
        PropMarketHook h2 = PropMarketHook(freshHook);
        bytes32 commitHash = keccak256(abi.encodePacked(PARAMS, SALT, agent));
        vm.prank(factory);
        h2.initialize(commitHash, agent, marketDeadline, resolveDeadline);

        vm.prank(resolver);
        vm.expectRevert(
            abi.encodeWithSelector(PropMarketHook.NotInState.selector, STATE_REVEALED, STATE_COMMITTED)
        );
        h2.resolve(SIDE_YES);
    }

    function test_resolve_revertsIfAlreadyResolved() public {
        vm.prank(resolver);
        hook.resolve(SIDE_YES);

        vm.prank(resolver);
        vm.expectRevert(PropMarketHook.AlreadyResolved.selector);
        hook.resolve(SIDE_NO);
    }

    function test_resolve_revertsIfInvalidOutcome() public {
        vm.prank(resolver);
        vm.expectRevert(PropMarketHook.InvalidOutcome.selector);
        hook.resolve(0);

        vm.prank(resolver);
        vm.expectRevert(PropMarketHook.InvalidOutcome.selector);
        hook.resolve(3);
    }

    function test_resolve_edgeWinningPoolZero() public {
        // Fresh hook where only bob stakes no; resolver picks yes → winning pool empty → refund redirect.
        address freshHook = address(uint160(0x2A80) | (uint160(2) << 14));
        bytes memory args = abi.encode(IPoolManager(POOL_MANAGER), factory, resolver, address(usdt0));
        deployCodeTo("PropMarketHook.sol:PropMarketHook", args, freshHook);
        PropMarketHook h2 = PropMarketHook(freshHook);

        bytes32 commitHash = keccak256(abi.encodePacked(PARAMS, SALT, agent));
        vm.prank(factory);
        h2.initialize(commitHash, agent, marketDeadline, resolveDeadline);
        h2.reveal(PARAMS, SALT);

        usdt0.mint(bob, 100e6);
        vm.prank(bob);
        h2.stake(bob, SIDE_NO, 5e6, block.timestamp - 5, block.timestamp + 600, bytes32(uint256(99)), 0, bytes32(0), bytes32(0));

        vm.recordLogs();
        vm.prank(resolver);
        h2.resolve(SIDE_YES);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Expect BOTH MarketResolved and MarketRefunded to have been emitted in this single call.
        bytes32 resolvedTopic = keccak256("MarketResolved(uint8,address,uint64)");
        bytes32 refundedTopic = keccak256("MarketRefunded(uint64)");
        uint256 resolvedCount;
        uint256 refundedCount;
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].topics.length == 0) continue;
            if (logs[i].topics[0] == resolvedTopic) resolvedCount++;
            if (logs[i].topics[0] == refundedTopic) refundedCount++;
        }
        assertEq(resolvedCount, 1, "MarketResolved emitted once");
        assertEq(refundedCount, 1, "MarketRefunded emitted once");

        (,,,,,,,,,, uint8 outcome,, bool resolved) = h2.market();
        assertEq(outcome, 3, "outcome redirected to refunded");
        assertTrue(resolved, "still resolved=true (records resolver intent)");
    }
}
