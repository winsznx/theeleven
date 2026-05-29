// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {PropMarketHook} from "../src/PropMarketHook.sol";
import {MockUSDT0} from "./mocks/MockUSDT0.sol";

contract PropMarketHook_Claim_Test is Test {
    address constant HOOK_ADDR = address(uint160(0x2A80));
    address constant POOL_MANAGER = address(0xdead);

    address internal factory;
    address internal agent;
    address internal resolver;
    address internal alice;
    address internal bob;
    address internal charlie;

    PropMarketHook internal hook;
    MockUSDT0 internal usdt0;

    bytes internal constant PARAMS = hex"deadbeefcafebabe";
    bytes32 internal constant SALT = bytes32(uint256(0xa11ce));

    uint64 internal marketDeadline;
    uint64 internal resolveDeadline;

    uint8 internal constant STATE_REVEALED = 2;
    uint8 internal constant STATE_REVEALED_PLUS_1 = STATE_REVEALED + 1;
    uint8 internal constant SIDE_YES = 1;
    uint8 internal constant SIDE_NO = 2;

    event StakeClaimed(address indexed user, uint256 amount);

    function setUp() public {
        vm.warp(1_700_000_000);

        factory = makeAddr("factory");
        agent = makeAddr("agent");
        resolver = makeAddr("resolver");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");

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
        usdt0.mint(charlie, 100e6);
    }

    function _stake(address who, uint8 side, uint256 amount, bytes32 nonce) internal {
        vm.prank(who);
        hook.stake(who, side, amount, block.timestamp - 5, block.timestamp + 600, nonce, 0, bytes32(0), bytes32(0));
    }

    function _setupSingleWinnerScenario() internal {
        // alice yes 10e6, bob no 6e6, resolve(1). alice expected payout = 10e6 * 16e6 / 10e6 = 16e6.
        _stake(alice, SIDE_YES, 10e6, bytes32(uint256(1)));
        _stake(bob, SIDE_NO, 6e6, bytes32(uint256(2)));
        vm.prank(resolver);
        hook.resolve(SIDE_YES);
    }

    function test_claim_happyPath_winner() public {
        _setupSingleWinnerScenario();
        uint256 aliceBalBefore = usdt0.balanceOf(alice);

        vm.expectEmit(true, true, true, true, HOOK_ADDR);
        emit StakeClaimed(alice, 16e6);
        vm.prank(alice);
        hook.claim();

        assertEq(usdt0.balanceOf(alice), aliceBalBefore + 16e6, "alice receives 16e6");
        (,, bool claimed) = hook.stakes(alice);
        assertTrue(claimed, "claimed flag");
    }

    function test_claim_happyPath_proportional() public {
        // alice yes 4e6, charlie yes 6e6, bob no 10e6. resolve(1). totalPool=20e6.
        // alice expected = 4 * 20 / 10 = 8e6. charlie expected = 6 * 20 / 10 = 12e6. Sum = 20e6 = totalPool.
        _stake(alice, SIDE_YES, 4e6, bytes32(uint256(11)));
        _stake(charlie, SIDE_YES, 6e6, bytes32(uint256(12)));
        _stake(bob, SIDE_NO, 10e6, bytes32(uint256(13)));
        vm.prank(resolver);
        hook.resolve(SIDE_YES);

        uint256 aliceBalBefore = usdt0.balanceOf(alice);
        uint256 charlieBalBefore = usdt0.balanceOf(charlie);

        vm.prank(alice);
        hook.claim();
        vm.prank(charlie);
        hook.claim();

        uint256 aliceGain = usdt0.balanceOf(alice) - aliceBalBefore;
        uint256 charlieGain = usdt0.balanceOf(charlie) - charlieBalBefore;
        assertEq(aliceGain, 8e6, "alice 8e6");
        assertEq(charlieGain, 12e6, "charlie 12e6");
        assertEq(aliceGain + charlieGain, 20e6, "sum == totalPool");
    }

    function test_claim_revertsIfNotResolved() public {
        // Stakes done in setUp() — skip resolve.
        _stake(alice, SIDE_YES, 10e6, bytes32(uint256(21)));
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PropMarketHook.NotInState.selector, STATE_REVEALED_PLUS_1, STATE_REVEALED)
        );
        hook.claim();
    }

    function test_claim_revertsIfRefunded() public {
        // bob only stakes no, resolver picks yes → outcome=3 redirect.
        _stake(bob, SIDE_NO, 6e6, bytes32(uint256(31)));
        vm.prank(resolver);
        hook.resolve(SIDE_YES);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(PropMarketHook.NotInState.selector, STATE_REVEALED_PLUS_1, STATE_REVEALED)
        );
        hook.claim();
    }

    function test_claim_revertsIfAlreadyClaimed() public {
        _setupSingleWinnerScenario();
        vm.prank(alice);
        hook.claim();

        vm.prank(alice);
        vm.expectRevert(PropMarketHook.AlreadyClaimed.selector);
        hook.claim();
    }

    function test_claim_revertsIfLoserHasNothing() public {
        _setupSingleWinnerScenario();
        vm.prank(bob);
        vm.expectRevert(PropMarketHook.NothingToClaim.selector);
        hook.claim();
    }

    function test_claim_revertsIfUnrelatedUser() public {
        _setupSingleWinnerScenario();
        address rando = makeAddr("rando");
        vm.prank(rando);
        vm.expectRevert(PropMarketHook.NothingToClaim.selector);
        hook.claim();
    }

    function test_claim_invariantTotalPayoutEqualsTotalPool() public {
        // 3 winners on yes (split unevenly), 2 losers on no. Sum of payouts == totalPool (within wei rounding).
        _stake(alice, SIDE_YES, 3e6, bytes32(uint256(41)));
        _stake(charlie, SIDE_YES, 7e6, bytes32(uint256(42)));
        address dave = makeAddr("dave");
        usdt0.mint(dave, 100e6);
        _stake(dave, SIDE_YES, 5e6, bytes32(uint256(43)));
        _stake(bob, SIDE_NO, 8e6, bytes32(uint256(44)));
        address eve = makeAddr("eve");
        usdt0.mint(eve, 100e6);
        _stake(eve, SIDE_NO, 4e6, bytes32(uint256(45)));

        uint256 totalPool = 3e6 + 7e6 + 5e6 + 8e6 + 4e6;
        vm.prank(resolver);
        hook.resolve(SIDE_YES);

        uint256 hookBalBefore = usdt0.balanceOf(HOOK_ADDR);
        vm.prank(alice);
        hook.claim();
        vm.prank(charlie);
        hook.claim();
        vm.prank(dave);
        hook.claim();
        uint256 paidOut = hookBalBefore - usdt0.balanceOf(HOOK_ADDR);

        uint256 numWinners = 3;
        assertLe(totalPool - paidOut, numWinners, "rounding loss <= num winners");
        assertGe(paidOut, totalPool - numWinners, "paid out >= totalPool - rounding");
    }
}
