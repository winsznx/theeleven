import type { Metadata } from "next";

import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsPage } from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "The Eleven",
  description:
    "The eleven tactical personas, the markets each one opens, and how the protocol prevents collision when multiple personas act on the same match minute.",
};

export default function DocsElevenPage() {
  return (
    <DocsPage pathname="/docs/the-eleven">
      <h1>The Eleven</h1>
      <p>
        Regista 11 runs eleven personas, arranged like a tactical 4-3-3.
        Each is a separate Node module with its own opening criteria,
        market templates, and timing window — but all eleven live in one
        process and share the same on-chain commit interface.
      </p>
      <p>
        Each persona has a deterministic on-chain identity. The agent
        runtime derives an HD wallet per persona using BIP-44 against a
        single master mnemonic, so the eleven addresses are stable across
        restarts and reproducible from the seed alone.
      </p>

      <h2>The lineup</h2>

      <table>
        <thead>
          <tr>
            <th>Line</th>
            <th>Persona</th>
            <th>Lens</th>
            <th>Templates</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GK</td>
            <td><strong>L&apos;Ultimo</strong></td>
            <td>Last line — clean sheets</td>
            <td>CleanSheet</td>
          </tr>
          <tr>
            <td>DEF</td>
            <td><strong>Il Capitano</strong></td>
            <td>Left back, captain — discipline</td>
            <td>YellowCards, Fouls</td>
          </tr>
          <tr>
            <td>DEF</td>
            <td><strong>Il Libero</strong></td>
            <td>Sweeper — clean sheets + dead-ball</td>
            <td>CleanSheet, CornerCount</td>
          </tr>
          <tr>
            <td>DEF</td>
            <td><strong>Il Catenaccio</strong></td>
            <td>Defensive anchor — control</td>
            <td>CleanSheet, YellowCards</td>
          </tr>
          <tr>
            <td>DEF</td>
            <td><strong>L&apos;Ala</strong></td>
            <td>Wing-back — width + threat</td>
            <td>CornerCount, ShotsOnTarget</td>
          </tr>
          <tr>
            <td>MID</td>
            <td><strong>Il Mediano</strong></td>
            <td>Defensive enforcer — tempo</td>
            <td>Fouls, YellowCards</td>
          </tr>
          <tr>
            <td>MID</td>
            <td><strong>Il Regista</strong></td>
            <td>Deep-lying playmaker — distribution</td>
            <td>CleanSheet, Possession, CornerCount</td>
          </tr>
          <tr>
            <td>MID</td>
            <td><strong>Il Trequartista</strong></td>
            <td>Creative attacker — box entries</td>
            <td>NextGoal, ShotsOnTarget, CornerCount</td>
          </tr>
          <tr>
            <td>ATT</td>
            <td><strong>Il Numero Dieci</strong></td>
            <td>Number 10 — chance creation</td>
            <td>Possession, NextGoal, ShotsOnTarget</td>
          </tr>
          <tr>
            <td>ATT</td>
            <td><strong>Il Falso Nove</strong></td>
            <td>False nine — drops, links</td>
            <td>ShotsOnTarget, Possession, NextGoal</td>
          </tr>
          <tr>
            <td>ATT</td>
            <td><strong>Il Bomber</strong></td>
            <td>Pure striker — shots</td>
            <td>NextGoal, ShotsOnTarget</td>
          </tr>
        </tbody>
      </table>

      <h2>The seven market templates</h2>
      <p>
        Every persona writes against the same library of binary templates.
        Each template knows how to phrase its question, what parameters it
        accepts, and how to read the outcome from the live feed.
      </p>
      <ul>
        <li>
          <strong>CleanSheet</strong> — &quot;Will HOME keep a clean sheet for the next N minutes?&quot;
        </li>
        <li>
          <strong>Possession</strong> — &quot;Will HOME&apos;s possession stay above X% over the next window?&quot;
        </li>
        <li>
          <strong>CornerCount</strong> — &quot;Will there be N+ corners in the next window?&quot;
        </li>
        <li>
          <strong>NextGoal</strong> — &quot;Who scores the next goal in the next N minutes?&quot;
        </li>
        <li>
          <strong>ShotsOnTarget</strong> — &quot;Will HOME hit N+ shots on target in the next window?&quot;
        </li>
        <li>
          <strong>YellowCards</strong> — &quot;Will N+ yellow cards be shown in the next window?&quot;
        </li>
        <li>
          <strong>Fouls</strong> — &quot;Will there be N+ fouls in the next window?&quot;
        </li>
      </ul>

      <h2>Wallet derivation</h2>
      <p>
        Eleven persona addresses, one mnemonic. The agent derives each
        persona&apos;s wallet at path <code>m/44&apos;/60&apos;/0&apos;/0/i</code>{" "}
        for <code>i</code> in 0..10:
      </p>

      <CodeBlock language="ts">{`// packages/agent/src/clients/walletClients.ts (excerpt)
import { mnemonicToAccount } from "viem/accounts";

export function deriveAgentAccount(mnemonic: string, index: number) {
  if (index < 0 || index >= 11) {
    throw new Error(\`persona index out of range: \${index}\`);
  }
  return mnemonicToAccount(mnemonic, {
    accountIndex: index,
    addressIndex: 0,
  });
}`}</CodeBlock>

      <p>
        All eleven personas run in a single Node process — one tick loop
        scheduler, one RPC pool, eleven signing accounts. They share the
        live-feed subscription so we open exactly one socket to API-Football
        regardless of fixture count.
      </p>

      <Callout variant="tip" title="Why multiple personas can act on the same minute">
        <p>
          Two personas can open markets in the same match-minute without
          collision because the agent address is part of the
          <code>marketId</code> hash. The factory derives the market address
          from <code>keccak256(commit || agent || nonce)</code>, so even
          identical templates from different personas land at different
          CREATE2 addresses. There is no per-minute lock; the tactical
          overlap is the feature.
        </p>
      </Callout>
    </DocsPage>
  );
}
