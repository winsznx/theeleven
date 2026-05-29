import type { Metadata } from "next";

import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsPage } from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "The Hook",
  description:
    "PropMarketHook is a real Uniswap v4 hook — the market IS the hook. Permission bitmap 0x2A80, salt-mined CREATE2 address, 67 forge tests, 100% coverage.",
};

export default function DocsHookPage() {
  return (
    <DocsPage pathname="/docs/prop-market-hook">
      <h1>The Hook</h1>
      <p>
        PropMarketHook is a real Uniswap v4 hook. Not &quot;inspired by,&quot;
        not &quot;hook-shaped&quot; — the contract implements{" "}
        <code>IHooks</code>, lives at a CREATE2 address whose low bits
        encode the v4 permission bitmap, and is registered with the
        PoolManager as a hook for its pool. The market <strong>is</strong>{" "}
        the hook.
      </p>

      <h2>Permission bitmap</h2>
      <p>
        v4 packs the active permission flags into the trailing bits of
        the hook&apos;s CREATE2 address. PropMarketHook&apos;s factory salt-mines
        addresses whose low bits equal <code>0x2A80</code> — i.e. the
        hook participates in <code>beforeSwap</code>,{" "}
        <code>afterSwap</code>, <code>beforeInitialize</code>, and the
        liquidity-modification gates:
      </p>

      <CodeBlock language="solidity">{`// packages/contracts/src/PropMarketHook.sol (excerpt)
function getHookPermissions()
    public pure override returns (Hooks.Permissions memory)
{
    return Hooks.Permissions({
        beforeInitialize:      true,
        afterInitialize:       false,
        beforeAddLiquidity:    true,
        afterAddLiquidity:     false,
        beforeRemoveLiquidity: true,
        afterRemoveLiquidity:  false,
        beforeSwap:            true,
        afterSwap:             true,
        beforeDonate:          false,
        afterDonate:           false,
        beforeSwapReturnDelta:       false,
        afterSwapReturnDelta:        false,
        afterAddLiquidityReturnDelta:    false,
        afterRemoveLiquidityReturnDelta: false
    });
}`}</CodeBlock>

      <p>
        The factory&apos;s deploy path uses{" "}
        <code>HookMiner.find()</code> (from{" "}
        <code>v4-periphery/utils</code>) to grind a salt whose
        CREATE2 address satisfies the permission bits. Without that, the
        PoolManager rejects the hook on attach.
      </p>

      <h2>What <code>beforeSwap</code> gates</h2>
      <p>
        In v4 lingo, &quot;swap&quot; covers both OVER and UNDER stake
        flows for a prop market. <code>beforeSwap</code> is where the hook
        enforces the per-market rules:
      </p>
      <ul>
        <li>
          The market is currently in <code>Open</code> state — not
          Committed, not Closed.
        </li>
        <li>
          The stake amount is within the per-market min/max.
        </li>
        <li>
          The caller is the x402 facilitator&apos;s relayer (the only
          authorized writer of EIP-3009 transfers for this market).
        </li>
        <li>
          Optional: any persona-defined entry constraints from the
          revealed <code>templateParams</code>.
        </li>
      </ul>
      <p>
        If any check fails, <code>beforeSwap</code> reverts; the
        PoolManager rolls the whole interaction back atomically. There is
        no &quot;maybe partial stake&quot; case.
      </p>

      <h2>Test posture</h2>
      <p>The forge suite:</p>
      <ul>
        <li>
          <strong>67 tests</strong> total, split across
          <code> PropMarketHook.lifecycle.t.sol</code>,
          <code> PropMarketHook.stake.t.sol</code>,
          <code> PropMarketHook.refund.t.sol</code>,
          <code> PropMarketHook.resolve.t.sol</code>,
          <code> PropMarketHook.claim.t.sol</code>, and
          <code> PropMarketHookFactory.t.sol</code>.
        </li>
        <li>
          <strong>100%</strong> line, branch, and function coverage on the
          contracts directory.
        </li>
        <li>
          Mocks: <code>MockUSDT0.sol</code> reproduces the EIP-712 domain
          + 6-decimal balance behavior of the live USDT0 deployment.
        </li>
      </ul>

      <Callout variant="info" title="Why the hook is the market">
        <p>
          Two reasons. First, every market is independently addressable —
          you can link an OKLink page directly to its address; no
          &quot;market ID&quot; abstraction layered on top. Second, v4&apos;s
          singleton PoolManager handles all the accounting, so the hook
          doesn&apos;t reinvent custodial token math. We get atomicity for
          free.
        </p>
      </Callout>
    </DocsPage>
  );
}
