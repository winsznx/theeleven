import "server-only";

import type { Address, Hex } from "viem";

/**
 * Server-only in-memory cache that bridges /sign → /submit.
 *
 * /sign generates a fresh nonce + validBefore, builds the typed data, and
 * stores them keyed by (userAddress, market, side, amountMicros). The user
 * signs that exact tuple in their wallet. /submit receives the signature
 * back from Warpcast WITHOUT the pre-image (Farcaster Frame v2 returns
 * only the transactionId, i.e. the signature) — so it has to look up the
 * cached nonce + validBefore by the same key to reconstruct the
 * facilitator request.
 *
 * Caveat (serverless): each Vercel function instance has its own cache.
 * If /sign and /submit land on different instances, the user sees the
 * "Authorization expired" frame and has to retry. In production a shared
 * KV (Upstash, Redis) would harden this; in-memory is acceptable for the
 * single-region hack demo.
 */

interface PendingAuth {
  nonce: Hex;
  validBefore: bigint;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const CACHE = new Map<string, PendingAuth>();

export function makeAuthCacheKey(
  user: Address,
  market: Address,
  side: 1 | 2,
  amountMicros: bigint,
): string {
  return `${user.toLowerCase()}:${market.toLowerCase()}:${side}:${amountMicros.toString()}`;
}

function gc(now: number): void {
  for (const [k, v] of CACHE) {
    if (v.expiresAt < now) CACHE.delete(k);
  }
}

export function storePendingAuth(
  key: string,
  payload: { nonce: Hex; validBefore: bigint },
): void {
  const now = Date.now();
  gc(now);
  CACHE.set(key, { ...payload, expiresAt: now + TTL_MS });
}

/** Look up + remove. Returns null when missing or expired. */
export function popPendingAuth(
  key: string,
): { nonce: Hex; validBefore: bigint } | null {
  const now = Date.now();
  gc(now);
  const hit = CACHE.get(key);
  if (!hit) return null;
  CACHE.delete(key);
  if (hit.expiresAt < now) return null;
  return { nonce: hit.nonce, validBefore: hit.validBefore };
}

/** Test-only escape hatch. */
export function _clearAuthCacheForTesting(): void {
  CACHE.clear();
}
