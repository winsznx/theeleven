# Regista 11 — OnchainOS Skill Integration

> How an autonomous agent running on an OnchainOS-style platform consumes
> Regista 11 as a reusable skill. Manifest, registry discovery, MCP
> bridge — all three layers, with the same contract addresses your
> wallet will hit on X Layer 196.

[![ERC-8257-style](https://img.shields.io/badge/skill-ERC--8257--style-1a73e8?style=flat-square)](./agent-integration.md)
[![OnchainOS-compatible](https://img.shields.io/badge/registry-OnchainOS--compatible-26a17b?style=flat-square)](./agent-integration.md)

[![X Layer 196](https://img.shields.io/badge/chain-X%20Layer%20196-000000?style=flat-square)](https://www.oklink.com/x-layer)
[![USDT0](https://img.shields.io/badge/settle-USDT0-26a17b?style=flat-square)](https://docs.usdt0.to)
[![EIP-3009](https://img.shields.io/badge/sig-EIP--3009-555555?style=flat-square)](https://eips.ethereum.org/EIPS/eip-3009)

## What it is

This document describes how an external agent running on an
**OnchainOS**-style platform mounts Regista 11 as a reusable skill,
using the `skill.md` manifest at `packages/mcp-server/skill.md` as the
canonical source of truth. The manifest declares one mainline
capability — a single gasless **USDT0** stake on a Regista 11 prop
market — plus three read-only helpers, anchored to the
`PropMarketHookFactory` on **X Layer** chain 196 and signed with an
**EIP-712** typed-data payload that becomes an EIP-3009
`transferWithAuthorization`. Each market is a custom **Uniswap v4 hook**;
the skill never touches LP-side liquidity. The typed-data domain name
is `USD₮0` (U+20AE TUGRIK SIGN — locked in code via
`codePointAt(3) === 0x20ae` test assertion).

This is the agent-integration surface of the **Hook the Future X Cup
submission**, May 28 2026, 2026 tournament window Jun 11 – Jul 9 2026.
Markets open and close in minutes during a live match — the skill
exists so an autonomous betting / portfolio / research agent can read
state and stake gaslessly without ever holding OKB.

The manifest is **structured as an ERC-8257-style agent skill
manifest**, **compatible with the OnchainOS Skill blueprint
conventions**, and **registry-ready for OnchainOS-compatible discovery
layers** — compatible with the spirit of the spec, not certified
against a final byte-layout. Compatibility, not certification.

See [agent-integration.md](./agent-integration.md) for the
framework-neutral surface (MCP quickstart, JSON schema).

## OnchainOS Skill Standard (skill.md config)

The skill is declared by `packages/mcp-server/skill.md`, a
YAML-frontmatter + Markdown body file structured as an
**ERC-8257-style** agent skill manifest, **compatible with the
OnchainOS Skill blueprint conventions** — not a certified ERC-8257
envelope.

| Field | Value | Notes |
|---|---|---|
| `schema_version` | `"1.0"` | Manifest schema rev |
| `spec_compatibility` | `"ERC-8257-style agent skill manifest"` | Compatibility, not certification |
| `id` | `"regista11.stake.v1"` | Stable reverse-DNS-style skill id |
| `name` | `"Regista 11 — Gasless Prop-Market Stake"` | Human-facing name |
| `version` | `"0.1.0"` | Capability semver |
| `publisher` | `"Regista 11"` | — |
| `homepage` | `"https://regista11.xyz"` | Live dApp |
| `license` | `"MIT"` | — |

Network sub-table:

| Field | Value | Notes |
|---|---|---|
| `chain_id` | `196` | X Layer mainnet |
| `chain_name` | `X Layer mainnet` | OKX zkEVM L2 |
| `rpc` | `https://rpc.xlayer.tech` | Public RPC |
| `explorer` | `https://www.oklink.com/x-layer` | OKLink |

Contracts sub-table:

| Field | Address | Notes |
|---|---|---|
| `factory` | [`0x080627e92182cb87911a7e512379ced1ecdd3ab5`](https://www.oklink.com/x-layer/address/0x080627e92182cb87911a7e512379ced1ecdd3ab5) | `PropMarketHookFactory` — discovery root |
| `settlement_token` | [`0x779Ded0c9e1022225f8E0630b35a9b54bE713736`](https://www.oklink.com/x-layer/address/0x779Ded0c9e1022225f8E0630b35a9b54bE713736) | USDT0 · EIP-712 domain `USD₮0` |
| `pool_manager` | [`0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32`](https://www.oklink.com/x-layer/address/0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32) | Canonical Uniswap v4 PoolManager on X Layer |

Runtime dependency: `module: "@regista11/x402-facilitator"` ·
`version: ">=0.1.0"`. Published to the public npm registry under the
`@regista11` scope at
[`@regista11/x402-facilitator@0.1.1`](https://www.npmjs.com/package/@regista11/x402-facilitator);
install with `pnpm add @regista11/x402-facilitator` /
`npm install @regista11/x402-facilitator`.

`trust.on_chain_proofs` and `trust.test_coverage` in the frontmatter
pin the skill to verifiable artifacts: the day-0 EIP-3009 settlement
plus the mainline factory broadcast that registered all eleven agents
in one transaction.

```
0xeff5521a14f976727d77f3c9378e9b1ae5dc19d6b7b91f2088ddaa2e0ec72553
```

→ [OKLink](https://www.oklink.com/x-layer/tx/0xeff5521a14f976727d77f3c9378e9b1ae5dc19d6b7b91f2088ddaa2e0ec72553) — day-0 EIP-3009 USDT0 gasless settlement.

```
0xd1aac0701cf87d5367eaad234addbef954773ca8d0a409842e1575523799e7c6
```

→ [OKLink](https://www.oklink.com/x-layer/tx/0xd1aac0701cf87d5367eaad234addbef954773ca8d0a409842e1575523799e7c6) — factory deploy + 11 agents registered · block 61215796 · X Layer 196.

**67/67 contracts · 229/229 agent runtime · 172/172 web — judge-verifiable.**

The mainline `submit_gasless_stake` capability takes exactly eight
required inputs:

- `marketAddress` — PropMarketHook address (40-hex EVM)
- `side` — `OVER` or `UNDER`
- `from` — staker EOA (40-hex EVM)
- `amountUsd` — decimal string, max 6 fractional digits
- `validAfter` — unix seconds; usually 0
- `validBefore` — unix seconds; authorization expiration
- `nonce` — 32-byte hex (`bytes32`)
- `signature` — 65-byte hex (v, r, s concatenated)

The EIP-3009 `TransferWithAuthorization` message carries six fields, in
this order:

- `from`
- `to`
- `value`
- `validAfter`
- `validBefore`
- `nonce`

EIP-712 primaryType: **`TransferWithAuthorization`**. EIP-712 domain
name: **`USD₮0`** (U+20AE TUGRIK SIGN — locked in code via
`codePointAt(3) === 0x20ae` test assertion). Domain version is the
literal `1`; `chainId` is `196`; `verifyingContract` is the USDT0
address above.

LP is rejected by construction (`PropMarketHook__LiquidityNotAllowed`)
— markets are stake aggregators, not AMM venues.

USDT0 uses **6 decimals** · `viem.parseUnits(amountUsd, 6)` is the
single boundary conversion · Number-space multiplication banned above
~$9,007 (Number.MAX_SAFE_INTEGER / 10^6 ≈ 9,007.199).

The full ERC-8257-style JSON schema for `submit_gasless_stake` lives in
[agent-integration.md → ERC-8257 Skill Specification](./agent-integration.md#erc-8257-skill-specification)
— not duplicated here.

(spec_compatibility: ERC-8257-style · not certified)

## Moltbook Registration Info

This section describes how the skill is **registry-ready for
OnchainOS-compatible discovery layers** — Regista 11 does not assert a
specific Moltbook registry URL because the canonical Moltbook endpoint
is not part of the artifacts we ship. Compatibility, not certification.

Every agent resolves the protocol by reading the
`PropMarketHookFactory` at
[`0x080627e92182cb87911a7e512379ced1ecdd3ab5`](https://www.oklink.com/x-layer/address/0x080627e92182cb87911a7e512379ced1ecdd3ab5)
on **X Layer** 196 — single source of truth, no off-chain registry
lookup required. The factory emits `MarketCreated` for every market a
persona opens; each market exposes a `status()` view returning the
on-chain enum.

A routine layer that wants to track live markets polls the factory
every block-window, reads each candidate market's `status()`, and only
surfaces those in `STAKING_OPEN`. The steady-state loop is three RPC
shapes:

| Routine step | RPC call | Cadence |
|---|---|---|
| Discover | `getContractEvents(factory, MarketCreated, lookback = 200_000n blocks)` (≈ 4.6 days at ≈ 2s blocks) | every routine tick |
| Filter | `readContract(market, status())` — keep `STAKING_OPEN = 1` | per candidate market |
| Hydrate | `readContract(market, {status, question, agent, overPool, underPool, stakingClosesAt})` — six parallel reads | per open market |

The on-chain status enum has five labels in this order:

- `SEALED`
- `STAKING_OPEN`
- `AWAITING_REVEAL`
- `RESOLVED`
- `REFUNDED`

`STAKING_OPEN = 1` is the only stake-accepting state.

The eleven-persona roster (`#01` Il Regista through `#11` L'Ultimo) —
persona handle, role, and template families — is served as a single
JSON document from the MCP resource `regista11://roster`. Routine
layers should consume the roster from that resource rather than
duplicating it; the live mirror is [regista11.xyz/agents](https://regista11.xyz/agents).

Live heartbeat: `GET https://regista11.xyz/api/status` returns the
protocol heartbeat — factory address, agent runtime online state,
persona online count, 24-hour activity. The `get_system_status` MCP
tool wraps the same endpoint.

```
OnchainOS routine ─→ factory.MarketCreated logs ─→ per-market status() ⇄ regista11://contracts ─→ list_active_markets → get_market_details → submit_gasless_stake
```

See [agent-integration.md → Agentic Composability Layer](./agent-integration.md#agentic-composability-layer)
for the framework-neutral version of this discovery flow.

(no anonymous reads — all reads are public on-chain data)

## MCP Server Integration

`@regista11/mcp-server` is the OnchainOS-side bridge — a stdio MCP
process at `packages/mcp-server/server.ts` that exposes the four-tool,
two-resource capability surface declared by `skill.md`.

**Transport:** stdio (`StdioServerTransport` from `@modelcontextprotocol/sdk`).

```bash
RELAYER_PRIVATE_KEY=<OKB-funded hex> \
REGISTA11_API=https://regista11.xyz \
XLAYER_RPC=https://rpc.xlayer.tech \
npx tsx packages/mcp-server/server.ts
```

**Read-only mode** — if `RELAYER_PRIVATE_KEY` is absent the three read
tools (`get_system_status`, `list_active_markets`, `get_market_details`)
still serve; `submit_gasless_stake` returns the `missing_relayer` error
code.

| Tool | server.ts symbol | RPC / HTTP backing | Inputs | Returns |
|---|---|---|---|---|
| `get_system_status` | `getSystemStatus()` | `GET ${STATUS_API_BASE}/api/status` (`STATUS_API_BASE = process.env.REGISTA11_API ?? "https://regista11.xyz"`) | none | JSON string of the upstream `/api/status` body — factory address, agent runtime online state, persona online count, 24h activity |
| `list_active_markets` | `listActiveMarkets(limit)` | `publicClient.getContractEvents` against `FACTORY_ADDRESS` with `MarketCreated` over `EVENT_LOOKBACK_BLOCKS = 200_000n`, then per-candidate `status()` filtered to `STAKING_OPEN = 1` | `limit` (1-50, default 20) | JSON `{ count, markets: [{ market, agent, block, status: "STAKING_OPEN" }] }`, newest first |
| `get_market_details` | `getMarketDetails(marketAddress)` | six parallel `publicClient.readContract` calls — `status`, `question`, `agent`, `overPool`, `underPool`, `stakingClosesAt` | `marketAddress` (`^0x[a-fA-F0-9]{40}$`) | JSON `{ address, status, question, agent, pools: { over: { wei, usdt0 }, under: { wei, usdt0 }, totalWei }, stakingClosesAt: { unix, iso, isOpen }, explorer }` |
| `submit_gasless_stake` | `submitGaslessStake(args)` | relayer wallet calls `market.stakeWithAuthorization(sideIndex, from, value, validAfter, validBefore, nonce, v, r, s)` | `marketAddress`, `side`, `from`, `amountUsd`, `validAfter`, `validBefore`, `nonce`, `signature` (eight required — see Section 2 bullet list) | JSON `{ txHash, marketAddress, side, from, amount: { usd, wei, decimals: 6 }, explorer }` |

The `submitGaslessStake` pipeline runs six steps in order: (1)
`parseUnits(amountUsd, 6)` exactly once; (2) `validBefore > now` and
`validAfter <= now + 60`; (3) `recoverTransferSigner(auth, signature)`
must equal `from` (else hints `Check the EIP-712 domain (name must be
U+20AE-glyph USD₮0) and chainId (196)`); (4) `market.status() ==
STAKING_OPEN` and `USDT0.balanceOf(from) >= value`; (5) split 65-byte
hex into `(v, r, s)` with `v ∈ {27, 28}`; (6) relayer wallet calls
`market.stakeWithAuthorization(sideIndex, from, value, validAfter,
validBefore, nonce, v, r, s)` where `sideIndex = side === "OVER" ? 0 :
1`.

Resources:

| URI | MIME | Backing |
|---|---|---|
| `regista11://roster` | `application/json` | static 11-row `ROSTER` constant — persona handle, role, template families |
| `regista11://contracts` | `application/json` | static `CONTRACTS` object including `chainId`, `chainName`, `rpc`, `explorer`, `contracts.{propMarketHookFactory, settlementToken, poolManager}`, `settlementToken.{symbol: "USDT0", domainName: "USD₮0", domainVersion: "1", decimals: 6}` |

Error envelope shape is `isError: true` content `{code}: {message}`.
All errors flow through one normalizer (`toMcpError`), so the agent
always sees the same shape.

| Code | Meaning | Recovery |
|---|---|---|
| `invalid_input` | Zod schema validation failed | Re-read the input schema; fix shape |
| `invalid_address` | The address argument is not a valid EVM address | Fix the malformed address on the agent side; matches `^0x[a-fA-F0-9]{40}$` |
| `invalid_signature` | Signature did not recover to `from`, or `v` outside {27, 28} | Re-sign on the user side |
| `expired_authorization` | `validBefore` is in the past at submit time, or `validAfter` is more than 60 s in the future | Re-sign with a fresh window |
| `market_not_open` | `market.status() != STAKING_OPEN` at submit time | Pick another market |
| `insufficient_balance` | `from`'s USDT0 balance < value | Top up the user's USDT0 |
| `upstream_error` | The status API or RPC returned a non-2xx | Retry with backoff |
| `missing_relayer` | The server has no `RELAYER_PRIVATE_KEY` configured | Operator config issue; not retryable |
| `unknown_tool` | Tool name not in the four-tool set | Re-read capability surface |
| `unknown_resource` | Resource URI not in the two-URI set | Re-read capability surface |
| `internal_error` | Unrecognized fault | Log + alert |

`viem.parseUnits(amountUsd, 6)` is invoked exactly once at the tool
ingress in `submitGaslessStake` — never multiply by `10 ** 6` in JS
Number space.

Relayer notes:

- single instance per chain · serialized EVM nonce queue
- in-memory `SettlementCache` covers replay-within-window
- back with Redis/KV for horizontal scale

Framework-neutral quickstart (Claude Desktop / Cursor / any MCP host)
lives in [agent-integration.md → MCP Server Quickstart](./agent-integration.md#mcp-server-quickstart)
— not duplicated here.

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
