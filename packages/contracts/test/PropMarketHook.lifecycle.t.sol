// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";

import {PropMarketHook} from "../src/PropMarketHook.sol";
import {IPropMarketHook} from "../src/interfaces/IPropMarketHook.sol";
import {MockUSDT0} from "./mocks/MockUSDT0.sol";

contract PropMarketHook_Lifecycle_Test is Test {
    address constant HOOK_ADDR = address(uint160(0x2A80));
    address constant POOL_MANAGER = address(0xdead);

    address internal factory;
    address internal agent;
    address internal resolver;
    address internal alice;
    PropMarketHook internal hook;
    MockUSDT0 internal usdt0;

    bytes internal constant PARAMS = hex"deadbeefcafebabe";
    bytes32 internal constant SALT = bytes32(uint256(0xa11ce));

    bytes32 internal validCommitHash;
    uint64 internal marketDeadline;
    uint64 internal resolveDeadline;

    uint8 internal constant STATE_UNINITIALIZED = 0;
    uint8 internal constant STATE_COMMITTED = 1;
    uint8 internal constant STATE_REVEALED = 2;

    event MarketInitialized(bytes32 commitHash, address agent, uint64 deadline);
    event ParametersRevealed(bytes revealedParams, bytes32 salt, uint64 revealedAt);

    function setUp() public {
        vm.warp(1_700_000_000);

        factory = makeAddr("factory");
        agent = makeAddr("agent");
        resolver = makeAddr("resolver");
        alice = makeAddr("alice");

        usdt0 = new MockUSDT0();

        bytes memory args = abi.encode(IPoolManager(POOL_MANAGER), factory, resolver, address(usdt0));
        deployCodeTo("PropMarketHook.sol:PropMarketHook", args, HOOK_ADDR);
        hook = PropMarketHook(HOOK_ADDR);

        marketDeadline = uint64(block.timestamp + 1 hours);
        resolveDeadline = uint64(block.timestamp + 2 hours);

        validCommitHash = keccak256(abi.encodePacked(PARAMS, SALT, agent));

        usdt0.mint(alice, 100e6);
    }

    function _doInitialize() internal {
        vm.prank(factory);
        hook.initialize(validCommitHash, agent, marketDeadline, resolveDeadline);
    }

    function _emptyPoolKey() internal pure returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0x10)),
            currency1: Currency.wrap(address(0x11)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(HOOK_ADDR)
        });
    }

    function _emptySwapParams() internal pure returns (SwapParams memory) {
        return SwapParams({zeroForOne: true, amountSpecified: -1, sqrtPriceLimitX96: 1});
    }

    function _emptyLiquidityParams() internal pure returns (ModifyLiquidityParams memory) {
        return ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: 1, salt: bytes32(0)});
    }

    function test_initialize_happyPath() public {
        vm.expectEmit(true, true, true, true, HOOK_ADDR);
        emit MarketInitialized(validCommitHash, agent, marketDeadline);

        // block.timestamp in foundry tests is bounded well below 2**64; safe to truncate.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint64 t = uint64(block.timestamp);
        vm.prank(factory);
        hook.initialize(validCommitHash, agent, marketDeadline, resolveDeadline);

        (
            bytes32 storedCommit,
            bytes32 storedRevealedHash,
            ,
            uint64 storedCommitBlock,
            uint64 storedRevealDeadline,
            uint64 storedMarketDeadline,
            uint64 storedResolveDeadline,
            address storedAgent,
            uint256 storedYes,
            uint256 storedNo,
            uint8 storedOutcome,
            bool storedRevealed,
            bool storedResolved
        ) = hook.market();

        assertEq(storedCommit, validCommitHash, "commitHash");
        assertEq(storedRevealedHash, bytes32(0), "revealedParamsHash default");
        assertEq(storedCommitBlock, t, "commitBlock");
        assertEq(storedRevealDeadline, t + 180, "revealDeadline = commitBlock + REVEAL_WINDOW");
        assertEq(storedMarketDeadline, marketDeadline, "marketDeadline");
        assertEq(storedResolveDeadline, resolveDeadline, "resolveDeadline");
        assertEq(storedAgent, agent, "agent");
        assertEq(storedYes, 0, "totalYes default");
        assertEq(storedNo, 0, "totalNo default");
        assertEq(storedOutcome, 0, "outcome default");
        assertEq(storedRevealed, false, "revealed default");
        assertEq(storedResolved, false, "resolved default");
    }

    function test_initialize_revertsIfNotFactory() public {
        address notFactory = makeAddr("notFactory");
        vm.prank(notFactory);
        vm.expectRevert(PropMarketHook.NotFactory.selector);
        hook.initialize(validCommitHash, agent, marketDeadline, resolveDeadline);
    }

    function test_initialize_revertsIfAlreadyInitialized() public {
        _doInitialize();
        vm.prank(factory);
        vm.expectRevert(PropMarketHook.AlreadyInitialized.selector);
        hook.initialize(validCommitHash, agent, marketDeadline, resolveDeadline);
    }

    function test_reveal_happyPath() public {
        _doInitialize();
        vm.warp(block.timestamp + 60);

        vm.expectEmit(true, true, true, true, HOOK_ADDR);
        emit ParametersRevealed(PARAMS, SALT, uint64(block.timestamp));
        hook.reveal(PARAMS, SALT);

        (, bytes32 revealedHash, bytes memory revealedBytes,,,,,,,,, bool revealed,) = hook.market();
        assertEq(revealedHash, validCommitHash, "revealedParamsHash == commitHash");
        assertEq(revealedBytes, PARAMS, "stored params");
        assertEq(revealed, true, "revealed flag");
    }

    function test_reveal_revertsIfNotInitialized() public {
        vm.expectRevert(
            abi.encodeWithSelector(PropMarketHook.NotInState.selector, STATE_COMMITTED, STATE_UNINITIALIZED)
        );
        hook.reveal(PARAMS, SALT);
    }

    function test_reveal_revertsIfWindowExpired() public {
        _doInitialize();
        vm.warp(block.timestamp + 181);
        vm.expectRevert(PropMarketHook.RevealWindowExpired.selector);
        hook.reveal(PARAMS, SALT);
    }

    function test_reveal_revertsIfCommitMismatch() public {
        _doInitialize();
        bytes32 wrongSalt = bytes32(uint256(0xbad));
        vm.expectRevert(PropMarketHook.CommitMismatch.selector);
        hook.reveal(PARAMS, wrongSalt);
    }

    function test_reveal_revertsIfAlreadyRevealed() public {
        _doInitialize();
        hook.reveal(PARAMS, SALT);
        vm.expectRevert(
            abi.encodeWithSelector(PropMarketHook.NotInState.selector, STATE_COMMITTED, STATE_REVEALED)
        );
        hook.reveal(PARAMS, SALT);
    }

    function test_beforeInitialize_happyPath() public {
        vm.prank(POOL_MANAGER);
        bytes4 ret = hook.beforeInitialize(factory, _emptyPoolKey(), uint160(1 << 96));
        assertEq(ret, hook.beforeInitialize.selector, "returns beforeInitialize selector");
    }

    function test_beforeInitialize_revertsIfNotFactory() public {
        address notFactory = makeAddr("notFactory");
        vm.prank(POOL_MANAGER);
        vm.expectRevert(PropMarketHook.NotFactory.selector);
        hook.beforeInitialize(notFactory, _emptyPoolKey(), uint160(1 << 96));
    }

    function test_beforeInitialize_revertsIfAlreadyInitialized() public {
        vm.prank(POOL_MANAGER);
        hook.beforeInitialize(factory, _emptyPoolKey(), uint160(1 << 96));

        vm.prank(POOL_MANAGER);
        vm.expectRevert(PropMarketHook.AlreadyInitialized.selector);
        hook.beforeInitialize(factory, _emptyPoolKey(), uint160(1 << 96));
    }

    function test_beforeSwap_revertsIfNotRevealed() public {
        _doInitialize();
        vm.prank(POOL_MANAGER);
        vm.expectRevert(
            abi.encodeWithSelector(PropMarketHook.NotInState.selector, STATE_REVEALED, STATE_COMMITTED)
        );
        hook.beforeSwap(address(0xfeed), _emptyPoolKey(), _emptySwapParams(), "");
    }

    function test_beforeSwap_happyPath() public {
        _doInitialize();
        hook.reveal(PARAMS, SALT);

        vm.prank(POOL_MANAGER);
        (bytes4 selector, BeforeSwapDelta delta, uint24 fee) =
            hook.beforeSwap(address(0xfeed), _emptyPoolKey(), _emptySwapParams(), "");

        assertEq(selector, hook.beforeSwap.selector, "returns beforeSwap selector");
        assertEq(BeforeSwapDelta.unwrap(delta), BeforeSwapDelta.unwrap(BeforeSwapDeltaLibrary.ZERO_DELTA), "ZERO_DELTA");
        assertEq(uint256(fee), 0, "0 fee");
    }

    function test_beforeSwap_revertsAfterMarketDeadline() public {
        _doInitialize();
        hook.reveal(PARAMS, SALT);
        vm.warp(uint256(marketDeadline) + 1);

        vm.prank(POOL_MANAGER);
        vm.expectRevert(PropMarketHook.MarketClosed.selector);
        hook.beforeSwap(address(0xfeed), _emptyPoolKey(), _emptySwapParams(), "");
    }

    function test_beforeSwap_revertsIfAlreadyResolved() public {
        _doInitialize();
        hook.reveal(PARAMS, SALT);

        // Real flow: alice stakes yes → resolver picks yes (non-empty pool, so outcome=1 not 3).
        vm.prank(alice);
        hook.stake(alice, 1, 10e6, block.timestamp - 5, block.timestamp + 600, bytes32(uint256(1)), 0, bytes32(0), bytes32(0));
        vm.prank(resolver);
        hook.resolve(1);

        vm.prank(POOL_MANAGER);
        vm.expectRevert(PropMarketHook.AlreadyResolved.selector);
        hook.beforeSwap(address(0xfeed), _emptyPoolKey(), _emptySwapParams(), "");
    }

    function test_beforeAddLiquidity_alwaysReverts() public {
        vm.prank(POOL_MANAGER);
        vm.expectRevert(PropMarketHook.LiquidityNotAllowed.selector);
        hook.beforeAddLiquidity(address(0xfeed), _emptyPoolKey(), _emptyLiquidityParams(), "");
    }

    function test_beforeRemoveLiquidity_alwaysReverts() public {
        vm.prank(POOL_MANAGER);
        vm.expectRevert(PropMarketHook.LiquidityNotAllowed.selector);
        hook.beforeRemoveLiquidity(address(0xfeed), _emptyPoolKey(), _emptyLiquidityParams(), "");
    }
}
