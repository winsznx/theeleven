import type { Metadata } from "next";

import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsPage } from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "Farcaster Frames",
  description:
    "Every market is a Frame v2 surface. Cast regista11.xyz/frame/<address> and Warpcast users stake in three taps. Entirely server-side; zero client bundle weight.",
};

export default function DocsFramesPage() {
  return (
    <DocsPage pathname="/docs/frames">
      <h1>Farcaster Frames</h1>
      <p>
        Every Regista 11 market is also a Farcaster Frame v2 surface.
        Cast <code>regista11.xyz/frame/&lt;market&gt;</code> in Warpcast
        and any user can stake in three taps:{" "}
        <strong>pick amount → pick side → sign</strong>. The flow runs
        entirely inside the cast — they never leave the feed.
      </p>
      <p>
        The frame is implemented as three server routes that return
        Frame v2 metadata and handle the signed POSTs. None of it ships
        to the client bundle — it adds zero KB to the dApp.
      </p>

      <h2>The three routes</h2>
      <ul>
        <li>
          <code>/frame/[market]</code> — the initial GET that Warpcast
          renders. Returns Frame v2 metadata + the per-market image.
        </li>
        <li>
          <code>/api/frame/[market]/image</code> — the dynamic OG image
          for the market (question, persona, current side balances).
        </li>
        <li>
          <code>/api/frame/[market]/sign</code> — POST: produces the
          EIP-3009 typed-data the user&apos;s wallet will sign.
        </li>
        <li>
          <code>/api/frame/[market]/submit</code> — POST: takes the
          signed typed-data, hands it to the x402 facilitator, and
          returns the resulting tx hash so Warpcast can show success.
        </li>
      </ul>

      <h2>What the user sees</h2>
      <CodeBlock language="text" label="warpcast flow">{`┌───────────────────────────────────────────────┐
│  [persona color bar]                    LIVE  │
│  Il Regista · 23'                             │
│                                               │
│  Will HOME keep a clean sheet                 │
│  for the next 30 minutes?                     │
│                                               │
│       OVER 46% ▌▌▌▌▌▌▌▌    54% UNDER         │
│                                               │
│  [ $1 ]   [ $5 ]   [ $20 ]   [ custom ]      │
└───────────────────────────────────────────────┘
        │
        ▼  tap $5
┌───────────────────────────────────────────────┐
│  Stake $5 on:                                 │
│         [ OVER ]      [ UNDER ]               │
└───────────────────────────────────────────────┘
        │
        ▼  tap OVER
┌───────────────────────────────────────────────┐
│  Sign with your wallet:                       │
│  USDT0 transfer · $5.00 · valid 5 min         │
│            [ Sign ]                           │
└───────────────────────────────────────────────┘
        │
        ▼  wallet signs
        ▼  /api/frame/[market]/submit
┌───────────────────────────────────────────────┐
│  ✓ Staked  ·  view on OKLink ↗                │
└───────────────────────────────────────────────┘`}</CodeBlock>

      <h2>Auth cache</h2>
      <p>
        Between <code>/sign</code> and <code>/submit</code> the server
        holds a per-nonce pending authorization in an in-process Map.
        That lets <code>/submit</code> verify the signed payload matches
        the one we issued at <code>/sign</code> — no replay, no
        substitution. Cache entries TTL after the 5-minute{" "}
        <code>validBefore</code> window.
      </p>

      <CodeBlock language="ts">{`// packages/web/src/app/api/frame/[market]/auth-cache.ts (excerpt)
interface PendingAuth {
  nonce: Hex;
  validBefore: bigint;
  expiresAt: number;
  marketAddress: Address;
  amountMicros: bigint;
  side: "OVER" | "UNDER";
}

const cache = new Map<Hex /* nonce */, PendingAuth>();

export function rememberAuth(auth: PendingAuth) {
  cache.set(auth.nonce, auth);
}

export function consumeAuth(nonce: Hex): PendingAuth | null {
  const e = cache.get(nonce);
  if (!e || Date.now() > e.expiresAt) return null;
  cache.delete(nonce);
  return e;
}`}</CodeBlock>

      <Callout variant="note" title="Single-region caveat">
        <p>
          Each instance of the web service has its own auth cache. If a
          <code> /sign</code> request lands on instance A and the
          <code> /submit</code> follow-up lands on instance B, the user
          sees an &quot;Authorization expired&quot; frame and retries. The
          web service runs at <code>numReplicas: 1</code> on Railway
          specifically to avoid this split-brain. A shared KV (Upstash,
          Redis) would harden the path for horizontal scale.
        </p>
      </Callout>
    </DocsPage>
  );
}
