import type { Metadata } from "next";

import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsPage } from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "Commit–Reveal",
  description:
    "The anti-front-run primitive: agents commit a keccak256 hash before staking opens, reveal only after it closes. The contract verifies the pre-image.",
};

export default function DocsCommitRevealPage() {
  return (
    <DocsPage pathname="/docs/commit-reveal">
      <h1>Commit–Reveal</h1>
      <p>
        Commit–reveal is what makes the agent honest. Before staking on
        a market opens, the agent posts a hash of the market parameters;
        the actual parameters stay secret. After staking closes, the
        agent reveals the pre-image. The contract recomputes the hash
        and verifies it matches. If it doesn&apos;t, the reveal reverts
        and the market refunds.
      </p>
      <p>
        Without this, the agent could look at how money has flowed onto
        each side of a market mid-stake and rewrite the question to
        favor the heavier side. With it, the question text is bound
        before the agent knows the flow.
      </p>

      <h2>Why it matters</h2>
      <p>
        A live-feed-driven market is uniquely exposed to a class of
        attacks where the operator silently reshapes the question to
        bias the outcome. Two examples:
      </p>
      <ul>
        <li>
          <strong>Window slip.</strong> The agent declares &quot;clean
          sheet in the next 15 minutes,&quot; then quietly extends to 20
          minutes after seeing OVER over-stake. Commit–reveal blocks this
          because the window is in the committed hash.
        </li>
        <li>
          <strong>Param swap.</strong> The agent declares
          &quot;possession &gt; 55%,&quot; then swaps to 52% once UNDER
          dominates. The pre-image of the hash pins the threshold.
        </li>
      </ul>

      <h2>The hash</h2>
      <p>
        Every market commits exactly one 32-byte value to the chain. It
        is a domain-separated keccak of three fields:
      </p>
      <ul>
        <li>
          <code>question</code> — the human-readable question string.
        </li>
        <li>
          <code>templateParams</code> — the encoded template parameters
          (e.g. window seconds, threshold, side). One canonical encoding
          per template.
        </li>
        <li>
          <code>salt</code> — a 32-byte random the agent generates per
          market. Prevents pre-image discovery by guessing.
        </li>
      </ul>

      <CodeBlock language="solidity">{`// On-chain check inside reveal()
bytes32 expected = keccak256(abi.encodePacked(
    question,
    templateParams,
    salt
));
if (expected != s.commitHash) revert RevealHashMismatch();`}</CodeBlock>

      <h2>The agent side</h2>
      <p>
        Off-chain, the agent generates the salt with a CSPRNG, encodes
        the template params canonically, then publishes the hash:
      </p>

      <CodeBlock language="ts">{`// packages/agent/src/markets/commit.ts (excerpt)
import { encodePacked, keccak256, toHex } from "viem";
import { randomBytes } from "node:crypto";

export function buildCommit(question: string, templateParams: Hex) {
  const salt = toHex(randomBytes(32));
  const commitHash = keccak256(
    encodePacked(["string", "bytes", "bytes32"], [question, templateParams, salt])
  );
  return { commitHash, salt };
}

// at commit time, only commitHash goes on chain.
// the agent stores { question, templateParams, salt } in its local
// SQLite to use later in reveal().`}</CodeBlock>

      <h2>What if reveal fails?</h2>
      <p>
        Two ways reveal can fail: (1) the agent reveals different
        <code> templateParams</code> than it committed, or (2) the agent
        never reveals at all. Both cases route into the refund window:
      </p>
      <ul>
        <li>
          If <code>reveal()</code> reverts because the hash doesn&apos;t
          match, the market goes straight to <code>Refunded</code> —
          stakers withdraw their original deposit in USDT0, minus relayer
          gas cost.
        </li>
        <li>
          If the agent never calls <code>reveal()</code> within the
          <code> revealDeadline</code>, anyone can call{" "}
          <code>refund()</code> on the market — same outcome for stakers.
        </li>
      </ul>

      <Callout variant="tip" title="The agent can't cheat without losing">
        <p>
          A misbehaving agent that tries to swap parameters at reveal
          time burns its own bond (agents post collateral when
          committing a market). The clean path for the agent is also the
          honest one — there&apos;s no economic incentive to reveal-cheat
          on a stake-bearing market.
        </p>
      </Callout>
    </DocsPage>
  );
}
