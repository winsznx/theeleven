// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, Vm} from "forge-std/Test.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {PropMarketHook} from "../src/PropMarketHook.sol";
import {MockUSDT0} from "./mocks/MockUSDT0.sol";

contract PropMarketHook_Refund_Test is Test {
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

    uint8 internal constant SIDE_YES = 1;
    uint8 internal constant SIDE_NO = 2;

    event MarketRefunded(uint64 refundedAt);
    event StakeClaimed(address indexed user, uint256 amount);

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

        usdt0.mint(alice, 100e6);
        usdt0.mint(bob, 100e6);
    }

    function _initOnly() internal {
        bytes32 commitHash = keccak256(abi.encodePacked(PARAMS, SALT, agent));
        vm.prank(factory);
        hook.initialize(commitHash, agent, marketDeadline, resolveDeadline);
    }

    function _initAndReveal() internal {
        _initOnly();
        hook.reveal(PARAMS, SALT);
    }

    function _stake(address who, uint8 side, uint256 amount, bytes32 nonce) internal {
        vm.prank(who);
        hook.stake(who, side, amount, block.timestamp - 5, block.timestamp + 600, nonce, 0, bytes32(0), bytes32(0));
    }

    function test_refund_happyPath_revealMissed() public {
        _initOnly();
        // No stake possible before reveal — verify the branch reverts NothingToClaim because no stake exists.
        vm.warp(block.timestamp + 181);
        vm.prank(alice);
        vm.expectRevert(PropMarketHook.NothingToClaim.selector);
        hook.refund();
    }

    function test_refund_happyPath_resolveMissed() public {
        _initAndReveal();
        _stake(alice, SIDE_YES, 10e6, bytes32(uint256(1)));
        vm.warp(uint256(resolveDeadline) + 1);

        uint256 aliceBalBefore = usdt0.balanceOf(alice);

        vm.recordLogs();
        vm.prank(alice);
        hook.refund();
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 refundedTopic = keccak256("MarketRefunded(uint64)");
        bytes32 stakeClaimedTopic = keccak256("StakeClaimed(address,uint256)");
        uint256 refundedCount;
        uint256 stakeClaimedCount;
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].topics[0] == refundedTopic) refundedCount++;
            if (logs[i].topics[0] == stakeClaimedTopic) stakeClaimedCount++;
        }
        assertEq(refundedCount, 1, "MarketRefunded emitted once");
        assertEq(stakeClaimedCount, 1, "StakeClaimed emitted once");
        assertEq(usdt0.balanceOf(alice), aliceBalBefore + 10e6, "alice refunded 10e6");
        (,,,,,,,,,, uint8 outcome,,) = hook.market();
        assertEq(outcome, 3, "outcome=refunded");
    }

    function test_refund_secondRefundDoesNotReemitMarketRefunded() public {
        _initAndReveal();
        _stake(alice, SIDE_YES, 10e6, bytes32(uint256(1)));
        _stake(bob, SIDE_NO, 6e6, bytes32(uint256(2)));
        vm.warp(uint256(resolveDeadline) + 1);

        vm.prank(alice);
        hook.refund();

        vm.recordLogs();
        vm.prank(bob);
        hook.refund();
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 refundedTopic = keccak256("MarketRefunded(uint64)");
        uint256 refundedCount;
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].topics[0] == refundedTopic) refundedCount++;
        }
        assertEq(refundedCount, 0, "MarketRefunded NOT re-emitted on bob's refund");
    }

    function test_refund_happyPath_alreadyRefundedState() public {
        // bob only stakes no, resolver picks yes → outcome redirects to 3.
        _initAndReveal();
        _stake(bob, SIDE_NO, 6e6, bytes32(uint256(1)));
        vm.prank(resolver);
        hook.resolve(SIDE_YES);

        uint256 bobBalBefore = usdt0.balanceOf(bob);
        vm.prank(bob);
        hook.refund();
        assertEq(usdt0.balanceOf(bob), bobBalBefore + 6e6, "bob recovers 6e6");
    }

    function test_refund_revertsIfBeforeResolveDeadline() public {
        _initAndReveal();
        _stake(alice, SIDE_YES, 10e6, bytes32(uint256(1)));
        vm.prank(alice);
        vm.expectRevert(PropMarketHook.ResolveDeadlineNotReached.selector);
        hook.refund();
    }

    function test_refund_revertsIfAlreadyClaimed() public {
        _initAndReveal();
        _stake(alice, SIDE_YES, 10e6, bytes32(uint256(1)));
        vm.warp(uint256(resolveDeadline) + 1);

        vm.prank(alice);
        hook.refund();

        vm.prank(alice);
        vm.expectRevert(PropMarketHook.AlreadyClaimed.selector);
        hook.refund();
    }

    function test_refund_revertsIfNothingToClaim() public {
        _initAndReveal();
        _stake(alice, SIDE_YES, 10e6, bytes32(uint256(1)));
        vm.warp(uint256(resolveDeadline) + 1);

        address rando = makeAddr("rando");
        vm.prank(rando);
        vm.expectRevert(PropMarketHook.NothingToClaim.selector);
        hook.refund();
    }

    function test_refund_revertsIfMarketActiveAndResolved() public {
        _initAndReveal();
        _stake(alice, SIDE_YES, 10e6, bytes32(uint256(1)));
        _stake(bob, SIDE_NO, 6e6, bytes32(uint256(2)));
        vm.prank(resolver);
        hook.resolve(SIDE_YES);

        vm.prank(alice);
        vm.expectRevert(PropMarketHook.ResolveDeadlineNotReached.selector);
        hook.refund();
    }

    function test_refund_bothStakers_receiveFullDeposit() public {
        _initAndReveal();
        _stake(alice, SIDE_YES, 10e6, bytes32(uint256(1)));
        _stake(bob, SIDE_NO, 6e6, bytes32(uint256(2)));
        vm.warp(uint256(resolveDeadline) + 1);

        uint256 aliceBalBefore = usdt0.balanceOf(alice);
        uint256 bobBalBefore = usdt0.balanceOf(bob);
        vm.prank(alice);
        hook.refund();
        vm.prank(bob);
        hook.refund();

        uint256 aliceGain = usdt0.balanceOf(alice) - aliceBalBefore;
        uint256 bobGain = usdt0.balanceOf(bob) - bobBalBefore;
        assertEq(aliceGain, 10e6, "alice refunded 10e6");
        assertEq(bobGain, 6e6, "bob refunded 6e6");
        assertEq(aliceGain + bobGain, 16e6, "sum == totalPool");
    }

    function test_refund_userWithBothSides_receivesSum() public {
        _initAndReveal();
        _stake(alice, SIDE_YES, 4e6, bytes32(uint256(1)));
        _stake(alice, SIDE_NO, 3e6, bytes32(uint256(2)));
        vm.warp(uint256(resolveDeadline) + 1);

        uint256 aliceBalBefore = usdt0.balanceOf(alice);
        vm.prank(alice);
        hook.refund();
        assertEq(usdt0.balanceOf(alice) - aliceBalBefore, 7e6, "alice refunded yes+no = 7e6");
    }
}
