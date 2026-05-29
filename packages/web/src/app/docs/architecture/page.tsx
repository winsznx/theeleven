import type { Metadata } from "next";

import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsPage } from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "Architecture",
  description:
    "Five components — the agent runtime, PropMarketHook (Uniswap v4), the x402 facilitator, commit-reveal resolution, and Farcaster frames.",
};

export default function DocsArchitecturePage() {
  return (
    <DocsPage pathname="/docs/architecture">
      <h1>Architecture</h1>
      <p>
        Regista 11 is five pieces that talk to each other through a single
        on-chain contract. The boundary between them is intentional — each
        is independently auditable, deployable, and replaceable.
      </p>

      <h2>The five components</h2>

      <h3>1. The agent runtime</h3>
      <p>
        A TypeScript service running 24/7 on Railway. It hosts all eleven
        personas in one Node process; each persona is a tactical lens that
        subscribes to the API-Football live feed and decides when its
        opening criteria are hit. When a persona acts, it derives its own
        wallet via BIP-44 and posts a transaction.
      </p>
      <p>
        Coverage: <strong>229 vitest tests</strong>, full mocked match
        fixtures.
      </p>

      <h3>2. PropMarketHook (Uniswap v4)</h3>
      <p>
        A Solidity contract that <em>is</em> a Uniswap v4 hook. The market
        IS the hook — its CREATE2 address encodes the v4 permission bitmap
        (<code>0x2A80</code>), and the hook's <code>beforeSwap</code>{" "}
        callback gates which addresses can take which side. Staking, reveal,
        and resolution are all hook methods.
      </p>
      <p>
        Coverage: <strong>67 forge tests, 100% line / branch / function</strong>.
      </p>

      <h3>3. The x402 facilitator</h3>
      <p>
        A small Node service that accepts an EIP-3009 typed-data signature
        from the staker, validates it against the PropMarketHook contract,
        and submits <code>transferWithAuthorization()</code> on the user's
        behalf — paying X Layer gas in OKB from a server-only relayer wallet.
        The user never holds OKB.
      </p>

      <h3>4. Commit–reveal resolution</h3>
      <p>
        Before staking opens, the agent commits{" "}
        <code>keccak256(question || params || salt)</code>. After staking
        closes, the agent reveals the pre-image; the contract checks the
        hash and reads the actual match outcome. The agent can&apos;t reshape
        a market after seeing stake flow.{" "}
        <a href="/docs/commit-reveal">More on commit–reveal →</a>
      </p>

      <h3>5. Farcaster Frames</h3>
      <p>
        Every market is also a Frame v2 surface. Cast{" "}
        <code>regista11.xyz/frame/&lt;market&gt;</code> in Warpcast; users
        stake in three taps without leaving the cast. Image / sign / submit
        routes are entirely server-side, so the client bundle stays unchanged.
      </p>

      <h2>Data flow, end to end</h2>
      <p>
        Reading top to bottom, this is what happens in the ~10 seconds
        between a match event and a stake landing on chain:
      </p>

      <CodeBlock language="text" label="data flow">{`API-Football live feed
        │
        ▼
Persona tick loop  (server-side, 11 personas in 1 Node process)
        │
        ▼  commit(keccak256(question || params || salt))
PropMarketHook   (Uniswap v4, X Layer 196)
        │
        │  ── staking window opens ──
        │
        ▼  EIP-3009 signature (USDT0)
x402 facilitator  ─── transferWithAuthorization ───▶ PropMarketHook
        │
        │  ── staking window closes ──
        ▼  reveal(question, params, salt)  + hash check
PropMarketHook   ── resolve(outcome) ──▶  payout in USDT0`}</CodeBlock>

      <h2>Chain and assets</h2>
      <p>
        Everything lives on X Layer mainnet. No bridges, no testnet, no
        secondary chains:
      </p>
      <ul>
        <li>
          <strong>Chain</strong>: X Layer mainnet, chainId <code>196</code>.
        </li>
        <li>
          <strong>Settlement token</strong>: USDT0 at{" "}
          <code>0x779Ded0c9e1022225f8E0630b35a9b54bE713736</code>. The
          EIP-712 domain name is literally{" "}
          <strong>USD₮0</strong> with the U+20AE TUGRIK glyph — the
          dApp matches it byte-for-byte.
        </li>
        <li>
          <strong>v4 PoolManager</strong>:{" "}
          <code>0x360e68faccca8ca495c1b759fd9eee466db9fb32</code>.
        </li>
        <li>
          <strong>Factory</strong>: PropMarketHookFactory — the address is
          recorded in <code>packages/contracts/deployments/xlayer-mainnet.json</code>{" "}
          at broadcast time. See <a href="/docs/reference">Reference</a>.
        </li>
      </ul>

      <h2>Test posture</h2>
      <p>
        Numbers as of this docs build:
      </p>
      <ul>
        <li>
          <strong>67</strong> forge tests across the contract suite — full
          line, branch, and function coverage.
        </li>
        <li>
          <strong>229</strong> vitest tests across the agent runtime —
          tick loop, market builders, wallet derivation, commit/reveal.
        </li>
        <li>
          <strong>~174</strong> vitest tests across the web —
          components, lib helpers, frame routes, API handlers.
        </li>
      </ul>

      <Callout variant="tip" title="Why split into five">
        <p>
          You could collapse the facilitator into the agent and the frame
          handlers into the dApp — but then a wallet bug would take the
          frames down, and a frame deploy could ripple into the relayer.
          The split is the price of being able to redeploy one piece while
          the rest keeps trading.
        </p>
      </Callout>
    </DocsPage>
  );
}
