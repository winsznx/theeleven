// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Minimal view of a PropMarketHook market this relay can settle.
///         `resolve(uint8)` on the hook accepts outcome ∈ {1, 2} and is gated
///         to `msg.sender == resolver`; this relay is set as that `resolver`.
interface IResolvableMarket {
    function resolve(uint8 outcome) external;
}

/// @title  FlapResolutionRelay
/// @notice Resolver adapter for Regista 11 tournament markets.
///
///         A `PropMarketHook` market is deployed with one immutable `resolver`
///         address. Pointing that at an admin EOA means "trust the admin to
///         report the score." Pointing it here instead means "trust a
///         Flap-anchored outcome, behind a dispute window and a guardian
///         circuit-breaker."
///
///         Flow:
///           1. An authorized `oracle` calls `proposeOutcome(market, outcome)`.
///              The oracle key is fed by Flap's `WorldCupResolver` result on BNB
///              Chain — delivered today by an off-chain relayer reading Flap,
///              and replaceable later by a cross-chain message (LayerZero /
///              Hyperlane / CCIP) whose source is checked to be Flap's resolver.
///           2. A `disputeWindow` elapses. Within it, the `owner` (guardian)
///              may `veto(market)` a bad proposal — nothing has moved yet.
///           3. After the window, ANYONE may `finalize(market)`, which forwards
///              `resolve(outcome)` to the market. Payouts only become claimable
///              after this point.
///
///         This bounds the trust placed in the feed and guarantees a human
///         circuit-breaker before any money is redistributed. If a proposal is
///         never made (feed down), the market's own refund deadline returns
///         every stake — funds are never trapped here.
///
/// @dev    Outcome semantics mirror PropMarketHook: 1 = YES/OVER wins,
///         2 = NO/UNDER wins. 0 and 3 are rejected (3 is the hook's internal
///         void/refund marker, never an input).
contract FlapResolutionRelay {
    // ─── Types ───────────────────────────────────────────────────────────

    struct Proposal {
        uint8 outcome; // 1 or 2; 0 = no proposal recorded
        uint64 proposedAt; // block.timestamp of proposal
        bool finalized; // resolve() forwarded to the market
        bool vetoed; // guardian killed it
    }

    // ─── Config ──────────────────────────────────────────────────────────

    /// @notice Guardian. Can veto proposals, rotate the oracle, tune the
    ///         window, and hand off ownership.
    address public owner;

    /// @notice The key authorized to propose outcomes (fed by Flap's feed).
    address public oracle;

    /// @notice Seconds a proposal must rest before it can be finalized.
    uint64 public disputeWindow;

    uint64 public constant MIN_DISPUTE_WINDOW = 10 minutes;
    uint64 public constant MAX_DISPUTE_WINDOW = 7 days;

    /// @notice market => its current proposal.
    mapping(address => Proposal) public proposals;

    // ─── Events ──────────────────────────────────────────────────────────

    event OutcomeProposed(address indexed market, uint8 outcome, uint64 finalizableAt);
    event OutcomeVetoed(address indexed market, uint8 outcome);
    event OutcomeFinalized(address indexed market, uint8 outcome);
    event OracleUpdated(address indexed previousOracle, address indexed newOracle);
    event DisputeWindowUpdated(uint64 previousWindow, uint64 newWindow);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─── Errors ──────────────────────────────────────────────────────────

    error NotOwner();
    error NotOracle();
    error ZeroAddress();
    error InvalidOutcome();
    error WindowOutOfRange();
    error AlreadyProposed();
    error NoProposal();
    error AlreadyFinalized();
    error Vetoed();
    error WindowNotElapsed();

    // ─── Modifiers ───────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    constructor(address _owner, address _oracle, uint64 _disputeWindow) {
        if (_owner == address(0) || _oracle == address(0)) revert ZeroAddress();
        if (_disputeWindow < MIN_DISPUTE_WINDOW || _disputeWindow > MAX_DISPUTE_WINDOW) {
            revert WindowOutOfRange();
        }
        owner = _owner;
        oracle = _oracle;
        disputeWindow = _disputeWindow;
        emit OwnershipTransferred(address(0), _owner);
        emit OracleUpdated(address(0), _oracle);
        emit DisputeWindowUpdated(0, _disputeWindow);
    }

    // ─── Oracle: propose ─────────────────────────────────────────────────

    /// @notice Record a Flap-anchored outcome for `market`, starting its
    ///         dispute window. Reverts if a live (non-vetoed) proposal already
    ///         exists for this market.
    function proposeOutcome(address market, uint8 outcome) external onlyOracle {
        if (market == address(0)) revert ZeroAddress();
        if (outcome != 1 && outcome != 2) revert InvalidOutcome();

        Proposal storage p = proposals[market];
        if (p.finalized) revert AlreadyFinalized();
        // A live proposal (proposed, not vetoed) blocks re-proposal; a vetoed
        // one can be replaced with a corrected outcome.
        if (p.proposedAt != 0 && !p.vetoed) revert AlreadyProposed();

        proposals[market] = Proposal({
            outcome: outcome,
            proposedAt: uint64(block.timestamp),
            finalized: false,
            vetoed: false
        });

        emit OutcomeProposed(market, outcome, uint64(block.timestamp) + disputeWindow);
    }

    // ─── Guardian: veto ──────────────────────────────────────────────────

    /// @notice Kill a proposal inside its window (e.g. the feed pushed a wrong
    ///         score). The oracle may then propose a corrected outcome.
    function veto(address market) external onlyOwner {
        Proposal storage p = proposals[market];
        if (p.proposedAt == 0) revert NoProposal();
        if (p.finalized) revert AlreadyFinalized();
        if (p.vetoed) revert Vetoed();
        p.vetoed = true;
        emit OutcomeVetoed(market, p.outcome);
    }

    // ─── Anyone: finalize ────────────────────────────────────────────────

    /// @notice After the dispute window, forward the proposed outcome to the
    ///         market. Permissionless — once the window passes, settlement is
    ///         not gated on any privileged party.
    function finalize(address market) external {
        Proposal storage p = proposals[market];
        if (p.proposedAt == 0) revert NoProposal();
        if (p.vetoed) revert Vetoed();
        if (p.finalized) revert AlreadyFinalized();
        if (block.timestamp < uint256(p.proposedAt) + disputeWindow) revert WindowNotElapsed();

        p.finalized = true;
        emit OutcomeFinalized(market, p.outcome);
        IResolvableMarket(market).resolve(p.outcome);
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    function setOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert ZeroAddress();
        emit OracleUpdated(oracle, newOracle);
        oracle = newOracle;
    }

    function setDisputeWindow(uint64 newWindow) external onlyOwner {
        if (newWindow < MIN_DISPUTE_WINDOW || newWindow > MAX_DISPUTE_WINDOW) {
            revert WindowOutOfRange();
        }
        emit DisputeWindowUpdated(disputeWindow, newWindow);
        disputeWindow = newWindow;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /// @notice Timestamp after which `finalize(market)` will succeed, or 0 if
    ///         there is no live proposal.
    function finalizableAt(address market) external view returns (uint64) {
        Proposal storage p = proposals[market];
        if (p.proposedAt == 0 || p.vetoed || p.finalized) return 0;
        return p.proposedAt + disputeWindow;
    }
}
