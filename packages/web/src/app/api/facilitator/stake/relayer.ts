import "server-only";

import { createWalletClient, http, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xLayer } from "viem/chains";

import { HttpError } from "@/lib/http";

/**
 * Server-only relayer wallet for /api/facilitator/stake.
 *
 * The "server-only" import is the trip-wire: any client component that
 * accidentally imports this file would fail the Next.js build with a clear
 * error. The RELAYER_PRIVATE_KEY env var is read lazily on first invocation
 * so the build itself doesn't require it (Vercel preview deploys, Tim's
 * laptop, CI) — only routes that actually try to relay will throw.
 */

let _client: WalletClient | null = null;

export function getRelayer(): WalletClient {
  if (_client) return _client;
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) {
    throw new HttpError(
      503,
      "Facilitator unavailable",
      "RELAYER_PRIVATE_KEY env var not set",
    );
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(pk)) {
    throw new HttpError(
      503,
      "Facilitator unavailable",
      "RELAYER_PRIVATE_KEY is not a 32-byte hex string",
    );
  }
  const account = privateKeyToAccount(pk as `0x${string}`);
  _client = createWalletClient({
    account,
    chain: xLayer,
    transport: http("https://rpc.xlayer.tech"),
  }) as WalletClient;
  return _client;
}

/* ──────────────────── Idempotency: nonce dedupe ──────────────────── */

const RECENT_NONCES = new Map<string, number>();
const NONCE_TTL_MS = 15 * 60 * 1000;

/** Drop expired entries; throw HttpError(409) on duplicate. */
export function checkAndRecordNonce(nonce: string): void {
  const now = Date.now();
  for (const [n, ts] of RECENT_NONCES) {
    if (now - ts > NONCE_TTL_MS) RECENT_NONCES.delete(n);
  }
  if (RECENT_NONCES.has(nonce)) {
    throw new HttpError(409, "Duplicate submission", `Nonce reuse: ${nonce}`);
  }
  RECENT_NONCES.set(nonce, now);
}

/** Test-only escape hatch. */
export function _clearNoncesForTesting(): void {
  RECENT_NONCES.clear();
  _client = null;
}
