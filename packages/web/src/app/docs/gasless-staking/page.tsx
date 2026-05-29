import type { Metadata } from "next";

import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsPage } from "@/components/docs/DocsPage";

export const metadata: Metadata = {
  title: "Gasless Staking",
  description:
    "EIP-3009 transferWithAuthorization, the EIP-712 typed-data the user signs, and how the x402 facilitator relays the transfer while paying gas in OKB.",
};

export default function DocsGaslessPage() {
  return (
    <DocsPage pathname="/docs/gasless-staking">
      <h1>Gasless Staking</h1>
      <p>
        Regista 11 stakers never hold X Layer gas. They sign one EIP-712
        typed-data payload; the x402 facilitator submits the resulting
        EIP-3009 <code>transferWithAuthorization()</code> on chain and
        pays the OKB. The user&apos;s wallet shows{" "}
        <strong>Sign</strong>, not <strong>Confirm transaction</strong>.
      </p>

      <h2>The signed payload</h2>
      <p>
        The user signs an EIP-712 typed-data envelope that authorizes
        USDT0 to move from their wallet to the PropMarketHook for this
        market — and only this market — within a short validity window:
      </p>

      <CodeBlock language="ts">{`// What the wallet shows the user
{
  types: {
    EIP712Domain: [...],
    TransferWithAuthorization: [
      { name: "from",        type: "address" },
      { name: "to",          type: "address" },
      { name: "value",       type: "uint256" },
      { name: "validAfter",  type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce",       type: "bytes32" },
    ],
  },
  domain: {
    name:    "USD\\u20AE0",                  // ← the TUGRIK glyph
    version: "1",
    chainId: 196,                            // X Layer
    verifyingContract: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736",
  },
  primaryType: "TransferWithAuthorization",
  message: {
    from:        userAddress,
    to:          marketAddress,              // the specific hook
    value:       stakeAmountMicros,          // 6-decimal USDT0
    validAfter:  0n,
    validBefore: nowSec + 300n,              // 5-minute window
    nonce:       random32Bytes,              // unique per signature
  }
}`}</CodeBlock>

      <h2>The relay path</h2>
      <p>
        The dApp posts the user&apos;s signed payload to the x402
        facilitator. The facilitator:
      </p>
      <ol>
        <li>Recovers the signer address from the EIP-712 signature.</li>
        <li>
          Confirms the recovered address matches the <code>from</code>{" "}
          field, that <code>to</code> is a legitimate PropMarketHook
          deployed by the factory, and that the nonce hasn&apos;t been
          consumed.
        </li>
        <li>
          Submits{" "}
          <code>USDT0.transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)</code>{" "}
          using the server-only relayer wallet — paying X Layer gas in OKB.
        </li>
        <li>
          Returns the resulting tx hash to the dApp so the UI can link to
          OKLink.
        </li>
      </ol>

      <h2>USDT0 specifics</h2>
      <ul>
        <li>
          USDT0 is an upgrade of bridged USDT on X Layer. Its EIP-712
          domain name uses the U+20AE TUGRIK glyph:{" "}
          <strong>USD₮0</strong>. The dApp matches this byte-for-byte;
          using the ASCII <code>T</code> instead will produce a different
          domain separator and an invalid signature.
        </li>
        <li>
          Decimals: <strong>6</strong>. Internal amounts are micros —{" "}
          <code>5_000_000n</code> means $5.00.
        </li>
        <li>
          <code>validBefore</code> is enforced at chain time, not relay
          time. The dApp uses a 5-minute window to absorb any wallet
          signing latency.
        </li>
        <li>
          Each signature consumes a unique <code>nonce</code>. The
          relayer rejects replays; on-chain nonce-already-used reverts
          are surfaced to the UI as &quot;Authorization expired&quot;.
        </li>
      </ul>

      <Callout variant="warning" title="Legacy USDT is rejected">
        <p>
          Only USDT0 (<code>0x779Ded0c…E713736</code>) is the protocol&apos;s
          settlement asset. The pre-upgrade bridged USDT is a different
          contract with a different EIP-712 domain. The dApp surfaces a
          banner prompting the swap if the user&apos;s wallet only holds
          legacy USDT.
        </p>
      </Callout>

      <Callout variant="info" title="X Layer gasless ground-truth">
        <p>
          Per research, May 2026: this is the first documented EIP-3009
          gasless dApp on X Layer. If you find a prior production
          deployment, file an issue — we&apos;ll update this page.
        </p>
      </Callout>
    </DocsPage>
  );
}
