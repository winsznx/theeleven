// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

import {FlapResolutionRelay, IResolvableMarket} from "../src/FlapResolutionRelay.sol";

/// @dev Minimal market that records the resolve() it receives, so we can assert
///      the relay forwards the exact proposed outcome at finalize time.
contract MockResolvableMarket is IResolvableMarket {
    uint8 public lastOutcome;
    uint256 public resolveCount;
    address public lastCaller;

    function resolve(uint8 outcome) external {
        lastOutcome = outcome;
        lastCaller = msg.sender;
        resolveCount += 1;
    }
}

contract FlapResolutionRelay_Test is Test {
    FlapResolutionRelay internal relay;
    MockResolvableMarket internal market;

    address internal owner = makeAddr("owner");
    address internal oracle = makeAddr("oracle");
    address internal stranger = makeAddr("stranger");

    uint64 internal constant WINDOW = 1 hours;

    function setUp() public {
        relay = new FlapResolutionRelay(owner, oracle, WINDOW);
        market = new MockResolvableMarket();
    }

    // ─── Construction ────────────────────────────────────────────────────

    function test_constructor_setsConfig() public view {
        assertEq(relay.owner(), owner);
        assertEq(relay.oracle(), oracle);
        assertEq(relay.disputeWindow(), WINDOW);
    }

    function test_constructor_rejectsZeroOwner() public {
        vm.expectRevert(FlapResolutionRelay.ZeroAddress.selector);
        new FlapResolutionRelay(address(0), oracle, WINDOW);
    }

    function test_constructor_rejectsWindowOutOfRange() public {
        vm.expectRevert(FlapResolutionRelay.WindowOutOfRange.selector);
        new FlapResolutionRelay(owner, oracle, 1 minutes); // < MIN
        vm.expectRevert(FlapResolutionRelay.WindowOutOfRange.selector);
        new FlapResolutionRelay(owner, oracle, 8 days); // > MAX
    }

    // ─── Happy path ──────────────────────────────────────────────────────

    function test_propose_then_finalize_forwardsOutcome() public {
        // #given the oracle proposes OVER (outcome 1)
        vm.prank(oracle);
        relay.proposeOutcome(address(market), 1);

        // #when the dispute window has elapsed and anyone finalizes
        vm.warp(block.timestamp + WINDOW);
        vm.prank(stranger);
        relay.finalize(address(market));

        // #then the market is resolved exactly once with the proposed outcome,
        //       called by the relay
        assertEq(market.resolveCount(), 1);
        assertEq(market.lastOutcome(), 1);
        assertEq(market.lastCaller(), address(relay));
    }

    function test_finalizableAt_reflectsWindow() public {
        vm.prank(oracle);
        relay.proposeOutcome(address(market), 2);
        assertEq(relay.finalizableAt(address(market)), uint64(block.timestamp) + WINDOW);
    }

    // ─── Dispute window ──────────────────────────────────────────────────

    function test_finalize_revertsBeforeWindow() public {
        vm.prank(oracle);
        relay.proposeOutcome(address(market), 1);

        vm.warp(block.timestamp + WINDOW - 1);
        vm.expectRevert(FlapResolutionRelay.WindowNotElapsed.selector);
        relay.finalize(address(market));
    }

    // ─── Veto (circuit breaker) ──────────────────────────────────────────

    function test_veto_blocksFinalize() public {
        vm.prank(oracle);
        relay.proposeOutcome(address(market), 1);

        vm.prank(owner);
        relay.veto(address(market));

        vm.warp(block.timestamp + WINDOW);
        vm.expectRevert(FlapResolutionRelay.Vetoed.selector);
        relay.finalize(address(market));
        assertEq(market.resolveCount(), 0);
    }

    function test_veto_allowsCorrectedReproposal() public {
        // #given a wrong outcome is proposed then vetoed
        vm.prank(oracle);
        relay.proposeOutcome(address(market), 1);
        vm.prank(owner);
        relay.veto(address(market));

        // #when the oracle re-proposes the corrected outcome
        vm.prank(oracle);
        relay.proposeOutcome(address(market), 2);
        vm.warp(block.timestamp + WINDOW);
        relay.finalize(address(market));

        // #then the corrected outcome settles
        assertEq(market.lastOutcome(), 2);
        assertEq(market.resolveCount(), 1);
    }

    function test_veto_onlyOwner() public {
        vm.prank(oracle);
        relay.proposeOutcome(address(market), 1);
        vm.prank(stranger);
        vm.expectRevert(FlapResolutionRelay.NotOwner.selector);
        relay.veto(address(market));
    }

    // ─── Auth + input guards ─────────────────────────────────────────────

    function test_propose_onlyOracle() public {
        vm.prank(stranger);
        vm.expectRevert(FlapResolutionRelay.NotOracle.selector);
        relay.proposeOutcome(address(market), 1);
    }

    function test_propose_rejectsInvalidOutcome() public {
        vm.startPrank(oracle);
        vm.expectRevert(FlapResolutionRelay.InvalidOutcome.selector);
        relay.proposeOutcome(address(market), 0);
        vm.expectRevert(FlapResolutionRelay.InvalidOutcome.selector);
        relay.proposeOutcome(address(market), 3);
        vm.stopPrank();
    }

    function test_propose_rejectsDoublePropose() public {
        vm.startPrank(oracle);
        relay.proposeOutcome(address(market), 1);
        vm.expectRevert(FlapResolutionRelay.AlreadyProposed.selector);
        relay.proposeOutcome(address(market), 2);
        vm.stopPrank();
    }

    function test_finalize_revertsWithoutProposal() public {
        vm.expectRevert(FlapResolutionRelay.NoProposal.selector);
        relay.finalize(address(market));
    }

    function test_finalize_revertsOnDoubleFinalize() public {
        vm.prank(oracle);
        relay.proposeOutcome(address(market), 1);
        vm.warp(block.timestamp + WINDOW);
        relay.finalize(address(market));
        vm.expectRevert(FlapResolutionRelay.AlreadyFinalized.selector);
        relay.finalize(address(market));
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    function test_setOracle_rotatesProposer() public {
        address newOracle = makeAddr("newOracle");
        vm.prank(owner);
        relay.setOracle(newOracle);
        assertEq(relay.oracle(), newOracle);

        // old oracle can no longer propose
        vm.prank(oracle);
        vm.expectRevert(FlapResolutionRelay.NotOracle.selector);
        relay.proposeOutcome(address(market), 1);

        // new oracle can
        vm.prank(newOracle);
        relay.proposeOutcome(address(market), 1);
        assertEq(relay.finalizableAt(address(market)), uint64(block.timestamp) + WINDOW);
    }

    function test_setOracle_onlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(FlapResolutionRelay.NotOwner.selector);
        relay.setOracle(stranger);
    }

    function test_setDisputeWindow_bounded() public {
        vm.startPrank(owner);
        relay.setDisputeWindow(2 hours);
        assertEq(relay.disputeWindow(), 2 hours);
        vm.expectRevert(FlapResolutionRelay.WindowOutOfRange.selector);
        relay.setDisputeWindow(1 minutes);
        vm.stopPrank();
    }

    function test_transferOwnership() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        relay.transferOwnership(newOwner);
        assertEq(relay.owner(), newOwner);
    }
}
