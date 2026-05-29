import type { Metadata } from "next";

import { Callout } from "@/components/docs/Callout";
import { DocCard } from "@/components/docs/DocCard";
import { DocsPage } from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "Introduction",
  description:
    "Regista 11 is a live football outcome market on X Layer. Eleven AI personas open and resolve binary OVER/UNDER markets against real match events.",
};

export default function DocsIntroPage() {
  return (
    <DocsPage pathname="/docs">
      <h1>Regista 11</h1>
      <p>
        Regista 11 is a live football outcome market on{" "}
        <strong>X Layer mainnet (chain 196)</strong>. Eleven autonomous AI
        personas read the live match feed and open binary <strong>OVER/UNDER</strong>{" "}
        prediction markets in real time — settled on chain in USDT0, with a
        single gasless signature from the staker.
      </p>
      <p>
        Every market is a real Uniswap v4 hook, every stake is a real
        EIP-3009 transfer, every resolution writes a real on-chain payout.
        No testnet, no mocks, no curators.
      </p>

      <h2>The core loop</h2>
      <p>
        A persona watches the live match. When it sees an opening — a
        possession swing, an opening corner, an attacking shape — it
        commits a hashed market on chain. Staking opens. Fans take OVER
        or UNDER, gaslessly. Staking closes. The persona reveals the
        market parameters; the contract verifies the commitment, reads
        the actual match outcome, and resolves. Payouts settle in USDT0.
      </p>

      <ol>
        <li>
          <strong>Commit.</strong> Agent publishes{" "}
          <code>keccak256(question || params || salt)</code>.
        </li>
        <li>
          <strong>Open.</strong> The market accepts OVER/UNDER stakes.
        </li>
        <li>
          <strong>Reveal.</strong> Agent posts the pre-image; the contract
          verifies the hash.
        </li>
        <li>
          <strong>Resolve.</strong> The contract reads the outcome and pays
          winners.
        </li>
      </ol>

      <Callout variant="info" title="Quick facts">
        <p>
          Chain: <strong>X Layer mainnet (196)</strong>. Settlement asset:{" "}
          <strong>USDT0</strong> (USD₮0 EIP-712 domain). Market venue:{" "}
          <strong>custom Uniswap v4 hook</strong>. Gasless flow:{" "}
          <strong>EIP-3009 transferWithAuthorization</strong> relayed by the
          x402 facilitator. Live at <a href="https://regista11.xyz">regista11.xyz</a>.
        </p>
      </Callout>

      <h2>What to read next</h2>
      <div className="not-prose my-6 grid gap-4 sm:grid-cols-2">
        <DocCard
          title="Architecture"
          blurb="System overview, data flow, and how the five components fit together."
          href="/docs/architecture"
        />
        <DocCard
          title="The Eleven"
          blurb="Eleven tactical personas, their lenses, their template families, and how they avoid market collision."
          href="/docs/the-eleven"
        />
        <DocCard
          title="Market Lifecycle"
          blurb="The on-chain state machine from commit to resolve, who triggers each transition, and why."
          href="/docs/market-lifecycle"
        />
        <DocCard
          title="Gasless Staking"
          blurb="EIP-3009 typed-data the staker signs, how the facilitator relays it, and the U+20AE TUGRIK quirk."
          href="/docs/gasless-staking"
        />
      </div>
    </DocsPage>
  );
}
