import "server-only";

import type { Address, Hex } from "viem";

import { WEB_DEPLOYMENT } from "@/lib/deployment";
import { getFactoryMarkets, getPublicClient } from "@/lib/onchain";

/**
 * Shared status-assembly used by the /status page and /api/status endpoint.
 *
 * All on-chain reads run with a 30s module-scope cache; the agent /health
 * fetch caches for 10s. Each call to load() returns the cached value when
 * fresh, otherwise refetches. Module state survives within a Vercel
 * function instance.
 */

export type AgentHealth =
  | { status: "online"; raw: AgentHealthShape }
  | { status: "offline"; reason: string }
  | { status: "not-configured" };

interface AgentHealthShape {
  status: "starting" | "ok";
  startedAt: string;
  fixtureId: number | null;
  personasActive: number;
  personaSlugs: string[];
}

export interface ActivityCounts {
  marketsCreated: number;
  stakesPlaced: number | null;
  resolutions: number | null;
  volumeMicros: bigint;
}

export interface RecentMarketCreated {
  marketAddress: Address;
  agent: Address;
  commitHash: Hex;
  blockNumber: bigint;
}

export interface StatusPayload {
  generatedAt: string;
  factory: Address | null;
  network: string;
  chainId: number;
  deployedAtBlock: string | null;
  deployedAtISO: string | null;
  agent: AgentHealth;
  /** Seconds since the agent process started (proxy for "last tick" freshness
   *  until the agent emits an explicit lastTickAt). null when offline. */
  lastTickAgeSeconds: number | null;
  activity: ActivityCounts;
  recentMarkets: RecentMarketCreated[];
}

const AGENT_TTL_MS = 10_000;
const ONCHAIN_TTL_MS = 30_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
let agentCache: CacheEntry<AgentHealth> | null = null;
let activityCache: CacheEntry<{
  activity: ActivityCounts;
  recentMarkets: RecentMarketCreated[];
}> | null = null;

/** Test-only escape hatch — clears every status cache. */
export function _clearStatusCacheForTesting(): void {
  agentCache = null;
  activityCache = null;
}

async function loadAgentHealth(): Promise<AgentHealth> {
  const now = Date.now();
  if (agentCache && agentCache.expiresAt > now) return agentCache.value;

  const url = process.env.PUBLIC_AGENT_URL;
  if (!url) {
    const value: AgentHealth = { status: "not-configured" };
    agentCache = { value, expiresAt: now + AGENT_TTL_MS };
    return value;
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      const value: AgentHealth = {
        status: "offline",
        reason: `agent returned ${res.status}`,
      };
      agentCache = { value, expiresAt: now + AGENT_TTL_MS };
      return value;
    }
    const raw = (await res.json()) as AgentHealthShape;
    const value: AgentHealth = { status: "online", raw };
    agentCache = { value, expiresAt: now + AGENT_TTL_MS };
    return value;
  } catch (err) {
    const value: AgentHealth = {
      status: "offline",
      reason: err instanceof Error ? err.message : String(err),
    };
    agentCache = { value, expiresAt: now + AGENT_TTL_MS };
    return value;
  }
}

const ONE_DAY_BLOCKS_XLAYER = 43_200n; // X Layer ~2s blocks → 24h = 43,200

async function loadOnchainActivity(): Promise<{
  activity: ActivityCounts;
  recentMarkets: RecentMarketCreated[];
}> {
  const now = Date.now();
  if (activityCache && activityCache.expiresAt > now) return activityCache.value;

  if (!WEB_DEPLOYMENT.factory) {
    const empty = {
      activity: {
        marketsCreated: 0,
        stakesPlaced: null,
        resolutions: null,
        volumeMicros: 0n,
      },
      recentMarkets: [] as RecentMarketCreated[],
    };
    activityCache = { value: empty, expiresAt: now + ONCHAIN_TTL_MS };
    return empty;
  }

  try {
    const client = getPublicClient();
    const latest = await client.getBlockNumber();
    const fromBlock =
      latest > ONE_DAY_BLOCKS_XLAYER ? latest - ONE_DAY_BLOCKS_XLAYER : 0n;
    // Scan factory events from the deployment block (cheap) but only count
    // the last 24h slice for activity.
    const events = await getFactoryMarkets();
    const recent = events
      .filter((e) => e.blockNumber >= fromBlock)
      .sort((a, b) => Number(b.blockNumber - a.blockNumber))
      .slice(0, 10)
      .map((e) => ({
        marketAddress: e.marketAddress,
        agent: e.agent,
        commitHash: e.commitHash,
        blockNumber: e.blockNumber,
      }));
    const value = {
      activity: {
        marketsCreated: events.filter((e) => e.blockNumber >= fromBlock).length,
        stakesPlaced: null,
        resolutions: null,
        volumeMicros: 0n,
      },
      recentMarkets: recent,
    };
    activityCache = { value, expiresAt: now + ONCHAIN_TTL_MS };
    return value;
  } catch {
    const fallback = {
      activity: {
        marketsCreated: 0,
        stakesPlaced: null,
        resolutions: null,
        volumeMicros: 0n,
      },
      recentMarkets: [] as RecentMarketCreated[],
    };
    activityCache = { value: fallback, expiresAt: now + ONCHAIN_TTL_MS };
    return fallback;
  }
}

export async function loadStatus(): Promise<StatusPayload> {
  const [agent, onchain] = await Promise.all([
    loadAgentHealth(),
    loadOnchainActivity(),
  ]);

  let lastTickAgeSeconds: number | null = null;
  if (agent.status === "online" && agent.raw.startedAt) {
    const started = new Date(agent.raw.startedAt).getTime();
    if (!Number.isNaN(started)) {
      lastTickAgeSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    factory: WEB_DEPLOYMENT.factory,
    network: WEB_DEPLOYMENT.network,
    chainId: WEB_DEPLOYMENT.chainId,
    deployedAtBlock:
      WEB_DEPLOYMENT.deployedAtBlock !== null
        ? WEB_DEPLOYMENT.deployedAtBlock.toString()
        : null,
    deployedAtISO: WEB_DEPLOYMENT.deployedAtISO,
    agent,
    lastTickAgeSeconds,
    activity: onchain.activity,
    recentMarkets: onchain.recentMarkets,
  };
}
