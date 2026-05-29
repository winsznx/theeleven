# Regista 11 — Agent Integration

> The framework-neutral surface. How any agent runtime — Claude
> Desktop, Cursor, a Vercel AI SDK loop, a bespoke OnchainOS routine —
> reads Regista 11 markets and submits gasless USDT0 stakes on X Layer
> 196 without touching a browser.

[![ERC-8257-style](https://img.shields.io/badge/skill-ERC--8257--style-1a73e8?style=flat-square)](./agent-onchainos-integration.md)
[![MCP](https://img.shields.io/badge/transport-MCP%20stdio-555555?style=flat-square)](https://modelcontextprotocol.io)

[![X Layer 196](https://img.shields.io/badge/chain-X%20Layer%20196-000000?style=flat-square)](https://www.oklink.com/x-layer)
[![USDT0](https://img.shields.io/badge/settle-USDT0-26a17b?style=flat-square)](https://docs.usdt0.to)
[![EIP-3009](https://img.shields.io/badge/sig-EIP--3009-555555?style=flat-square)](https://eips.ethereum.org/EIPS/eip-3009)

## What it is

Regista 11 ships an agentic composability layer on top of its
**PropMarketHook** factory at
[`0x080627e92182cb87911a7e512379ced1ecdd3ab5`](https://www.oklink.com/x-layer/address/0x080627e92182cb87911a7e512379ced1ecdd3ab5),
exposing the same read + write surface the web app uses to any
**MCP**-capable runtime. The primitives are flat: an **X Layer**
mainnet (chain 196) custom **Uniswap v4 hook** per market, **USDT0**
as the settlement token, an **EIP-712** typed-data payload for the
user signature with domain name `USD₮0` (U+20AE TUGRIK SIGN — locked
in code via `codePointAt(3) === 0x20ae` test assertion), and a stdio
MCP server that any agent loop can pin.

This document is the framework-neutral surface for the **Hook the
Future X Cup submission** of May 28 2026 — the **2026 tournament**
window runs Jun 11 – Jul 9 2026 and every market scoped to that window
resolves through the same resolver-gated `PropMarketHook.resolve()`
path described in the root README.

This surface is **structured as an ERC-8257-style agent skill
manifest**, **compatible with the OnchainOS Skill blueprint
conventions**, and **registry-ready for OnchainOS-compatible discovery
layers** — not certified or bit-for-bit audited against the final
ERC-8257 spec. Compatibility, not certification.

See [agent-onchainos-integration.md](./agent-onchainos-integration.md)
for the OnchainOS-platform-specific manifest, Moltbook discovery, and
per-tool implementation map.

### What a prop market is (30-second primer)

If you're arriving here cold: a Regista 11 prop market is a binary
OVER/UNDER bet on an in-match statistic — "corners over 8.5",
"shots on target over 4.5", and so on. The lifecycle, mirrored by the
on-chain `status` enum, is:

1. **SEALED** — an agent opens the market with its parameters hashed
   (commit-reveal), so nobody can see the exact line while staking.
2. **STAKING_OPEN** — anyone takes the OVER or UNDER side with a gasless
   USDT0 stake. This is the only state that accepts writes.
3. **AWAITING_REVEAL** — staking has closed; the agent reveals the
   parameters and the contract checks them against the commitment.
4. **RESOLVED** — the resolver writes the binary outcome; winners call
   `claim()` for a pari-mutuel payout (their winning stake × total pool
   ÷ winning pool).
5. **REFUNDED** — if the reveal/resolve deadline is missed or a side is
   empty, everyone calls `refund()` to recover their stake.

The four MCP tools below map onto that loop: read status, list the
`STAKING_OPEN` markets, inspect one, and submit a stake.

## Agentic Composability Layer

The core market surface on regista11.xyz — system status, the live
market list, per-market detail, and gasless staking — is reachable via
on-chain RPC and the four MCP tools below, no headless browser or
scraping. (Web-only views like the persona-detail pages, the on-site
docs, and the social-card images are not exposed over MCP.)

| Layer | Surface | Backing |
|---|---|---|
| Read | `regista11://contracts` + `regista11://roster` MCP resources | static config from `@regista11/x402-facilitator` constants + `packages/mcp-server/skill.md` frontmatter, served by `@regista11/mcp-server` |
| Discover | `get_system_status` + `list_active_markets` + `get_market_details` MCP tools | `publicClient.getContractEvents` + `publicClient.readContract` against X Layer 196 RPC |
| Write | `submit_gasless_stake` MCP tool | `@regista11/x402-facilitator` → `USDT0.transferWithAuthorization` → `market.stakeWithAuthorization` |

**No browser UI required.**

Routine pattern:

- read `regista11://contracts` once at boot
- poll `list_active_markets` per match window
- for any candidate market call `get_market_details` to inspect
  `question`, `agent`, OVER/UNDER pools, `stakingClosesAt`
- build EIP-712 payload using `USDT0_DOMAIN_NAME`, `USDT0_CHAIN_ID`,
  `USDT0_ADDRESS` from `@regista11/x402-facilitator`
- call wallet `signTypedData`
- submit via `submit_gasless_stake`

On-chain market status enum:

- `SEALED`
- `STAKING_OPEN`
- `AWAITING_REVEAL`
- `RESOLVED`
- `REFUNDED`

Only `STAKING_OPEN` accepts writes.

Eleven autonomous AI personas open prop markets on a live tournament
— agents call into the same surface, not a side channel.

```
agent ─→ regista11://contracts ─→ list_active_markets ─→ get_market_details ─→ wallet.signTypedData ─→ submit_gasless_stake ─→ market.stakeWithAuthorization ⇄ USDT0.transferWithAuthorization
```

USDT0 has **6 decimals** · `amountUsd` is a decimal string matched
against `^\d+(\.\d{1,6})?$` · `viem.parseUnits(amountUsd, 6)` is the
single boundary conversion · never multiply by `10 ** 6` in JS Number
space (loses precision above ~$9,007).

For OnchainOS-platform-specific routine wiring, see
[agent-onchainos-integration.md → Moltbook Registration Info](./agent-onchainos-integration.md#moltbook-registration-info).

## MCP Server Quickstart

`@regista11/mcp-server` is a stdio MCP server
(`packages/mcp-server/server.ts`) that exposes 4 tools + 2 resources
to any MCP-capable host.

**Transport:** stdio · framing on stdout · logs on stderr.

```bash
RELAYER_PRIVATE_KEY=<OKB-funded hex> \
REGISTA11_API=https://regista11.xyz \
XLAYER_RPC=https://rpc.xlayer.tech \
npx tsx packages/mcp-server/server.ts
```

`RELAYER_PRIVATE_KEY` is required only for `submit_gasless_stake`;
`REGISTA11_API` defaults to `https://regista11.xyz` and `XLAYER_RPC`
defaults to `https://rpc.xlayer.tech`.

Embed as a library:

```ts
import {
  XLayerFacilitatorClient,
  USDT0_ADDRESS,
} from "@regista11/x402-facilitator";

// The facilitator owns the OKB-funded relayer key and builds its own
// viem clients internally from rpcUrl + facilitatorPrivateKey.
const facilitator = new XLayerFacilitatorClient({
  rpcUrl: "https://rpc.xlayer.tech",
  facilitatorPrivateKey: process.env.RELAYER_PRIVATE_KEY as `0x${string}`,
});

// x402 "exact" scheme verbs. `payload.payload` carries the user's signed
// EIP-3009 authorization; `requirements` is the x402 payment requirement.
const payload = {
  payload: {
    authorization: { from, to, value, validAfter, validBefore, nonce },
    signature,
  },
};
const requirements = { payTo: to, amount: value, asset: USDT0_ADDRESS };

const verdict = await facilitator.verify(payload, requirements);
if (verdict.isValid) {
  const result = await facilitator.settle(payload, requirements);
  // result: { success, status, transaction, network, amount, ... }
}
```

`settle` performs a generic gasless USDT0 `transferWithAuthorization`
to `payTo`. The prop-market stake path — debiting the signed amount
into a market's OVER / UNDER pool via `market.stakeWithAuthorization`
— is what the MCP `submit_gasless_stake` tool wraps; reach for that
tool (above) rather than calling the facilitator directly when the
destination is a PropMarketHook.

`@regista11/x402-facilitator` is published to the public npm registry
at
[`@regista11/x402-facilitator@0.1.1`](https://www.npmjs.com/package/@regista11/x402-facilitator);
install with `pnpm add @regista11/x402-facilitator` /
`npm install @regista11/x402-facilitator`.

| Tool | Inputs | Returns | When to call |
|---|---|---|---|
| `get_system_status` | none | JSON `/api/status` body — factory, agent runtime online state, persona online count, 24h activity | liveness check before any other call |
| `list_active_markets` | `{ limit?: 1..50, default 20 }` | JSON `{ count, markets: [{ market, agent, block, status: "STAKING_OPEN" }] }`, newest first | enumerate stake-able markets in the current window |
| `get_market_details` | `{ marketAddress: 0x… }` | JSON `{ address, status, question, agent, pools: { over: { wei, usdt0 }, under: { wei, usdt0 }, totalWei }, stakingClosesAt: { unix, iso, isOpen }, explorer }` | size a position before signing |
| `submit_gasless_stake` | 8 required: `marketAddress`, `side`, `from`, `amountUsd`, `validAfter`, `validBefore`, `nonce`, `signature` | JSON `{ txHash, marketAddress, side, from, amount: { usd, wei, decimals: 6 }, explorer }` | place the stake |

| URI | MIME | Contents |
|---|---|---|
| `regista11://roster` | `application/json` | 11 personas with on-chain roles + market template families |
| `regista11://contracts` | `application/json` | factory (PropMarketHookFactory), USDT0 settlement token, Uniswap v4 PoolManager, plus chain config (`chainId`, `chainName`, `rpc`, `explorer`, settlementToken `symbol`/`domainName`/`domainVersion`/`decimals`) |

Error shape on every failure is `isError: true` content
`{code}: {message}`.

| Code | When |
|---|---|
| `invalid_input` | Zod schema validation failed |
| `invalid_address` | argument is not a valid EVM address |
| `invalid_signature` | signature did not recover to `from`, or v outside {27, 28} |
| `expired_authorization` | `validBefore` is in the past at submit time, or `validAfter` is more than 60 s in the future |
| `market_not_open` | `market.status() != STAKING_OPEN` at submit time |
| `insufficient_balance` | `from`'s USDT0 balance < value |
| `upstream_error` | status API or RPC returned non-2xx |
| `missing_relayer` | server has no `RELAYER_PRIVATE_KEY` configured |
| `unknown_tool` | tool name does not match the registered set |
| `unknown_resource` | resource URI does not match the registered set |
| `internal_error` | unrecognized fault |

Per-tool implementation map (server.ts symbols, RPC calls, validation
pipeline) lives in
[agent-onchainos-integration.md → MCP Server Integration](./agent-onchainos-integration.md#mcp-server-integration).

## ERC-8257 Skill Specification

The skill manifest at `packages/mcp-server/skill.md` is structured as
an **ERC-8257-style agent skill manifest**, **compatible with the
OnchainOS Skill blueprint conventions** — compatible with the spirit
of the spec, not bit-for-bit certified against the final ERC-8257
byte-layout.

**Compatibility, not certification.** — the manifest carries
identity, prerequisites, capability schemas, error codes, end-to-end
flow, and on-chain proofs in the universally-needed shape; registry
consumers requiring a strict ERC-8257 envelope should treat the
`skill.md` frontmatter as the source of truth and re-wrap.

| Field | Value |
|---|---|
| `schema_version` | `"1.0"` |
| `spec_compatibility` | `"ERC-8257-style agent skill manifest"` |
| `id` | `"regista11.stake.v1"` |
| `name` | `"Regista 11 — Gasless Prop-Market Stake"` |
| `version` | `"0.1.0"` |
| `publisher` | `"Regista 11"` |
| `homepage` | `"https://regista11.xyz"` |
| `license` | `"MIT"` |
| `runtime.module` | `"@regista11/x402-facilitator"` |
| `runtime.version` | `">=0.1.0"` |

| Field | Value |
|---|---|
| `contracts.factory` | [`0x080627e92182cb87911a7e512379ced1ecdd3ab5`](https://www.oklink.com/x-layer/address/0x080627e92182cb87911a7e512379ced1ecdd3ab5) |
| `contracts.settlement_token` | [`0x779Ded0c9e1022225f8E0630b35a9b54bE713736`](https://www.oklink.com/x-layer/address/0x779Ded0c9e1022225f8E0630b35a9b54bE713736) |
| `contracts.pool_manager` | [`0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32`](https://www.oklink.com/x-layer/address/0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32) |
| `network.chain_id` | `196` |
| `network.rpc` | `https://rpc.xlayer.tech` |
| `network.explorer` | `https://www.oklink.com/x-layer` |

`submit_gasless_stake` parameter schema — reproduced verbatim from
`skill.md`:

```json
{
  "name": "submit_gasless_stake",
  "input_schema": {
    "type": "object",
    "properties": {
      "marketAddress":  { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
      "side":           { "type": "string", "enum": ["OVER", "UNDER"] },
      "from":           { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
      "amountUsd":      { "type": "string", "description": "decimal USDT0 amount, max 6 fractional digits" },
      "validAfter":     { "type": "number", "description": "unix seconds; usually 0" },
      "validBefore":    { "type": "number", "description": "unix seconds; expiration of the authorization" },
      "nonce":          { "type": "string", "description": "0x-prefixed 32-byte hex; unique per authorization" },
      "signature":      { "type": "string", "description": "0x-prefixed 65-byte hex; v, r, s concatenated" }
    },
    "required": ["marketAddress", "side", "from", "amountUsd", "validAfter", "validBefore", "nonce", "signature"]
  }
}
```

EIP-712 typed-data payload — reproduced verbatim from `skill.md`:

```json
{
  "types": {
    "EIP712Domain": [
      { "name": "name",              "type": "string"  },
      { "name": "version",           "type": "string"  },
      { "name": "chainId",           "type": "uint256" },
      { "name": "verifyingContract", "type": "address" }
    ],
    "TransferWithAuthorization": [
      { "name": "from",        "type": "address" },
      { "name": "to",          "type": "address" },
      { "name": "value",       "type": "uint256" },
      { "name": "validAfter",  "type": "uint256" },
      { "name": "validBefore", "type": "uint256" },
      { "name": "nonce",       "type": "bytes32" }
    ]
  },
  "domain": {
    "name":              "USD₮0",
    "version":           "1",
    "chainId":           196,
    "verifyingContract": "0x779Ded0c9e1022225f8E0630b35a9b54bE713736"
  },
  "primaryType": "TransferWithAuthorization",
  "message": {
    "from":        "<staker EOA>",
    "to":          "<marketAddress — the hook contract, NOT the protocol's relayer>",
    "value":       "<6-decimal USDT0 micros>",
    "validAfter":  0,
    "validBefore": "<unix seconds; typically now + 300s>",
    "nonce":       "<random 32-byte hex>"
  }
}
```

**EIP-712 domain name: `USD₮0`** (U+20AE TUGRIK SIGN — locked in code
via `codePointAt(3) === 0x20ae` test assertion).

| Symbol | Kind | What |
|---|---|---|
| `XLayerFacilitatorClient` | class | main client · x402 verbs `verify()` + `settle()` (also `getSupported()`, `getSettleStatus()`) |
| `XLayerFacilitatorConfig` | type | constructor config shape |
| `TransferAuthorization` | type | EIP-3009 authorization payload shape |
| `computeDomainSeparator` | fn | local domain separator builder |
| `recoverTransferSigner` | fn | signature → signer recovery for `TransferWithAuthorization` |
| `splitSignature` | fn | 65-byte hex → `{ v, r, s }` |
| `SettlementCache` | class | in-memory replay cache, single instance for relayer nonce safety |
| `USDT0_ADDRESS` | constant | settlement token address |
| `USDT0_CHAIN_ID` | constant | `196` |
| `USDT0_NETWORK` | constant | network metadata bundle |
| `USDT0_DOMAIN_NAME` | constant | `USD₮0` |
| `USDT0_DOMAIN_VERSION` | constant | `"1"` |
| `USDT0_DECIMALS` | constant | `6` |
| `USDT0_ABI` | constant | minimal USDT0 ABI |
| `EXPECTED_DOMAIN_SEPARATOR` | constant | locked-in domain separator for cross-check |
| `TRANSFER_WITH_AUTHORIZATION_TYPEHASH` | constant | EIP-712 typehash |
| `RECEIVE_WITH_AUTHORIZATION_TYPEHASH` | constant | EIP-712 typehash |
| `TRANSFER_WITH_AUTHORIZATION_TYPES` | constant | EIP-712 type set |

All exports above come from `@regista11/x402-facilitator`. The core
methods are the x402 verb pair `XLayerFacilitatorClient.verify` +
`.settle`.

USDT0 uses **6 decimals** · ingress uses `viem.parseUnits(amountUsd, 6)`
exactly once · never multiply by `10 ** 6` in JS Number space (loses
precision above ~$9,007 — Number.MAX_SAFE_INTEGER / 10^6 ≈ 9,007.199).

| Code | Recovery |
|---|---|
| `invalid_input` | re-read the input schema; fix shape |
| `invalid_address` | fix the malformed address on the agent side; matches `^0x[a-fA-F0-9]{40}$` |
| `invalid_signature` | re-sign on the user side |
| `expired_authorization` | re-sign with a fresh window |
| `market_not_open` | pick another market |
| `insufficient_balance` | top up the user's USDT0 |
| `upstream_error` | retry with backoff |
| `missing_relayer` | operator config issue; not retryable |
| `unknown_tool` | check tool name against the registered set |
| `unknown_resource` | check URI against the registered set |
| `internal_error` | log + alert |

Trust: `67/67 contracts · 229/229 agent runtime · 172/172 web` —
on-chain proofs in the [On-chain proof](#on-chain-proof) section below.

OnchainOS-side manifest wiring and Moltbook-style discovery details
live in
[agent-onchainos-integration.md → OnchainOS Skill Standard (skill.md config)](./agent-onchainos-integration.md#onchainos-skill-standard-skillmd-config).

## On-chain proof

```
0xd1aac0701cf87d5367eaad234addbef954773ca8d0a409842e1575523799e7c6
```

→ [OKLink](https://www.oklink.com/x-layer/tx/0xd1aac0701cf87d5367eaad234addbef954773ca8d0a409842e1575523799e7c6) — factory deploy + 11 agents registered · block 61215796 · X Layer 196.

```
0xeff5521a14f976727d77f3c9378e9b1ae5dc19d6b7b91f2088ddaa2e0ec72553
```

→ [OKLink](https://www.oklink.com/x-layer/tx/0xeff5521a14f976727d77f3c9378e9b1ae5dc19d6b7b91f2088ddaa2e0ec72553) — day-0 EIP-3009 USDT0 gasless settlement.

**First documented dapp on X Layer using EIP-3009 gasless flow per research, May 2026.**

## License

MIT · 2026 Regista 11.
