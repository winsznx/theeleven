import {
  createPublicClient,
  http,
  parseAbiItem,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { xLayer } from "wagmi/chains";

import { PropMarketHookABI } from "@/abis/PropMarketHook";
import { PropMarketHookFactoryABI } from "@/abis/PropMarketHookFactory";
import { IUSDT0ABI } from "@/abis/IUSDT0";

import { WEB_DEPLOYMENT } from "./deployment";
import { decodeRevealedParams } from "./templates";

import type { MarketOutcome, MarketRow, MarketState } from "@/types/market";

let _client: PublicClient | null = null;

/** Lazy singleton public client bound to X Layer mainnet. */
export function getPublicClient(): PublicClient {
  if (_client) return _client;
  _client = createPublicClient({
    chain: xLayer,
    transport: http("https://rpc.xlayer.tech"),
  }) as PublicClient;
  return _client;
}

const MARKET_CREATED_EVENT = parseAbiItem(
  "event MarketCreated(bytes32 indexed matchId, address indexed agent, address hook, bytes32 poolId, bytes32 commitHash, uint64 marketDeadline)",
);

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry<unknown>>();
// Bumped from 15s after the chunked getLogs scan started hitting X Layer
// RPC rate limits — re-scanning the same window every 15s blew the
// per-second budget for free public RPC. 60s is comfortable for the
// /markets list which refreshes on user interaction anyway.
const TTL_MS = 60_000;

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = CACHE.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;
  const value = await loader();
  CACHE.set(key, { value, expiresAt: now + TTL_MS });
  return value;
}

/** Test-only: drop the in-memory read cache AND the indexer cursor so
 *  the next call re-scans from the deploy block. */
export function clearOnchainCache(): void {
  CACHE.clear();
  INDEXER_STATE = null;
  INDEXER_RUNNING = false;
}

export interface FactoryMarketEvent {
  marketAddress: Address;
  agent: Address;
  matchId: Hex;
  commitHash: Hex;
  marketDeadline: bigint;
  blockNumber: bigint;
}

// ─── Persistent indexer state (module scope, per-container instance) ───
// Across the container's lifetime we keep an accumulated list of every
// MarketCreated event from the factory and the highest block we've
// successfully scanned. Each /markets request only scans (cursor → head)
// — usually a handful of 100-block windows — instead of re-scanning the
// entire deploy range every time. Cold-start gets the heavy work but
// subsequent reads are O(small).
interface IndexerState {
  cursorBlock: bigint;
  events: FactoryMarketEvent[];
  seenAddresses: Set<string>; // de-dupe guard (block reorg / overlap)
}
let INDEXER_STATE: IndexerState | null = null;
let INDEXER_RUNNING = false;
const PER_CALL_SCAN_BUDGET_MS = 4_500; // soft cap per /markets request

/**
 * Returns the indexed factory MarketCreated events. Implements an
 * incremental indexer over module-scoped state: each call advances the
 * cursor toward `latest` in 100-block chunks until either caught up or
 * the per-call budget elapses. Subsequent calls resume from the saved
 * cursor — no re-scanning. Returns [] when the factory is undeployed.
 */
export async function getFactoryMarkets(): Promise<FactoryMarketEvent[]> {
  if (!WEB_DEPLOYMENT.factory) return [];
  const deployBlock = WEB_DEPLOYMENT.deployedAtBlock ?? 0n;

  // Reset state if the factory address changed across hot reloads.
  if (INDEXER_STATE === null) {
    INDEXER_STATE = {
      cursorBlock: deployBlock - 1n,
      events: [],
      seenAddresses: new Set(),
    };
  }

  // Avoid two concurrent /markets handlers both scanning; the second
  // request reads the current state and returns immediately.
  if (INDEXER_RUNNING) return [...INDEXER_STATE.events];
  INDEXER_RUNNING = true;
  try {
    await advanceIndexer();
  } finally {
    INDEXER_RUNNING = false;
  }
  return [...INDEXER_STATE.events];
}

async function advanceIndexer(): Promise<void> {
  const state = INDEXER_STATE!;
  const client = getPublicClient();
  const CHUNK = 100n;
  const PARALLEL = 3;
  const start = Date.now();
  const latest = await client.getBlockNumber();
  if (latest <= state.cursorBlock) return;

  type ChunkResult = Awaited<
    ReturnType<typeof client.getLogs<typeof MARKET_CREATED_EVENT>>
  >;

  const fetchChunk = async (
    from: bigint,
    to: bigint,
    attempt = 0,
  ): Promise<ChunkResult | null> => {
    try {
      return await client.getLogs({
        address: WEB_DEPLOYMENT.factory!,
        event: MARKET_CREATED_EVENT,
        fromBlock: from,
        toBlock: to,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        msg.includes("rate limit") ||
        msg.includes("429") ||
        msg.includes("over rate");
      if (isRateLimit && attempt < 3) {
        await new Promise((res) => setTimeout(res, 600 * (attempt + 1)));
        return fetchChunk(from, to, attempt + 1);
      }
      return null;
    }
  };

  while (state.cursorBlock < latest) {
    if (Date.now() - start > PER_CALL_SCAN_BUDGET_MS) break;

    // BigInt arithmetic is split (`x += 1n` over `x + 1n`) because Next 15's
    // @vercel/nft tracer eagerly constant-folds `state.cursorBlock + 1n` in
    // variable initializers — it walks back to INDEXER_STATE (`let … = null`),
    // statically resolves the LHS to null, and crashes with "Cannot mix BigInt".
    // AssignmentExpressions aren't folded, so the same math via `+=` builds.
    const batchRanges: Array<{ from: bigint; to: bigint }> = [];
    let cursor: bigint = state.cursorBlock;
    cursor += 1n;
    let batched = 0;
    while (batched < PARALLEL && cursor <= latest) {
      let to: bigint = cursor;
      to += CHUNK;
      to -= 1n;
      batchRanges.push({ from: cursor, to: to > latest ? latest : to });
      cursor = to;
      cursor += 1n;
      batched += 1;
    }

    const results = await Promise.all(
      batchRanges.map((r) => fetchChunk(r.from, r.to)),
    );

    let aborted = false;
    for (let i = 0; i < results.length; i++) {
      const logs = results[i];
      const range = batchRanges[i]!;
      if (logs == null) {
        aborted = true;
        break;
      }
      for (const log of logs) {
        const hookAddr = log.args.hook as Address;
        if (state.seenAddresses.has(hookAddr.toLowerCase())) continue;
        state.seenAddresses.add(hookAddr.toLowerCase());
        state.events.push({
          marketAddress: hookAddr,
          agent: log.args.agent as Address,
          matchId: log.args.matchId as Hex,
          commitHash: log.args.commitHash as Hex,
          marketDeadline: log.args.marketDeadline ?? 0n,
          blockNumber: log.blockNumber ?? 0n,
        });
      }
      state.cursorBlock = range.to;
    }
    if (aborted) break;
  }
}

/**
 * Read a single market's full state and project it into the flat MarketRow
 * shape consumed by UI components.
 */
export async function getMarketRow(address: Address): Promise<MarketRow | null> {
  if (!WEB_DEPLOYMENT.factory) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return null;

  return cached(`market-row:${address}`, async () => {
    const client = getPublicClient();
    const [marketTuple, blockNumber] = await Promise.all([
      client.readContract({
        address,
        abi: PropMarketHookABI,
        functionName: "market",
      }),
      client.getBlockNumber(),
    ]);

    // PropMarketHook.market() returns the Market struct as a positional tuple.
    const [
      commitHash,
      _revealedParamsHash,
      revealedParams,
      commitBlock,
      _revealDeadline,
      marketDeadline,
      resolveDeadline,
      agent,
      totalYes,
      totalNo,
      outcomeRaw,
    ] = marketTuple as unknown as [
      Hex,
      Hex,
      Hex,
      bigint,
      bigint,
      bigint,
      bigint,
      Address,
      bigint,
      bigint,
      number,
    ];

    const outcome = (Number(outcomeRaw) as MarketOutcome) ?? 0;
    const state = deriveState({
      outcome,
      marketDeadline,
      hasReveal: revealedParams !== "0x" && revealedParams.length > 2,
    });

    const decoded = revealedParams && revealedParams !== "0x" ? decodeRevealedParams(revealedParams) : null;

    return {
      address,
      agent,
      agentPersona: WEB_DEPLOYMENT.personaByAgent?.get(agent) ?? null,
      commitHash,
      paymentToken: WEB_DEPLOYMENT.usdt0,
      marketDeadline,
      resolveDeadline,
      state,
      outcome,
      overStakeTotal: totalYes,
      underStakeTotal: totalNo,
      revealedTemplateId: decoded ? decoded.templateId : null,
      revealedParams: revealedParams || null,
      humanQuestion: decoded ? decoded.humanQuestion : null,
      blockCreated: commitBlock ?? blockNumber,
    } satisfies MarketRow;
  });
}

function deriveState(args: {
  outcome: MarketOutcome;
  marketDeadline: bigint;
  hasReveal: boolean;
}): MarketState {
  if (args.outcome === 3) return "REFUNDED";
  if (args.outcome === 1 || args.outcome === 2) return "RESOLVED";
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (!args.hasReveal && now < args.marketDeadline) return "STAKING_OPEN";
  return "AWAITING_REVEAL";
}

/**
 * Combined list reader: scan factory events, then read each market's state
 * via Promise.all (multicall would batch tighter but viem's multicall
 * requires the X Layer multicall3 deployment to be configured; Promise.all
 * is fine at our P16 scale).
 */
export async function getAllMarketRows(): Promise<MarketRow[]> {
  const events = await getFactoryMarkets();
  if (events.length === 0) return [];
  const rows = await Promise.all(events.map((e) => getMarketRow(e.marketAddress)));
  return rows.filter((r): r is MarketRow => r !== null);
}

/**
 * For each known persona wallet, read `registeredAgents(addr)` from the
 * factory. Returns the set of persona slugs the factory has registered.
 */
export async function getAgentRegistrations(): Promise<{
  registered: Address[];
  unregistered: Address[];
}> {
  if (!WEB_DEPLOYMENT.factory || !WEB_DEPLOYMENT.personaByAgent) {
    return { registered: [], unregistered: [] };
  }
  return cached(`agent-registry:${WEB_DEPLOYMENT.factory}`, async () => {
    const client = getPublicClient();
    const wallets = Array.from(WEB_DEPLOYMENT.personaByAgent!.keys());
    const results = await Promise.all(
      wallets.map((addr) =>
        client.readContract({
          address: WEB_DEPLOYMENT.factory!,
          abi: PropMarketHookFactoryABI,
          functionName: "registeredAgents",
          args: [addr],
        }),
      ),
    );
    const registered: Address[] = [];
    const unregistered: Address[] = [];
    wallets.forEach((addr, i) => {
      if (results[i]) registered.push(addr);
      else unregistered.push(addr);
    });
    return { registered, unregistered };
  });
}

export async function getUsdt0Balance(account: Address | null): Promise<bigint | null> {
  if (!account) return null;
  const client = getPublicClient();
  const balance = await client.readContract({
    address: WEB_DEPLOYMENT.usdt0,
    abi: IUSDT0ABI,
    functionName: "balanceOf",
    args: [account],
  });
  return balance as bigint;
}
