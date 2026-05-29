# Regista 11

> Live football prop markets, made by AI agents. Built for the 2026
> tournament on X Layer.

[![X Cup](https://img.shields.io/badge/X_Cup-OKX_×_X_Layer-ec652b?style=flat-square)](https://www.okx.com/xlayer)
[![Live](https://img.shields.io/badge/status-LIVE_on_X_Layer-44b48b?style=flat-square)](https://regista11.xyz/status)

[![X Layer](https://img.shields.io/badge/chain-X_Layer_196-111a4a?style=flat-square)](https://www.oklink.com/x-layer)
[![USDT0](https://img.shields.io/badge/settle-USDT0-26a17b?style=flat-square)](https://docs.usdt0.to)
[![Uniswap v4 Hook](https://img.shields.io/badge/v4_hook-PropMarketHook-ff007a?style=flat-square)](https://docs.uniswap.org/contracts/v4/overview)
[![EIP-3009](https://img.shields.io/badge/stake-EIP--3009_gasless-44b48b?style=flat-square)](https://eips.ethereum.org/EIPS/eip-3009)

## What it is

Eleven autonomous AI personas track every event in a live football match —
possession swings, shot patterns, foul intensity — and open binary
prediction markets in real time on **X Layer** mainnet. Each market is a
custom **Uniswap v4 hook** that settles in **USDT0**. Users stake gaslessly
with a single EIP-712 signature in their wallet.

This is an **X Cup submission**, built for the OKX X Layer hackathon
and positioned for the **2026 tournament** (Jun 11 – Jul 9). Match-day-
ready on every X Layer block.

The core is a custom Uniswap v4 hook (`PropMarketHook` — the same
caliber of work the Hook the Future track is looking for, shipped here
as live protocol infrastructure on X Layer mainnet). Tournament-fixture
markets are designed to anchor their resolution to Flap's
`WorldCupResolver` on BNB Chain. These are tech credentials underneath
the X Cup submission, not separate submissions.

## See it live

- dApp: [regista11.xyz](https://regista11.xyz)
- Markets: [regista11.xyz/markets](https://regista11.xyz/markets)
- The Eleven: [regista11.xyz/agents](https://regista11.xyz/agents)
- System status (judge-verifiable): [regista11.xyz/status](https://regista11.xyz/status)
- Docs (live, 9 pages): [regista11.xyz/docs](https://regista11.xyz/docs)
- Demo video (90s): [x.com/regista11_ · video](https://x.com/regista11_/status/2060150599153246237?s=46)
- X thread: [x.com/regista11_ · submission thread](https://x.com/regista11_/status/2060149005087093120?s=46)

## The Eleven

Eleven personas, all active. Each opens 2–4 markets per match within its
tactical window. Templates reuse a shared library of 7 propositions —
variety comes from WHEN each persona fires and WHICH team it focuses on.

| # | Persona | Role | Templates |
|---|---|---|---|
| 01 | Il Regista | Deep-lying playmaker | Clean sheet · Possession · Corners |
| 02 | Il Trequartista | Creative attacker | Next goal · Shots on target · Corners |
| 03 | Il Mediano | Defensive enforcer | Fouls · Yellow cards |
| 04 | Il Falso Nove | False nine | Shots on target · Possession · Next goal |
| 05 | Il Libero | Sweeper | Clean sheet · Corners |
| 06 | L'Ala | Wing-back | Corners · Shots on target |
| 07 | Il Bomber | Pure striker | Next goal · Shots on target |
| 08 | Il Capitano | Captain · Left flank | Yellow cards · Fouls |
| 09 | Il Numero Dieci | Number 10 | Possession · Next goal · Shots on target |
| 10 | Il Catenaccio | Defensive anchor | Clean sheet · Yellow cards |
| 11 | L'Ultimo | Last line (GK) | Clean sheet |

## Architecture

```
User
  │
  │ EIP-3009 authorization (single gasless wallet signature)
  ▼
x402 facilitator  (/api/facilitator/stake)
  │
  │ relayer.writeContract(market.stake)
  ▼
PropMarketHook   (Uniswap v4 hook · X Layer chain 196)
  │
  │ USDT0.transferWithAuthorization
  ▼
USDT0            (Tether's omnichain stable via LayerZero OFT)
  │
  │ on chain
  ▼
X Layer mainnet  (chain 196 · OKX zkEVM L2)
                              ▲ resolve(outcome) — single resolver address
                              ┆ tournament outcome feed (planned)
                                Flap WorldCupResolver (BNB Chain)
```

## Smart contracts — PropMarketHook

`PropMarketHook` is a custom Uniswap v4 hook implementing commit-reveal
binary prediction markets. The hook overrides `beforeInitialize`,
`beforeAddLiquidity`, `beforeRemoveLiquidity`, `beforeSwap`, and
`afterSwap` to bind the v4 pool lifecycle to a prediction market's
commit → stake → reveal → resolve flow. LP is rejected by construction
(`PropMarketHook__LiquidityNotAllowed`) — markets are stake aggregators,
not AMM venues.

**Commit-reveal** is the anti-frontrun primitive. Each agent commits
`keccak256(revealedParams || salt || agent)` on creation; `revealedParams`
is only published after staking closes.

**Dual-pool stake aggregation** tracks OVER and UNDER pools separately.
On resolution the winning pool is paid out proportionally from the
losing pool; refund path returns stakes if either pool is empty.

**Claim + refund.** After a market resolves, a winning staker calls
`claim()` and receives `userWinningStake × totalPool / winningPool` in
USDT0 (pari-mutuel — winners split the whole pot pro-rata). If a market
is voided (`outcome == 3`, e.g. a missed reveal/resolve deadline or an
empty winning pool), either side calls `refund()` to recover their full
stake. Both are `nonReentrant` and guard against double-claims.

**Salt-mined CREATE2 deployment.** The factory mines a salt that
produces a hook address with the `0x2A80` permission bitmap — verified
by `HookMiner` in ~16K iterations / 749 ms on commodity hardware.

| Contract | Address | Notes |
|---|---|---|
| `PropMarketHookFactory` | [`0x080627e92182cb87911a7e512379ced1ecdd3ab5`](https://www.oklink.com/x-layer/address/0x080627e92182cb87911a7e512379ced1ecdd3ab5) | Salt-mined CREATE2 · X Layer 196 · source verified on OKLink |
| `USDT0` (settlement) | [`0x779Ded0c9e1022225f8E0630b35a9b54bE713736`](https://www.oklink.com/x-layer/address/0x779Ded0c9e1022225f8E0630b35a9b54bE713736) | EIP-712 domain `USD₮0` (U+20AE) |
| `PoolManager` (Uniswap v4) | [`0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32`](https://www.oklink.com/x-layer/address/0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32) | Canonical X Layer deployment |

**67/67 tests · 100% line/branch/function coverage** on PropMarketHook.sol.

## Agent runtime

Eleven TypeScript persona processes share one `TickLoop` per persona.
Each persona's wallet is BIP-44 derived (`m/44'/60'/0'/0/{index}` for
index 0…10) from a single master mnemonic. Wallets register on-chain
via `PropMarketHookFactory.registerAgent(addr)` post-deploy.

**Autonomy loop.** A `MatchPoller` polls the live fixture and emits
`MatchStateDiff` deltas (possession swings, shots, fouls, corners).
Each persona's `TickLoop` consumes those deltas, decides whether its
tactical window is open, and — when it fires — opens a market via the
`createMarket` skill, then schedules the `revealMarket` call for after
staking closes (`REVEAL_WINDOW` + a safety buffer). Pending reveals are
restored on restart, so a redeploy mid-match doesn't drop a commitment.

**Match data.** The poller is provider-agnostic; one source is picked
at boot. If `FOOTBALL_DATA_KEY` is set the agent uses Football-Data.org
(10 req/min, no daily cap); otherwise it uses API-Football via
`API_FOOTBALL_KEY`. We ran on both during the hackathon purely to dodge
free-tier rate limits — API-Football is the intended primary for the
2026 tournament (their hackathon partnership covers the higher tier),
with Football-Data.org as the fallback.

Each persona composes a small set of skills in `packages/agent/src/skills/`:
`createMarket` (with `hookMiner` salt mining), `commitReveal`,
`revealMarket`, and `resolveMarket`, alongside OKX-aligned primitives
under `skills/okx/` (`okxOnchainGateway`, `okxSecurity`,
`okxAgenticWallet`).

The whole runtime is one container — `pnpm --filter @regista11/agent
agent:start <fixtureId> --persona=all` spawns all 11 personas in
parallel within one process. Deployed to Railway with a `/health`
endpoint the web's `/status` page polls every 10s.

**229/229 tests pass.** The runtime avoids `Math.random`, so a persona's
decisions replay identically against a given match feed.

## USDT0 + EIP-3009

USDT0 is Tether's omnichain stable on X Layer, deployed by Everdawn Labs
as a LayerZero OFT v2 token, 1:1 backed by locked USDT on Ethereum.

- Contract: [`0x779Ded0c9e1022225f8E0630b35a9b54bE713736`](https://www.oklink.com/x-layer/address/0x779Ded0c9e1022225f8E0630b35a9b54bE713736)
- EIP-712 domain name: **`USD₮0`** (U+20AE TUGRIK SIGN — locked in code
  via `codePointAt(3) === 0x20ae` test assertion)
- Decimals: 6

EIP-3009 `transferWithAuthorization` enables gasless stakes. The user
signs a single typed-data payload in their wallet; our in-app
facilitator at `/api/facilitator/stake` validates + relays the
authorization on-chain. The relayer pays gas in OKB; the user pays
nothing.

**First documented dapp on X Layer using EIP-3009 gasless flow per
research, May 2026.**

## Resolution

`PropMarketHook.resolve(outcome)` is gated on-chain to a single
`resolver` address set at deploy — one trust anchor, enforced by
`if (msg.sender != resolver) revert NotResolver()`.

For tournament markets, that resolver is `FlapResolutionRelay`
(`packages/contracts/src/FlapResolutionRelay.sol`, 18 tests). The relay
takes a Flap-anchored outcome — `WorldCupResolver` on BNB Chain
([`0x134C6b9562E226096947e018ddEe4804c9146921`](https://bscscan.com/address/0x134C6b9562E226096947e018ddEe4804c9146921))
— from an authorized oracle, holds it through a dispute window during
which a guardian can veto a bad result, then lets anyone finalize the
on-chain `resolve()`. If the feed never delivers, the market's refund
deadline returns every stake, so funds are never trapped. Current
(non-tournament) markets use an admin resolver, labeled as such in the
deployment artifact.

## The dApp

A full Next.js 15 app. The landing page renders **The Eleven in a 3D
stadium** (react-three-fiber, `components/regista/the-eleven/Scene.tsx`)
over a WebGL **Ballpit** hero (`landing/effects/Ballpit.tsx`), framed by
an iOS-26-style **Liquid Glass** nav (`glass/LiquidGlassSurface.tsx`)
with a mobile bottom tab bar. Markets, per-market detail (live pools +
OKLink), the agents roster, and the `/status` dashboard are all real
routes, and shared links carry dynamic `next/og` social cards (landing,
`/docs`, per-market).

Two guardrails sit in front of a stake. `WrongChainBanner` watches the
connected wallet's chain and offers a one-tap switch when it isn't X
Layer 196. The stake widget reads the wallet's legacy-USDT balance and,
if it finds any, surfaces a swap to USDT0 — the only token the protocol
settles in — so a staker never signs against the wrong asset.

## Farcaster frame

Every live market is also a Farcaster Mini App surface — cast
`regista11.xyz/frame/<marketAddress>` to share and launch it, wired to
the current `@farcaster/miniapp-wagmi-connector` with
`sdk.actions.ready()` on load. The stake is a gasless EIP-3009
signature that the facilitator settles on **X Layer (chain 196)** — the
signature is off-chain and chain-agnostic, so settlement always lands on
X Layer regardless of the signing wallet.

Native signing through the Warpcast host wallet *inside a cast* is gated
on Farcaster hosts adding X Layer to their supported chains (today:
Base, Optimism, Arbitrum, Mainnet, Polygon, Unichain, Zora). Until then
the frame shares and launches the app and the gasless stake completes
there. Decoupling the signing wallet's chain from X Layer settlement is
a tracked next step.

## Agentic composability

Regista 11 ships as a reusable agent skill: any MCP-capable runtime
(Claude Desktop, Cursor, a Vercel AI SDK loop, an OnchainOS routine)
can read protocol state and submit a gasless USDT0 stake on X Layer 196
— no browser, no scraping. Two companion docs describe the surface:

- [docs/agent-integration.md](docs/agent-integration.md) — the
  framework-neutral surface: MCP quickstart, JSON parameter schema,
  library embed.
- [docs/agent-onchainos-integration.md](docs/agent-onchainos-integration.md)
  — the OnchainOS-side manifest, registry discovery flow, and per-tool
  implementation map.

The `@regista11/x402-facilitator` package (the same x402-style
settlement library the dApp uses) ships the EIP-712 typed-data
constants — including the locked `USD₮0` (U+20AE TUGRIK SIGN) domain
name — and the x402 `verify` / `settle` relayer client. The
`@regista11/mcp-server` stdio bridge at `packages/mcp-server/server.ts`
exposes four tools and two resources, declared by an **ERC-8257-style**
skill manifest at `packages/mcp-server/skill.md`. Compatibility, not
certification — the manifest is registry-ready for OnchainOS-compatible
discovery layers, not audited against a final byte-layout.

| MCP tool | What |
|---|---|
| `get_system_status` | Protocol heartbeat (factory, agent runtime, 24h activity); wraps `GET /api/status`. |
| `list_active_markets` | Markets currently in `STAKING_OPEN`, newest first; reads `MarketCreated` events from the factory. |
| `get_market_details` | Question, originating agent, OVER/UNDER pools, and staking close time for one market. |
| `submit_gasless_stake` | Relays a user-signed EIP-3009 `transferWithAuthorization` to a market's `stakeWithAuthorization`; user pays zero gas, relayer pays OKB. |

## Repo structure

```
regista11/
├── packages/
│   ├── contracts/          Foundry · Solidity 0.8.26 · 85 tests (hook 100% covered)
│   ├── agent/              TypeScript · 229 tests · 11 personas + 7 templates · Dockerised
│   ├── web/                Next.js 15 · 172 tests · dApp + landing + frame + /status
│   ├── x402-facilitator/   Day 0 verified — settlement infrastructure (npm)
│   └── mcp-server/         MCP stdio bridge · 4 tools + 2 resources · skill.md manifest
├── docs/                   Agent integration + OnchainOS / ERC-8257-style skill docs
└── README.md               (this file)
```

The facilitator is also published standalone as
[`@regista11/x402-facilitator@0.1.1`](https://www.npmjs.com/package/@regista11/x402-facilitator)
on npm — any team running an x402-style settlement layer on X Layer can
install it directly:

```bash
pnpm add @regista11/x402-facilitator
```

## Running locally

```bash
pnpm install
pnpm --filter @regista11/contracts test     # forge tests
pnpm --filter @regista11/agent test         # vitest
pnpm --filter @regista11/web test           # vitest
pnpm --filter @regista11/web dev            # http://localhost:3000
```

Env vars (see `packages/web/.env.example`):

- `NEXT_PUBLIC_WC_PROJECT_ID` — WalletConnect cloud project id
- `NEXT_PUBLIC_APP_URL` — public origin (`https://regista11.xyz` in prod)
- `RELAYER_PRIVATE_KEY` — **server-only** relayer wallet for the
  facilitator. Funded with OKB for X Layer gas.
- `PUBLIC_AGENT_URL` — the Railway agent service URL the web's
  `/status` page polls

Agent service (see `packages/agent/.env.example`):

- `MASTER_MNEMONIC` — **server-only** BIP-44 seed for the 11 persona
  wallets
- `FOOTBALL_DATA_KEY` — Football-Data.org key. If set, it's the match
  data source (preferred for its 10 req/min, no daily cap)
- `API_FOOTBALL_KEY` — API-Football key; used when `FOOTBALL_DATA_KEY`
  is absent, and the intended primary for the 2026 tournament
- `FIXTURE_ID` — the live fixture the personas track this run

Spawn all 11 personas against a live match (one process):

```bash
pnpm --filter @regista11/agent agent:start <fixtureId> --persona=all
```

The agent + web both ship as Dockerised services pinned to
`numReplicas: 1` (single instance, for relayer nonce safety).

### Deploying the contracts yourself

```bash
cd packages/contracts
pnpm agents       # derive AGENT_0..10 addresses from MASTER_MNEMONIC
pnpm preflight    # check RPC, deployer balance, and env on X Layer 196
pnpm deploy       # broadcast — Deploy.s.sol asserts chainid 196,
                  # registers the 11 agents, writes deployments/xlayer-mainnet.json
```

`MineSalt.s.sol` (`pnpm mine`) finds the CREATE2 salt that lands the
hook on the `0x2A80` permission address — `DEFAULT_TARGET = 0x2A80` is
the v4 permission bitmap the hook needs. After deploy, sync the ABIs
into the web app with `node packages/web/scripts/sync-abis.mjs`.

Source verification on OKLink is keyless — no OKX API key needed:

```bash
forge verify-contract <address> src/PropMarketHookFactory.sol:PropMarketHookFactory \
  --verifier oklink \
  --verifier-url https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER \
  --etherscan-api-key dummy \
  --constructor-args $(cast abi-encode "c(address,address,address)" <poolManager> <usdt0> <resolver>) \
  --watch
```

The deployed factory is verified this way; each `PropMarketHook` market
verifies with the same command once it's created on-chain.

## On-chain proof

**Day 0 USDT0 EIP-3009 settlement** (May 22 2026 · pre-protocol smoke):

```
0xeff5521a14f976727d77f3c9378e9b1ae5dc19d6b7b91f2088ddaa2e0ec72553
```

→ [OKLink](https://www.oklink.com/x-layer/tx/0xeff5521a14f976727d77f3c9378e9b1ae5dc19d6b7b91f2088ddaa2e0ec72553)

**Mainnet factory deploy** (May 28 2026):

```
0xd1aac0701cf87d5367eaad234addbef954773ca8d0a409842e1575523799e7c6
```

→ [OKLink](https://www.oklink.com/x-layer/tx/0xd1aac0701cf87d5367eaad234addbef954773ca8d0a409842e1575523799e7c6) · block 61215796 · 11 agents registered in the same broadcast.

## License

MIT — see [LICENSE](LICENSE).

## Built for

- **OKX X Cup · X Layer track** — `@XLayerOfficial` · `#BuildX`
