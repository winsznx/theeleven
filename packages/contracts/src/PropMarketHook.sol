// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BaseHook} from "@openzeppelin/uniswap-hooks/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {ReentrancyGuard} from "@oz-hooks/utils/ReentrancyGuard.sol";

import {IPropMarketHook} from "./interfaces/IPropMarketHook.sol";
import {IUSDT0} from "./interfaces/IUSDT0.sol";

contract PropMarketHook is BaseHook, ReentrancyGuard, IPropMarketHook {
    struct Market {
        bytes32 commitHash;
        bytes32 revealedParamsHash;
        bytes revealedParams;
        uint64 commitBlock;
        uint64 revealDeadline;
        uint64 marketDeadline;
        uint64 resolveDeadline;
        address agent;
        uint256 totalYes;
        uint256 totalNo;
        uint8 outcome;
        bool revealed;
        bool resolved;
    }

    struct Stake {
        uint256 yes;
        uint256 no;
        bool claimed;
    }

    uint8 internal constant STATE_UNINITIALIZED = 0;
    uint8 internal constant STATE_COMMITTED = 1;
    uint8 internal constant STATE_REVEALED = 2;

    Market public market;
    mapping(address => Stake) public stakes;
    address public immutable factory;
    address public immutable resolver;
    address public immutable usdt0;
    uint64 public constant REVEAL_WINDOW = 180;

    bool internal _poolInitialized;

    event MarketInitialized(bytes32 commitHash, address agent, uint64 deadline);
    event ParametersRevealed(bytes revealedParams, bytes32 salt, uint64 revealedAt);
    event StakeRecorded(address indexed user, uint8 side, uint256 amount, bytes32 txRef);
    event MarketResolved(uint8 outcome, address resolver, uint64 resolvedAt);
    event StakeClaimed(address indexed user, uint256 amount);
    event MarketRefunded(uint64 refundedAt);

    error NotFactory();
    error NotResolver();
    error NotRegisteredAgent();
    error AlreadyInitialized();
    error NotInState(uint8 expected, uint8 actual);
    error CommitMismatch();
    error RevealWindowOpen();
    error RevealWindowExpired();
    error MarketClosed();
    error AlreadyResolved();
    error InvalidOutcome();
    error NothingToClaim();
    error AlreadyClaimed();
    error ResolveDeadlineNotReached();
    error UnauthorizedSignature();
    error LiquidityNotAllowed();
    error InvalidAmount();

    constructor(IPoolManager _poolManager, address _factory, address _resolver, address _usdt0)
        BaseHook(_poolManager)
    {
        factory = _factory;
        resolver = _resolver;
        usdt0 = _usdt0;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function initialize(bytes32 commitHash, address agent, uint64 marketDeadline, uint64 resolveDeadline)
        external
    {
        if (msg.sender != factory) revert NotFactory();
        if (market.commitHash != bytes32(0)) revert AlreadyInitialized();

        market.commitHash = commitHash;
        market.agent = agent;
        market.commitBlock = uint64(block.timestamp);
        market.revealDeadline = uint64(block.timestamp) + REVEAL_WINDOW;
        market.marketDeadline = marketDeadline;
        market.resolveDeadline = resolveDeadline;

        emit MarketInitialized(commitHash, agent, marketDeadline);
    }

    function reveal(bytes calldata revealedParams, bytes32 salt) external {
        if (market.commitHash == bytes32(0)) {
            revert NotInState(STATE_COMMITTED, STATE_UNINITIALIZED);
        }
        if (market.revealed) {
            revert NotInState(STATE_COMMITTED, STATE_REVEALED);
        }
        if (block.timestamp > market.revealDeadline) revert RevealWindowExpired();

        bytes32 recomputedHash = keccak256(abi.encodePacked(revealedParams, salt, market.agent));
        if (recomputedHash != market.commitHash) revert CommitMismatch();

        market.revealedParams = revealedParams;
        market.revealedParamsHash = recomputedHash;
        market.revealed = true;

        emit ParametersRevealed(revealedParams, salt, uint64(block.timestamp));
    }

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
    ) external nonReentrant {
        if (!market.revealed) revert NotInState(STATE_REVEALED, STATE_COMMITTED);
        if (block.timestamp > market.marketDeadline) revert MarketClosed();
        if (market.resolved) revert AlreadyResolved();
        if (side != 1 && side != 2) revert InvalidOutcome();
        if (amount == 0) revert InvalidAmount();

        IUSDT0(usdt0).transferWithAuthorization(
            from, address(this), amount, validAfter, validBefore, nonce, v, r, s
        );

        if (side == 1) {
            stakes[from].yes += amount;
            market.totalYes += amount;
        } else {
            stakes[from].no += amount;
            market.totalNo += amount;
        }

        emit StakeRecorded(from, side, amount, nonce);
    }

    function resolve(uint8 outcome) external {
        if (msg.sender != resolver) revert NotResolver();
        if (!market.revealed) revert NotInState(STATE_REVEALED, STATE_COMMITTED);
        if (market.resolved) revert AlreadyResolved();
        if (outcome != 1 && outcome != 2) revert InvalidOutcome();

        market.resolved = true;
        uint256 winningPool = outcome == 1 ? market.totalYes : market.totalNo;

        if (winningPool == 0) {
            market.outcome = 3;
            emit MarketResolved(outcome, msg.sender, uint64(block.timestamp));
            emit MarketRefunded(uint64(block.timestamp));
        } else {
            market.outcome = outcome;
            emit MarketResolved(outcome, msg.sender, uint64(block.timestamp));
        }
    }

    function claim() external nonReentrant {
        if (!market.resolved) revert NotInState(STATE_REVEALED + 1, STATE_REVEALED);
        if (market.outcome == 3) revert NotInState(STATE_REVEALED + 1, STATE_REVEALED);
        if (stakes[msg.sender].claimed) revert AlreadyClaimed();

        uint8 outcome = market.outcome;
        uint256 userWinningStake =
            outcome == 1 ? stakes[msg.sender].yes : stakes[msg.sender].no;
        if (userWinningStake == 0) revert NothingToClaim();

        uint256 winningPool = outcome == 1 ? market.totalYes : market.totalNo;
        uint256 totalPool = market.totalYes + market.totalNo;
        uint256 payout = (userWinningStake * totalPool) / winningPool;

        stakes[msg.sender].claimed = true;
        // USDT0 reverts on insufficient balance; bool return is always true on success.
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        IUSDT0(usdt0).transfer(msg.sender, payout);
        emit StakeClaimed(msg.sender, payout);
    }

    function refund() external nonReentrant {
        bool revealMissed = !market.revealed && block.timestamp > market.revealDeadline;
        bool resolveMissed =
            market.revealed && !market.resolved && block.timestamp > market.resolveDeadline;
        bool alreadyRefunded = market.outcome == 3;
        if (!revealMissed && !resolveMissed && !alreadyRefunded) {
            revert ResolveDeadlineNotReached();
        }

        if (stakes[msg.sender].claimed) revert AlreadyClaimed();
        uint256 refundAmount = stakes[msg.sender].yes + stakes[msg.sender].no;
        if (refundAmount == 0) revert NothingToClaim();

        stakes[msg.sender].claimed = true;
        if (market.outcome != 3) {
            market.outcome = 3;
            emit MarketRefunded(uint64(block.timestamp));
        }
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        IUSDT0(usdt0).transfer(msg.sender, refundAmount);
        emit StakeClaimed(msg.sender, refundAmount);
    }

    function _beforeInitialize(address sender, PoolKey calldata, uint160) internal override returns (bytes4) {
        if (sender != factory) revert NotFactory();
        if (_poolInitialized) revert AlreadyInitialized();
        _poolInitialized = true;
        return BaseHook.beforeInitialize.selector;
    }

    function _beforeSwap(address, PoolKey calldata, SwapParams calldata, bytes calldata)
        internal
        view
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        if (!market.revealed) revert NotInState(STATE_REVEALED, STATE_COMMITTED);
        if (block.timestamp > market.marketDeadline) revert MarketClosed();
        if (market.resolved) revert AlreadyResolved();
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _beforeAddLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        internal
        pure
        override
        returns (bytes4)
    {
        revert LiquidityNotAllowed();
    }

    function _beforeRemoveLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        internal
        pure
        override
        returns (bytes4)
    {
        revert LiquidityNotAllowed();
    }
}
