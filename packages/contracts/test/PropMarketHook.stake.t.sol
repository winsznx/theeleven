// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {PropMarketHook} from "../src/PropMarketHook.sol";
import {MockUSDT0} from "./mocks/MockUSDT0.sol";

contract PropMarketHook_Stake_Test is Test {
    address constant HOOK_ADDR = address(uint160(0x2A80));
    address constant POOL_MANAGER = address(0xdead);
    address constant RESOLVER = address(0xcafe);

    address internal factory;
    address internal agent;
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

    uint256 internal constant ALICE_BAL = 100e6;
    uint256 internal constant BOB_BAL = 100e6;

    event StakeRecorded(address indexed user, uint8 side, uint256 amount, bytes32 txRef);

    function setUp() public {
        // Move clock well past zero so `_validAfter = block.timestamp - 5` is always safe.
        vm.warp(1_700_000_000);

        factory = makeAddr("factory");
        agent = makeAddr("agent");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        usdt0 = new MockUSDT0();

        bytes memory args = abi.encode(IPoolManager(POOL_MANAGER), factory, RESOLVER, address(usdt0));
        deployCodeTo("PropMarketHook.sol:PropMarketHook", args, HOOK_ADDR);
        hook = PropMarketHook(HOOK_ADDR);

        marketDeadline = uint64(block.timestamp + 1 hours);
        resolveDeadline = uint64(block.timestamp + 2 hours);

        bytes32 commitHash = keccak256(abi.encodePacked(PARAMS, SALT, agent));
        vm.prank(factory);
        hook.initialize(commitHash, agent, marketDeadline, resolveDeadline);
        hook.reveal(PARAMS, SALT);

        usdt0.mint(alice, ALICE_BAL);
        usdt0.mint(bob, BOB_BAL);
    }

    function _validAfter() internal view returns (uint256) {
        return block.timestamp - 5;
    }

    function _validBefore() internal view returns (uint256) {
        return block.timestamp + 600;
    }

    function _nonce(uint256 i) internal pure returns (bytes32) {
        return bytes32(uint256(0xabc0 + i));
    }

    function test_stake_happyPath_yes() public {
        bytes32 n = _nonce(1);
        vm.expectEmit(true, true, true, true, HOOK_ADDR);
        emit StakeRecorded(alice, SIDE_YES, 10e6, n);

        vm.prank(alice);
        hook.stake(alice, SIDE_YES, 10e6, _validAfter(), _validBefore(), n, 0, bytes32(0), bytes32(0));

        (uint256 aliceYes, uint256 aliceNo, bool claimed) = hook.stakes(alice);
        assertEq(aliceYes, 10e6, "stakes[alice].yes");
        assertEq(aliceNo, 0, "stakes[alice].no");
        assertFalse(claimed, "stakes[alice].claimed");

        (,,,,,,,, uint256 totalYes,,,,) = hook.market();
        assertEq(totalYes, 10e6, "totalYes");
    }

    function test_stake_happyPath_no() public {
        bytes32 n = _nonce(2);
        vm.expectEmit(true, true, true, true, HOOK_ADDR);
        emit StakeRecorded(bob, SIDE_NO, 5e6, n);

        vm.prank(bob);
        hook.stake(bob, SIDE_NO, 5e6, _validAfter(), _validBefore(), n, 0, bytes32(0), bytes32(0));

        (uint256 bobYes, uint256 bobNo,) = hook.stakes(bob);
        assertEq(bobYes, 0, "stakes[bob].yes");
        assertEq(bobNo, 5e6, "stakes[bob].no");

        (,,,,,,,,, uint256 totalNo,,,) = hook.market();
        assertEq(totalNo, 5e6, "totalNo");
    }

    function test_stake_bothSides_accountingMatches() public {
        vm.prank(alice);
        hook.stake(alice, SIDE_YES, 10e6, _validAfter(), _validBefore(), _nonce(3), 0, bytes32(0), bytes32(0));
        vm.prank(bob);
        hook.stake(bob, SIDE_NO, 7e6, _validAfter(), _validBefore(), _nonce(4), 0, bytes32(0), bytes32(0));

        (,,,,,,,, uint256 totalYes, uint256 totalNo,,,) = hook.market();
        assertEq(totalYes, 10e6, "totalYes");
        assertEq(totalNo, 7e6, "totalNo");
        // Invariant #2: sum of staked totals == USDT0 held by hook
        assertEq(totalYes + totalNo, usdt0.balanceOf(HOOK_ADDR), "invariant #2");
    }

    function test_stake_multipleStakesFromSameUser_accumulates() public {
        vm.prank(alice);
        hook.stake(alice, SIDE_YES, 4e6, _validAfter(), _validBefore(), _nonce(5), 0, bytes32(0), bytes32(0));
        vm.prank(alice);
        hook.stake(alice, SIDE_YES, 6e6, _validAfter(), _validBefore(), _nonce(6), 0, bytes32(0), bytes32(0));

        (uint256 aliceYes,,) = hook.stakes(alice);
        assertEq(aliceYes, 10e6, "alice yes accumulates");

        (,,,,,,,, uint256 totalYes,,,,) = hook.market();
        assertEq(totalYes, 10e6, "totalYes accumulates");
    }

    function test_stake_revertsIfMarketNotRevealed() public {
        // Fresh hook at a different valid-mask address, only initialized (not revealed).
        address freshHook = address(uint160(0x2A80) | (uint160(1) << 14));
        bytes memory args = abi.encode(IPoolManager(POOL_MANAGER), factory, RESOLVER, address(usdt0));
        deployCodeTo("PropMarketHook.sol:PropMarketHook", args, freshHook);
        PropMarketHook h2 = PropMarketHook(freshHook);
        bytes32 commitHash = keccak256(abi.encodePacked(PARAMS, SALT, agent));
        vm.prank(factory);
        h2.initialize(commitHash, agent, marketDeadline, resolveDeadline);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PropMarketHook.NotInState.selector, STATE_REVEALED, STATE_COMMITTED)
        );
        h2.stake(alice, SIDE_YES, 1e6, _validAfter(), _validBefore(), _nonce(7), 0, bytes32(0), bytes32(0));
    }

    function test_stake_revertsIfPastMarketDeadline() public {
        vm.warp(uint256(marketDeadline) + 1);
        vm.prank(alice);
        vm.expectRevert(PropMarketHook.MarketClosed.selector);
        hook.stake(alice, SIDE_YES, 1e6, _validAfter(), _validBefore(), _nonce(8), 0, bytes32(0), bytes32(0));
    }

    function test_stake_revertsIfMarketResolved() public {
        // Real flow: alice stakes yes first so totalYes > 0 → resolve(1) sets outcome=1 (not refund redirect).
        vm.prank(alice);
        hook.stake(alice, SIDE_YES, 1e6, _validAfter(), _validBefore(), _nonce(50), 0, bytes32(0), bytes32(0));
        vm.prank(RESOLVER);
        hook.resolve(SIDE_YES);

        vm.prank(alice);
        vm.expectRevert(PropMarketHook.AlreadyResolved.selector);
        hook.stake(alice, SIDE_YES, 1e6, _validAfter(), _validBefore(), _nonce(9), 0, bytes32(0), bytes32(0));
    }

    function test_stake_revertsIfSideZero() public {
        vm.prank(alice);
        vm.expectRevert(PropMarketHook.InvalidOutcome.selector);
        hook.stake(alice, 0, 1e6, _validAfter(), _validBefore(), _nonce(10), 0, bytes32(0), bytes32(0));
    }

    function test_stake_revertsIfSideThree() public {
        vm.prank(alice);
        vm.expectRevert(PropMarketHook.InvalidOutcome.selector);
        hook.stake(alice, 3, 1e6, _validAfter(), _validBefore(), _nonce(11), 0, bytes32(0), bytes32(0));
    }

    function test_stake_revertsIfAmountZero() public {
        vm.prank(alice);
        vm.expectRevert(PropMarketHook.InvalidAmount.selector);
        hook.stake(alice, SIDE_YES, 0, _validAfter(), _validBefore(), _nonce(12), 0, bytes32(0), bytes32(0));
    }

    function test_stake_revertsIfNonceReused() public {
        bytes32 n = _nonce(13);
        vm.prank(alice);
        hook.stake(alice, SIDE_YES, 1e6, _validAfter(), _validBefore(), n, 0, bytes32(0), bytes32(0));

        vm.prank(alice);
        vm.expectRevert(bytes("auth used"));
        hook.stake(alice, SIDE_YES, 1e6, _validAfter(), _validBefore(), n, 0, bytes32(0), bytes32(0));
    }

    function test_stake_revertsIfInsufficientBalance() public {
        vm.prank(alice);
        vm.expectRevert(bytes("insufficient"));
        hook.stake(
            alice, SIDE_YES, ALICE_BAL + 1, _validAfter(), _validBefore(), _nonce(14), 0, bytes32(0), bytes32(0)
        );
    }

}
