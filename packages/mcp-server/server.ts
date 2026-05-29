#!/usr/bin/env node
/**
 * Regista 11 — MCP server.
 *
 * Exposes 4 tools and 2 resources for any MCP-capable agent runtime
 * (Claude Desktop, Cursor, etc.) to (a) introspect the protocol's live
 * state and (b) submit gasless USDT0 stakes against open prop markets
 * on X Layer chain 196.
 *
 * Transport: stdio. The Server constructor + StdioServerTransport are
 * the canonical pair for desktop-host MCP servers; HTTP/SSE transports
 * would slot in by swapping the bottom 3 lines of main().
 *
 * Strict-typed throughout. All inputs validated by Zod at the tool
 * boundary; all outputs are JSON strings inside MCP text-content
 * envelopes; all errors flow through one normalizer (`toMcpError`) so
 * the agent sees `{code}: {message}` regardless of the failure mode.
 *
 * USDT0 decimal handling is concentrated in one place: every amount
 * crosses the JS/EVM boundary via `viem.parseUnits(amountUsd, 6)` exactly
 * once at ingress. No `Number * 1e6` math anywhere.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ReadResourceRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
  recoverTransferSigner,
  USDT0_ADDRESS,
  USDT0_CHAIN_ID,
  USDT0_DECIMALS,
  type TransferAuthorization,
} from "@regista11/x402-facilitator";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";

// ─── Config ────────────────────────────────────────────────────────────

const FACTORY_ADDRESS: Address = "0x080627e92182cb87911a7e512379ced1ecdd3ab5";
const POOL_MANAGER_ADDRESS: Address = "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32";
const STATUS_API_BASE = process.env.REGISTA11_API ?? "https://regista11.xyz";
const RPC_URL = process.env.XLAYER_RPC ?? "https://rpc.xlayer.tech";
const EVENT_LOOKBACK_BLOCKS = 200_000n; // X Layer ≈ 2s blocks → ≈ 4.6 days

const X_LAYER_CHAIN: Chain = {
  id: USDT0_CHAIN_ID,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/x-layer" },
  },
};

// ─── Error normalisation ───────────────────────────────────────────────

class ToolError extends Error {
  constructor(public readonly code: ToolErrorCode, message: string) {
    super(message);
    this.name = "ToolError";
  }
}

type ToolErrorCode =
  | "invalid_input"
  | "invalid_address"
  | "invalid_signature"
  | "expired_authorization"
  | "market_not_open"
  | "insufficient_balance"
  | "upstream_error"
  | "missing_relayer"
  | "unknown_tool"
  | "unknown_resource"
  | "internal_error";

interface NormalisedError {
  code: ToolErrorCode;
  message: string;
}

function toMcpError(err: unknown): NormalisedError {
  if (err instanceof ToolError) return { code: err.code, message: err.message };
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    return {
      code: "invalid_input",
      message: first
        ? `${first.path.join(".") || "<root>"}: ${first.message}`
        : err.message,
    };
  }
  if (err instanceof Error) return { code: "internal_error", message: err.message };
  return { code: "internal_error", message: String(err) };
}

// ─── Input schemas (Zod) ───────────────────────────────────────────────

const AddressSchema = z
  .string()
  .refine((v): v is Address => isAddress(v), {
    message: "expected a 0x-prefixed 20-byte EVM address",
  });

const Bytes32Schema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "expected a 0x-prefixed 32-byte hex value");

const SignatureSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{130}$/, "expected a 0x-prefixed 65-byte hex signature");

const AmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, "expected a decimal amount with at most 6 fractional digits");

const ListActiveMarketsInput = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});

const GetMarketDetailsInput = z.object({
  marketAddress: AddressSchema,
});

const SubmitGaslessStakeInput = z.object({
  marketAddress: AddressSchema,
  side: z.enum(["OVER", "UNDER"]),
  from: AddressSchema,
  amountUsd: AmountSchema,
  validAfter: z.number().int().min(0),
  validBefore: z.number().int().positive(),
  nonce: Bytes32Schema,
  signature: SignatureSchema,
});

// ─── Minimal ABIs (only the fragments this server actually calls) ─────

const FACTORY_ABI = [
  {
    type: "event",
    name: "MarketCreated",
    anonymous: false,
    inputs: [
      { name: "market", type: "address", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "commitHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

const MARKET_ABI = [
  { type: "function", name: "status", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "question", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "agent", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "overPool", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "underPool", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "stakingClosesAt",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "stakeWithAuthorization",
    stateMutability: "nonpayable",
    inputs: [
      { name: "side", type: "uint8" }, // 0 = OVER, 1 = UNDER
      { name: "from", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

const USDT0_BALANCEOF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

/** Mirrors the on-chain enum order in PropMarketHook. */
const STATUS_LABELS = [
  "SEALED",
  "STAKING_OPEN",
  "AWAITING_REVEAL",
  "RESOLVED",
  "REFUNDED",
] as const;
const STAKING_OPEN_STATUS = 1 as const;

// ─── Static resources ─────────────────────────────────────────────────

interface RosterEntry {
  number: number;
  persona: string;
  name: string;
  role: string;
  templates: readonly string[];
}

const ROSTER: readonly RosterEntry[] = [
  { number: 1,  persona: "il-regista",        name: "Il Regista",       role: "Deep-lying playmaker",  templates: ["Clean sheet", "Possession", "Corners"] },
  { number: 2,  persona: "il-trequartista",   name: "Il Trequartista",  role: "Creative attacker",     templates: ["Next goal", "Shots on target", "Corners"] },
  { number: 3,  persona: "il-mediano",        name: "Il Mediano",       role: "Defensive enforcer",    templates: ["Fouls", "Yellow cards"] },
  { number: 4,  persona: "il-falso-nove",     name: "Il Falso Nove",    role: "False nine",            templates: ["Shots on target", "Possession", "Next goal"] },
  { number: 5,  persona: "il-libero",         name: "Il Libero",        role: "Sweeper",               templates: ["Clean sheet", "Corners"] },
  { number: 6,  persona: "l-ala",             name: "L'Ala",            role: "Wing-back",             templates: ["Corners", "Shots on target"] },
  { number: 7,  persona: "il-bomber",         name: "Il Bomber",        role: "Pure striker",          templates: ["Next goal", "Shots on target"] },
  { number: 8,  persona: "il-capitano",       name: "Il Capitano",      role: "Captain / Left flank",  templates: ["Yellow cards", "Fouls"] },
  { number: 9,  persona: "il-numero-dieci",   name: "Il Numero Dieci",  role: "Number 10",             templates: ["Possession", "Next goal", "Shots on target"] },
  { number: 10, persona: "il-catenaccio",     name: "Il Catenaccio",    role: "Defensive anchor",      templates: ["Clean sheet", "Yellow cards"] },
  { number: 11, persona: "l-ultimo",          name: "L'Ultimo",         role: "Last line (GK)",        templates: ["Clean sheet"] },
] as const;

const CONTRACTS = {
  chainId: USDT0_CHAIN_ID,
  chainName: "X Layer mainnet",
  rpc: RPC_URL,
  explorer: "https://www.oklink.com/x-layer",
  contracts: {
    propMarketHookFactory: FACTORY_ADDRESS,
    settlementToken: USDT0_ADDRESS,
    poolManager: POOL_MANAGER_ADDRESS,
  },
  settlementToken: {
    symbol: "USDT0",
    domainName: "USD₮0",
    domainVersion: "1",
    decimals: USDT0_DECIMALS,
  },
} as const;

// ─── Clients (publicClient is module-scope; relayer wallet is lazy) ───

const publicClient: PublicClient = createPublicClient({
  chain: X_LAYER_CHAIN,
  transport: http(RPC_URL),
});

let cachedRelayerWallet: WalletClient | null = null;
function getRelayerWallet(): WalletClient {
  if (cachedRelayerWallet) return cachedRelayerWallet;
  const raw = process.env.RELAYER_PRIVATE_KEY;
  if (!raw) {
    throw new ToolError(
      "missing_relayer",
      "RELAYER_PRIVATE_KEY env not set; the server can read on-chain state but cannot submit transactions.",
    );
  }
  const pk = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  const account = privateKeyToAccount(pk);
  cachedRelayerWallet = createWalletClient({
    account,
    chain: X_LAYER_CHAIN,
    transport: http(RPC_URL),
  });
  return cachedRelayerWallet;
}

// ─── Tool implementations ─────────────────────────────────────────────

async function getSystemStatus(): Promise<string> {
  const res = await fetch(`${STATUS_API_BASE}/api/status`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new ToolError(
      "upstream_error",
      `/api/status returned ${res.status} ${res.statusText}`,
    );
  }
  const body = (await res.json()) as unknown;
  return JSON.stringify(body, null, 2);
}

interface ActiveMarketSummary {
  market: Address;
  agent: Address;
  block: number;
  status: (typeof STATUS_LABELS)[number];
}

async function listActiveMarkets(limit: number): Promise<string> {
  const latest = await publicClient.getBlockNumber();
  const fromBlock = latest > EVENT_LOOKBACK_BLOCKS ? latest - EVENT_LOOKBACK_BLOCKS : 0n;

  const logs = await publicClient.getContractEvents({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    eventName: "MarketCreated",
    fromBlock,
    toBlock: "latest",
  });

  // Newest first; over-fetch a little because we filter by on-chain status.
  const candidates = logs.slice().reverse().slice(0, limit * 4);
  const open: ActiveMarketSummary[] = [];

  for (const log of candidates) {
    if (open.length >= limit) break;
    const market = log.args.market;
    const agent = log.args.agent;
    if (!market || !agent) continue;
    try {
      const status = await publicClient.readContract({
        address: market,
        abi: MARKET_ABI,
        functionName: "status",
      });
      if (status === STAKING_OPEN_STATUS) {
        open.push({
          market,
          agent,
          block: Number(log.blockNumber ?? 0n),
          status: STATUS_LABELS[STAKING_OPEN_STATUS],
        });
      }
    } catch {
      // a stale / malformed market — skip it rather than fail the whole list
    }
  }

  return JSON.stringify({ count: open.length, markets: open }, null, 2);
}

async function getMarketDetails(marketAddress: Address): Promise<string> {
  const [statusRaw, question, agent, overPool, underPool, stakingClosesAt] = await Promise.all([
    publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "status" }),
    publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "question" }),
    publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "agent" }),
    publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "overPool" }),
    publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "underPool" }),
    publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "stakingClosesAt" }),
  ]);

  const label = STATUS_LABELS[statusRaw] ?? `UNKNOWN(${statusRaw})`;
  const fmt = (v: bigint) => formatUnits(v, USDT0_DECIMALS);
  const stakingClosesAtUnix = Number(stakingClosesAt);

  return JSON.stringify(
    {
      address: marketAddress,
      status: label,
      question,
      agent,
      pools: {
        over: { wei: overPool.toString(), usdt0: fmt(overPool) },
        under: { wei: underPool.toString(), usdt0: fmt(underPool) },
        totalWei: (overPool + underPool).toString(),
      },
      stakingClosesAt: {
        unix: stakingClosesAtUnix,
        iso: new Date(stakingClosesAtUnix * 1000).toISOString(),
        isOpen: label === "STAKING_OPEN" && stakingClosesAtUnix * 1000 > Date.now(),
      },
      explorer: `https://www.oklink.com/x-layer/address/${marketAddress}`,
    },
    null,
    2,
  );
}

interface SubmitGaslessStakeArgs {
  marketAddress: Address;
  side: "OVER" | "UNDER";
  from: Address;
  amountUsd: string;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
  signature: Hex;
}

async function submitGaslessStake(args: SubmitGaslessStakeArgs): Promise<string> {
  // 1. Convert decimal amount → 6-decimal micros exactly once.
  const value = parseUnits(args.amountUsd, USDT0_DECIMALS);

  // 2. Cheap front-of-flight checks BEFORE we burn relayer gas.
  const nowSec = Math.floor(Date.now() / 1000);
  if (args.validBefore <= nowSec) {
    throw new ToolError(
      "expired_authorization",
      `validBefore (${args.validBefore}) is in the past (now=${nowSec})`,
    );
  }
  if (args.validAfter > nowSec + 60) {
    throw new ToolError(
      "expired_authorization",
      `validAfter (${args.validAfter}) is too far in the future (now=${nowSec})`,
    );
  }

  // 3. Verify the signature recovers to `from`. This catches a wrong
  //    domain / wrong chainId / wrong type-hash on the agent side BEFORE
  //    we spend gas to discover the same thing on chain.
  const auth: TransferAuthorization = {
    from: args.from,
    to: args.marketAddress, // the market hook is the EIP-3009 recipient
    value,
    validAfter: BigInt(args.validAfter),
    validBefore: BigInt(args.validBefore),
    nonce: args.nonce,
  };
  const recovered = await recoverTransferSigner(auth, args.signature);
  if (recovered.toLowerCase() !== args.from.toLowerCase()) {
    throw new ToolError(
      "invalid_signature",
      `signature recovered ${recovered}, expected from=${args.from}. ` +
        "Check the EIP-712 domain (name must be U+20AE-glyph USD₮0) and chainId (196).",
    );
  }

  // 4. Confirm the market is still open + the staker can cover the value.
  const [statusRaw, balance] = await Promise.all([
    publicClient.readContract({
      address: args.marketAddress,
      abi: MARKET_ABI,
      functionName: "status",
    }),
    publicClient.readContract({
      address: USDT0_ADDRESS,
      abi: USDT0_BALANCEOF_ABI,
      functionName: "balanceOf",
      args: [args.from],
    }),
  ]);
  if (statusRaw !== STAKING_OPEN_STATUS) {
    throw new ToolError(
      "market_not_open",
      `market.status() = ${STATUS_LABELS[statusRaw] ?? statusRaw}; expected STAKING_OPEN`,
    );
  }
  if (balance < value) {
    throw new ToolError(
      "insufficient_balance",
      `from balance ${formatUnits(balance, USDT0_DECIMALS)} USDT0 < value ${args.amountUsd} USDT0`,
    );
  }

  // 5. Split the 65-byte signature into (v, r, s) for the calldata.
  const sigBody = args.signature.slice(2); // strip 0x
  const r = (`0x${sigBody.slice(0, 64)}`) as Hex;
  const s = (`0x${sigBody.slice(64, 128)}`) as Hex;
  const v = parseInt(sigBody.slice(128, 130), 16);
  if (!Number.isFinite(v) || v < 27 || v > 28) {
    throw new ToolError("invalid_signature", `bad v: ${v} (expected 27 or 28)`);
  }

  // 6. Relayer wallet sends. The market's stakeWithAuthorization
  //    internally calls USDT0.transferWithAuthorization, so the user
  //    pays no gas; the relayer pays in OKB.
  const wallet = getRelayerWallet();
  const account = wallet.account;
  if (!account) {
    throw new ToolError("missing_relayer", "relayer wallet has no account attached");
  }
  const sideIndex = args.side === "OVER" ? 0 : 1;

  const txHash = await wallet.writeContract({
    account,
    chain: X_LAYER_CHAIN,
    address: args.marketAddress,
    abi: MARKET_ABI,
    functionName: "stakeWithAuthorization",
    args: [
      sideIndex,
      args.from,
      value,
      BigInt(args.validAfter),
      BigInt(args.validBefore),
      args.nonce,
      v,
      r,
      s,
    ],
  });

  return JSON.stringify(
    {
      txHash,
      marketAddress: args.marketAddress,
      side: args.side,
      from: args.from,
      amount: { usd: args.amountUsd, wei: value.toString(), decimals: USDT0_DECIMALS },
      explorer: `https://www.oklink.com/x-layer/tx/${txHash}`,
    },
    null,
    2,
  );
}

// ─── Server wiring ────────────────────────────────────────────────────

const server = new Server(
  { name: "regista11-mcp", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_system_status",
      description:
        "Read the protocol's live heartbeat (factory, agent online state, recent 24h activity). Backed by GET /api/status on regista11.xyz.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "list_active_markets",
      description:
        "List markets currently in STAKING_OPEN state, newest first. Reads MarketCreated events from the PropMarketHookFactory and filters by on-chain status.",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number", minimum: 1, maximum: 50, default: 20 } },
        required: [],
      },
    },
    {
      name: "get_market_details",
      description:
        "Read a single market's question, originating agent, OVER/UNDER pool balances (raw micros + human USDT0), status, and staking close time.",
      inputSchema: {
        type: "object",
        properties: {
          marketAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
        },
        required: ["marketAddress"],
      },
    },
    {
      name: "submit_gasless_stake",
      description:
        "Relay a user-signed EIP-3009 transferWithAuthorization to a market's stakeWithAuthorization. Requires RELAYER_PRIVATE_KEY env (OKB-funded). Returns the on-chain tx hash + OKLink link.",
      inputSchema: {
        type: "object",
        properties: {
          marketAddress: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
          side: { type: "string", enum: ["OVER", "UNDER"] },
          from: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
          amountUsd: {
            type: "string",
            description:
              "Decimal USDT0 amount, e.g. '5' or '5.000000'. Max 6 fractional digits.",
            pattern: "^\\d+(\\.\\d{1,6})?$",
          },
          validAfter: { type: "number", minimum: 0 },
          validBefore: {
            type: "number",
            description: "Unix seconds; authorization expires at this time.",
          },
          nonce: {
            type: "string",
            pattern: "^0x[0-9a-fA-F]{64}$",
            description: "0x-prefixed 32-byte random hex; unique per authorization.",
          },
          signature: {
            type: "string",
            pattern: "^0x[0-9a-fA-F]{130}$",
            description: "0x-prefixed 65-byte hex (r || s || v).",
          },
        },
        required: [
          "marketAddress",
          "side",
          "from",
          "amountUsd",
          "validAfter",
          "validBefore",
          "nonce",
          "signature",
        ],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req: CallToolRequest) => {
  try {
    const name = req.params.name;
    const argsRaw = req.params.arguments ?? {};
    switch (name) {
      case "get_system_status": {
        const text = await getSystemStatus();
        return { content: [{ type: "text", text }] };
      }
      case "list_active_markets": {
        const parsed = ListActiveMarketsInput.parse(argsRaw);
        const text = await listActiveMarkets(parsed.limit);
        return { content: [{ type: "text", text }] };
      }
      case "get_market_details": {
        const parsed = GetMarketDetailsInput.parse(argsRaw);
        const text = await getMarketDetails(parsed.marketAddress);
        return { content: [{ type: "text", text }] };
      }
      case "submit_gasless_stake": {
        const parsed = SubmitGaslessStakeInput.parse(argsRaw);
        const text = await submitGaslessStake({
          marketAddress: parsed.marketAddress,
          side: parsed.side,
          from: parsed.from,
          amountUsd: parsed.amountUsd,
          validAfter: parsed.validAfter,
          validBefore: parsed.validBefore,
          nonce: parsed.nonce as Hex,
          signature: parsed.signature as Hex,
        });
        return { content: [{ type: "text", text }] };
      }
      default: {
        throw new ToolError("unknown_tool", `unknown tool: ${name}`);
      }
    }
  } catch (err) {
    const { code, message } = toMcpError(err);
    return { isError: true, content: [{ type: "text", text: `${code}: ${message}` }] };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "regista11://roster",
      name: "The Eleven — persona roster",
      description:
        "The 11 active personas, their on-chain roles, and the market template families each persona is willing to open.",
      mimeType: "application/json",
    },
    {
      uri: "regista11://contracts",
      name: "On-chain contract registry",
      description:
        "Factory, USDT0 settlement token, Uniswap v4 PoolManager, plus chain config (id, rpc, explorer, decimals).",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req: ReadResourceRequest) => {
  const uri = req.params.uri;
  switch (uri) {
    case "regista11://roster":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(ROSTER, null, 2),
          },
        ],
      };
    case "regista11://contracts":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(CONTRACTS, null, 2),
          },
        ],
      };
    default:
      throw new ToolError("unknown_resource", `unknown resource: ${uri}`);
  }
});

// ─── Bootstrap ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr (not stdout) so we don't corrupt the MCP framing channel
  console.error(
    `regista11-mcp v0.1.0 listening on stdio · factory=${FACTORY_ADDRESS} · chain=${USDT0_CHAIN_ID}`,
  );
}

main().catch((err: unknown) => {
  console.error("regista11-mcp fatal:", err);
  process.exit(1);
});
