import type { Metadata } from "next";

import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsPage } from "@/components/docs/DocsPage";
import { WEB_DEPLOYMENT } from "@/lib/deployment";

export const metadata: Metadata = {
  title: "Reference",
  description:
    "Contract addresses, chain config, and the GET /api/health and GET /api/status response shapes.",
};

/** Read the factory address from the deployment artifact bundled into
 *  the build via `src/data/deployments.json`. This is the same source
 *  the rest of the app uses — using fs+cwd at runtime in the standalone
 *  container resolves to a non-existent path. */
function readFactoryAddress(): string | null {
  return WEB_DEPLOYMENT.factory ?? null;
}

export default function DocsReferencePage() {
  const factory = readFactoryAddress();
  return (
    <DocsPage pathname="/docs/reference">
      <h1>Reference</h1>
      <p>
        Addresses, endpoints, response shapes. Numbers are read at build
        time from the actual deployment artifact where available.
      </p>

      <h2>Contract addresses</h2>
      <table>
        <thead>
          <tr>
            <th>Contract</th>
            <th>Address</th>
            <th>Network</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>PropMarketHookFactory</td>
            <td>
              <code>{factory ?? "Awaiting mainnet broadcast"}</code>
            </td>
            <td>X Layer 196</td>
          </tr>
          <tr>
            <td>USDT0</td>
            <td>
              <code>0x779Ded0c9e1022225f8E0630b35a9b54bE713736</code>
            </td>
            <td>X Layer 196</td>
          </tr>
          <tr>
            <td>v4 PoolManager</td>
            <td>
              <code>0x360e68faccca8ca495c1b759fd9eee466db9fb32</code>
            </td>
            <td>X Layer 196</td>
          </tr>
        </tbody>
      </table>

      <h2>Chain config</h2>
      <ul>
        <li>
          <strong>Network</strong>: X Layer mainnet
        </li>
        <li>
          <strong>Chain ID</strong>: <code>196</code>
        </li>
        <li>
          <strong>RPC</strong>:{" "}
          <a href="https://rpc.xlayer.tech">https://rpc.xlayer.tech</a>
        </li>
        <li>
          <strong>Explorer</strong>:{" "}
          <a href="https://www.oklink.com/x-layer">OKLink (oklink.com/x-layer)</a>
        </li>
        <li>
          <strong>Gas asset</strong>: OKB
        </li>
      </ul>

      <h2>GET /api/health</h2>
      <p>
        Cheap liveness probe used by Railway and the recording playbook.
        No on-chain reads beyond a single <code>getBlockNumber()</code>.
      </p>
      <CodeBlock language="json" label="response shape">{`{
  "status":    "ok" | "partial",
  "version":   string,                  // git SHA when set at deploy
  "chainId":   196,
  "factory":   string | null,           // factory address or null pre-broadcast
  "relayer":   "configured" | "missing",
  "appUrl":    string,
  "timestamp": string                   // ISO-8601
}`}</CodeBlock>

      <h2>GET /api/status</h2>
      <p>
        The judge-verifiable surface that <code>/status</code> renders.
        Aggregates the live agent <code>/health</code>, the on-chain
        factory state, and recent activity. Cached: agent leg 10 s,
        on-chain leg 30 s.
      </p>
      <CodeBlock language="json" label="response shape">{`{
  "generatedAt":         string,        // ISO-8601
  "factory":             string | null,
  "network":             "xlayer-mainnet",
  "chainId":             196,
  "deployedAtBlock":     string | null, // bigint as string
  "deployedAtISO":       string | null,

  "agent":               AgentHealth,   // see below
  "lastTickAgeSeconds":  number | null, // null if agent not online

  "activity": {
    "marketsCreated":  number,
    "stakesPlaced":    number | null,
    "resolutions":     number | null,
    "volumeMicros":    string         // bigint as string
  },
  "recentMarkets": Array<{
    "marketAddress": string,
    "agent":         string,
    "commitHash":    string,
    "blockNumber":   string           // bigint as string
  }>
}

// AgentHealth (discriminated union)
type AgentHealth =
  | { status: "online";  raw: { status: string; startedAt: string;
                                fixtureId: number | null;
                                personasActive: number;
                                personaSlugs: string[] } }
  | { status: "offline"; reason: string }
  | { status: "not-configured" };`}</CodeBlock>

      <Callout variant="info" title="Polling cadence">
        <p>
          The landing&apos;s SystemActiveHUD polls <code>/api/status</code>{" "}
          every 15 s. The <code>/status</code> page hard-renders on each
          navigation. The shape is backward-compatible with the original
          P21 consumer — additive fields only.
        </p>
      </Callout>

      <h2>Links</h2>
      <ul>
        <li>
          GitHub:{" "}
          <a href="https://github.com/winsznx/theeleven">github.com/winsznx/theeleven</a>
        </li>
        <li>
          Live status:{" "}
          <a href="https://regista11.xyz/status">regista11.xyz/status</a>
        </li>
        <li>
          Explorer:{" "}
          <a href="https://www.oklink.com/x-layer">www.oklink.com/x-layer</a>
        </li>
      </ul>
    </DocsPage>
  );
}
