---
schema_version: "1.0"
spec_compatibility: "ERC-8257-style agent skill manifest"
id: "regista11.stake.v1"
name: "Regista 11 — Gasless Prop-Market Stake"
version: "0.1.0"
publisher: "Regista 11"
homepage: "https://regista11.xyz"
license: "MIT"
network:
  chain_id: 196
  chain_name: "X Layer mainnet"
  rpc: "https://rpc.xlayer.tech"
  explorer: "https://www.oklink.com/x-layer"
contracts:
  factory: "0x080627e92182cb87911a7e512379ced1ecdd3ab5"
  settlement_token: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736"
  pool_manager: "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32"
runtime:
  module: "@regista11/x402-facilitator"
  version: ">=0.1.0"
trust:
  on_chain_proofs:
    - "0xeff5521a14f976727d77f3c9378e9b1ae5dc19d6b7b91f2088ddaa2e0ec72553"  # day-0 EIP-3009 settlement
    - "0xd1aac0701cf87d5367eaad234addbef954773ca8d0a409842e1575523799e7c6"  # factory deploy + 11 agents registered
  test_coverage:
    contracts: "67/67 · 100% line/branch/function"
    agent_runtime: "229/229"
    web: "172/172"
---

> **Compatibility note.** This document is structured as an agent skill
> manifest in the spirit of ERC-8257 (semantic service description for
> autonomous agents). It carries the universally-needed fields an agent
> runtime consumes — identity, prerequisites, capability schemas, error
> codes, end-to-end flow, on-chain proofs — but the exact ERC-8257
> byte-layout has not been audited against the final spec. If your
> registry requires a strict ERC-8257 envelope, treat the frontmatter
> above as the source of truth and re-wrap as needed.

# Regista 11 — Gasless Prop-Market Stake

A skill that places a **single gasless USDT0 stake** on a Regista 11
prop market (a live football outcome market on X Layer chain 196). The
end-user signs one EIP-712 typed-data payload in their wallet; this
skill relays the authorization on-chain and the user pays zero gas.

## Why an agent calls this skill

Regista 11 markets open and close in minutes during a live match. An
autonomous betting / portfolio / research agent that wants to take an
OVER / UNDER position on a market needs:

1. To enumerate **currently stake-able** markets (`status == STAKING_OPEN`).
2. To read a market's **question, agent, pool balances, and close time**
   before sizing the position.
3. To **submit the stake gaslessly** so the agent's wallet doesn't have
   to hold OKB. The agent signs EIP-3009; the protocol's relayer wallet
   pays gas in OKB and the protocol's prop-market hook pulls the user's
   USDT0 via `transferWithAuthorization`.

## Prerequisites

| Component | Where | Notes |
|---|---|---|
| EVM wallet | agent-side | Must control the EOA that signs the EIP-712 payload. The signing wallet is the address USDT0 is debited from. |
| USDT0 balance | agent's wallet | Sufficient to cover the stake amount + (optionally) future stakes. **No OKB required.** Token decimals = **6**. |
| `@regista11/x402-facilitator` | `pnpm add @regista11/x402-facilitator` | Provides typed-data builders, constants, signature verification helpers. |
| Network access | `https://rpc.xlayer.tech` + `https://regista11.xyz` | RPC reads (chain) + status reads (HTTP). |
| Relayer (server-side) | run by the protocol | The skill provider (Regista 11) operates the relayer wallet; agents do **not** need an OKB-funded wallet. |

## Capability surface

This skill exposes four tools and two resources. Names are stable across
patch versions; argument shapes follow semver.

### Tools

#### `get_system_status`

Reads `https://regista11.xyz/api/status` and returns the protocol
heartbeat: factory address, agent runtime online state, persona online
count, 24-hour activity. Use this to verify the protocol is live before
any other call.

```json
{
  "name": "get_system_status",
  "input_schema": { "type": "object", "properties": {}, "required": [] }
}
```

#### `list_active_markets`

Enumerates markets currently in `STAKING_OPEN` state. Reads
`MarketCreated` events from the factory in the recent block window,
filters by on-chain `market.status() == 1`.

```json
{
  "name": "list_active_markets",
  "input_schema": {
    "type": "object",
    "properties": { "limit": { "type": "number", "minimum": 1, "maximum": 50 } },
    "required": []
  }
}
```

Returns an array of `{ market: address, status: "STAKING_OPEN", block: number }`. Newest first.

#### `get_market_details`

Reads a single market's metadata: question, originating agent, OVER /
UNDER pool balances (in raw 6-decimal USDT0 micros AND human-decimal),
status, and `stakingClosesAt` timestamp.

```json
{
  "name": "get_market_details",
  "input_schema": {
    "type": "object",
    "properties": { "marketAddress": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" } },
    "required": ["marketAddress"]
  }
}
```

#### `submit_gasless_stake`

The mainline action. Takes a user-signed EIP-3009 `transferWithAuthorization`
payload + a market address + an OVER / UNDER side, and relays the
authorization to the market's `stakeWithAuthorization()` function. The
market contract pulls USDT0 via `USDT0.transferWithAuthorization()`
inside the same transaction; the relayer wallet (server-side) pays OKB
gas.

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

Returns `{ txHash, marketAddress, side, from, amount: { usd, wei, decimals: 6 }, explorer }`.

### Resources

| URI | What | MIME |
|---|---|---|
| `regista11://roster` | The 11 active personas + their template families (markets each persona is willing to open) | `application/json` |
| `regista11://contracts` | On-chain contract registry: factory, USDT0, pool manager, chain config | `application/json` |

## EIP-712 payload to sign

The user's wallet signs the following typed-data structure. The domain
matches `USDT0` byte-for-byte — the domain `name` is **`USD₮0`** with
U+20AE TUGRIK SIGN at index 3; do NOT substitute the ASCII letter `T`.

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

Constants `USDT0_DOMAIN_NAME`, `USDT0_DOMAIN_VERSION`, and
`TRANSFER_WITH_AUTHORIZATION_TYPES` are exported from
`@regista11/x402-facilitator` so callers don't have to hand-type any of
this.

## End-to-end flow

```
┌──────────┐  1. resources/read regista11://contracts
│  Agent   │  2. tools/call list_active_markets        ─────────┐
└──────────┘  3. tools/call get_market_details(marketAddress)   │
      │                                                          │
      │  4. build EIP-712 payload (domain = USD₮0 / 196 / USDT0  │
      │     address, message.to = marketAddress, message.value =  │
      │     parseUnits(amount, 6))                                │
      │                                                          │
      │  5. wallet.signTypedData(payload) → signature (65 bytes)  │
      │                                                          │
      │  6. tools/call submit_gasless_stake(                      │
      │       marketAddress, side, from, amountUsd, validAfter,   │
      │       validBefore, nonce, signature)                      │
      │                                                          │
      ▼                                                          ▼
┌────────────────────────────────────────────────────────────────────┐
│  MCP Server (this skill)                                           │
│   • Verify signature recovers to `from` via                        │
│     recoverTransferSigner from @regista11/x402-facilitator         │
│   • Reject if validBefore <= now or value > on-chain balance       │
│   • Call market.stakeWithAuthorization(side, from, value,          │
│       validAfter, validBefore, nonce, v, r, s)                     │
│     from the protocol's relayer wallet (OKB-funded)                │
│   • Return txHash                                                  │
└────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
            PropMarketHook on X Layer (chain 196)
            → USDT0.transferWithAuthorization(...) pulls funds
            → stake credited to the OVER or UNDER pool
            → MarketStaked(market, side, from, value) event emitted
```

## Decimal handling — non-negotiable

USDT0 uses **6 decimals**. Every amount in this skill is one of two
forms; convert exactly once, at the boundary:

| Form | Where | Example |
|---|---|---|
| Decimal string | `amountUsd` input, human display | `"5.000000"` for $5 |
| 6-decimal micros (`bigint`) | EIP-712 `message.value`, ERC-20 calldata | `5_000_000n` for $5 |

The server uses `viem.parseUnits(amountUsd, 6)` exactly once at the
ingress boundary. **Never** multiply by `10 ** 6` in JavaScript number
space — it loses precision above ~$9,007 (Number.MAX_SAFE_INTEGER /
10^6 ≈ 9,007.199). The `submit_gasless_stake` tool rejects any input
that doesn't match `^\d+(\.\d{1,6})?$`.

## Error codes

All tool errors are returned with `isError: true` and a `text` content
field formatted as `{code}: {message}`. Stable codes:

| Code | Meaning | Recovery |
|---|---|---|
| `invalid_input` | Zod schema validation failed | Re-read the input schema; fix shape |
| `invalid_address` | The address argument is not a valid EVM address | — |
| `invalid_signature` | Signature did not recover to `from`, or v outside {27, 28} | Re-sign on the user side |
| `expired_authorization` | `validBefore` is in the past at submit time | Re-sign with a fresh window |
| `market_not_open` | `market.status() != STAKING_OPEN` at submit time | Pick another market |
| `insufficient_balance` | `from`'s USDT0 balance < value | Top up the user's USDT0 |
| `upstream_error` | The status API or RPC returned a non-2xx | Retry with backoff |
| `missing_relayer` | The server has no `RELAYER_PRIVATE_KEY` configured | Operator config issue; not retryable |
| `internal_error` | Unrecognized fault | Log + alert |

## Trust + verification

Every claim in this manifest is checkable on chain. The agents
populating the markets are not opaque oracles — they are 11 named
personas whose addresses, code, and tests are public:

- Factory deploy + 11 agents registered: tx `0xd1aac0701cf87d5367eaad234addbef954773ca8d0a409842e1575523799e7c6` (block 61215796, X Layer 196).
- Source + tests: [github.com/winsznx/theeleven](https://github.com/winsznx/theeleven) — 67/67 contracts, 229/229 agent runtime, 172/172 web.
- Live status: `GET https://regista11.xyz/api/status`.
- Public roster: resource `regista11://roster` and [regista11.xyz/agents](https://regista11.xyz/agents).

## Limits

- **No anonymous reads.** All reads are public on-chain data; no
  authentication is required, no PII is exposed.
- **One outstanding nonce per (from, nonce) pair.** Re-using a nonce
  after a successful relay returns `nonce_used` from the USDT0 contract.
- **Authorization window.** Recommended `validBefore = now + 300s` to
  give the relayer time to land the tx before expiry.
- **No write-side rate limiting** from the skill itself; the relayer
  wallet's nonce queue is serialized (single replica) and will queue
  concurrent calls, not parallel-broadcast them.
