import type { Metadata } from "next";

import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsPage } from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "Market Lifecycle",
  description:
    "Every market is a five-state on-chain state machine: Committed, Open, Closed, Revealed, Resolved. Who triggers each transition and what's recorded.",
};

export default function DocsLifecyclePage() {
  return (
    <DocsPage pathname="/docs/market-lifecycle">
      <h1>Market Lifecycle</h1>
      <p>
        Every market goes through five on-chain states. The transitions
        are deterministic, time-bounded, and each one is enforced by the
        PropMarketHook contract — no off-chain bookkeeping is trusted.
      </p>

      <h2>The state machine</h2>
      <CodeBlock language="text" label="states">{`Committed ──▶ Open ──▶ Closed ──▶ Revealed ──▶ Resolved
                                                  │
                                                  └──▶ Refunded   (only if reveal fails / dispute)`}</CodeBlock>

      <h3>1. Committed</h3>
      <p>
        The agent calls <code>commit(commitHash, params)</code>. The factory
        deploys a hook at a CREATE2 address derived from{" "}
        <code>(commitHash, agent, nonce)</code>. The market exists on chain
        but accepts no stakes yet.
      </p>
      <p>
        The commit is <code>keccak256(question || templateParams || salt)</code>{" "}
        — a binding pre-commitment to exactly which market this will
        become. The agent can&apos;t walk it back without revealing the
        salt.
      </p>

      <h3>2. Open</h3>
      <p>
        At <code>openAt</code>, the hook starts accepting stakes. The OVER
        and UNDER sides each track aggregate USDT0. Stakers transfer in
        gaslessly via the x402 facilitator (see{" "}
        <a href="/docs/gasless-staking">Gasless Staking</a>); the hook&apos;s
        <code>beforeSwap</code> path verifies the EIP-3009 authorization
        before crediting either side.
      </p>

      <h3>3. Closed</h3>
      <p>
        At <code>closeAt</code>, the hook stops accepting new stakes. The
        market is now frozen in size. This window — between Close and
        Reveal — is what makes commit–reveal honest: the agent commits the
        market <em>before</em> knowing how much money is on each side.
      </p>

      <h3>4. Revealed</h3>
      <p>
        The agent calls <code>reveal(question, templateParams, salt)</code>.
        The contract recomputes the hash, checks it equals the original
        commit, and stores the now-public market parameters. If the hash
        doesn&apos;t match, the call reverts; the market enters a refund
        window instead.
      </p>

      <h3>5. Resolved</h3>
      <p>
        Once the outcome window has elapsed (e.g. the question covered the
        next 30 minutes), anyone can call <code>resolve()</code>. The
        contract reads the outcome from the configured oracle interface,
        decides winner = OVER or UNDER, and unlocks payouts. Winners claim
        pro-rata against the losing pool, minus a small protocol fee.
      </p>

      <h2>The on-chain commit struct</h2>
      <p>
        The factory stores the minimum needed to verify a future reveal.
        Everything else is reconstructable from the inputs to the hash:
      </p>

      <CodeBlock language="solidity">{`// packages/contracts/src/interfaces/IPropMarketHook.sol (excerpt)
struct CommitParams {
    bytes32 commitHash;   // keccak256(question || templateParams || salt)
    address agent;        // persona wallet — part of the marketId derivation
    uint64  openAt;       // when staking starts (unix seconds)
    uint64  closeAt;      // when staking ends
    uint64  resolveAfter; // earliest resolve() time
    address settlement;   // USDT0 on X Layer
}`}</CodeBlock>

      <h2>The reveal + resolve pair</h2>
      <p>
        Reveal is the only place the question text becomes public on chain.
        Resolve is the only place USDT0 actually moves between sides:
      </p>

      <CodeBlock language="solidity">{`function reveal(
    string calldata question,
    bytes calldata templateParams,
    bytes32 salt
) external {
    bytes32 expected = keccak256(abi.encodePacked(question, templateParams, salt));
    if (expected != commitHash) revert RevealHashMismatch();
    // ... store question + params, emit Revealed event
}

function resolve() external afterResolveAt {
    Outcome o = _readOutcome(question, templateParams);
    winningSide = o == Outcome.Over ? Side.Over : Side.Under;
    // ... unlock claim() for winners
}`}</CodeBlock>

      <Callout variant="note" title="Why staking closes before reveal">
        <p>
          If the agent could reveal during the staking window, it could
          pick markets whose parameters favor whichever side accumulated
          more capital — silent rebalancing. By forcing staking to close
          before the question text becomes public, the agent commits to a
          market before knowing the money flow. The commitment hash is
          what makes that auditable.
        </p>
      </Callout>
    </DocsPage>
  );
}
