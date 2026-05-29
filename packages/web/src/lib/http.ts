import { getAddress, isHex } from "viem";

/**
 * Application HTTP error. The server-side `message` (passed to Error)
 * stays in logs; the `userMessage` is what we return to the client.
 *
 * Keep these strings short, production-toned, and free of internal jargon
 * — they will surface in toast UIs and error toasts.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly userMessage: string,
    serverMessage: string,
  ) {
    super(serverMessage);
    this.name = "HttpError";
  }

  toResponse(): Response {
    return Response.json({ error: this.userMessage }, { status: this.status });
  }
}

/* ──────────────────── 3-layer validation helpers ──────────────────── */

function requireString(raw: unknown, field: string): string {
  if (typeof raw !== "string") {
    throw new HttpError(400, `Invalid ${field}`, `${field} not a string`);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new HttpError(400, `Invalid ${field}`, `${field} empty`);
  }
  return trimmed;
}

/** Layered: string → 0x40hex regex → viem.getAddress checksum normalization. */
export function parseAddress(raw: unknown, field = "address"): `0x${string}` {
  const s = requireString(raw, field);
  if (!/^0x[a-fA-F0-9]{40}$/.test(s)) {
    throw new HttpError(400, `Invalid ${field}`, `${field} bad format: ${s}`);
  }
  try {
    return getAddress(s);
  } catch {
    throw new HttpError(400, `Invalid ${field}`, `${field} failed checksum: ${s}`);
  }
}

/** Layered: string → integer regex → BigInt + 0 < n ≤ 10^24. */
export function parseAmount(raw: unknown, field = "amount"): bigint {
  const s = requireString(raw, field);
  if (!/^[0-9]+$/.test(s)) {
    throw new HttpError(400, `Invalid ${field}`, `${field} not a positive integer: ${s}`);
  }
  const n = BigInt(s);
  if (n <= 0n) {
    throw new HttpError(400, `Invalid ${field}`, `${field} must be > 0`);
  }
  if (n > 10n ** 24n) {
    throw new HttpError(400, `Invalid ${field}`, `${field} exceeds max 10^24`);
  }
  return n;
}

/** Layered: string → 0x64hex regex → viem.isHex sanity. */
export function parseHex32(raw: unknown, field = "bytes32"): `0x${string}` {
  const s = requireString(raw, field);
  if (!/^0x[a-fA-F0-9]{64}$/.test(s)) {
    throw new HttpError(400, `Invalid ${field}`, `${field} not 32 bytes hex: ${s}`);
  }
  if (!isHex(s)) {
    throw new HttpError(400, `Invalid ${field}`, `${field} failed viem isHex`);
  }
  return s as `0x${string}`;
}

/**
 * Split a 65-byte hex signature `0x` + 130 chars into v/r/s components.
 * Accepts v as 27/28 (Ethereum convention) or 0/1 (some wallets); always
 * returns 27/28.
 */
export function parseSignature(raw: unknown, field = "signature"): {
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
} {
  const sig = requireString(raw, field);
  if (!/^0x[a-fA-F0-9]{130}$/.test(sig)) {
    throw new HttpError(400, `Invalid ${field}`, `${field} not 65 bytes: ${sig.slice(0, 12)}…`);
  }
  const r = ("0x" + sig.slice(2, 66)) as `0x${string}`;
  const s = ("0x" + sig.slice(66, 130)) as `0x${string}`;
  let v = parseInt(sig.slice(130, 132), 16);
  if (v === 0 || v === 1) v += 27;
  if (v !== 27 && v !== 28) {
    throw new HttpError(400, `Invalid ${field}`, `${field} unexpected v: ${v}`);
  }
  return { v, r, s };
}

/** Validates a future-Unix-seconds bigint within a reasonable window. */
export function parseValidBefore(raw: unknown, field = "validBefore"): bigint {
  const n = parseAmount(raw, field);
  const now = BigInt(Math.floor(Date.now() / 1000));
  // Allow a tiny 10s clock-skew tolerance on the lower bound.
  if (n < now - 10n) {
    throw new HttpError(400, `Invalid ${field}`, `${field} already expired`);
  }
  if (n > now + 60n * 10n) {
    throw new HttpError(400, `Invalid ${field}`, `${field} too far in future`);
  }
  return n;
}

export function parseSide(raw: unknown, field = "side"): 1 | 2 {
  if (raw !== 1 && raw !== 2 && raw !== "1" && raw !== "2") {
    throw new HttpError(400, `Invalid ${field}`, `${field} must be 1 or 2`);
  }
  return Number(raw) as 1 | 2;
}

/** Generic hex parser. Validates via the supplied regex (defaults to any 0x-prefixed hex). */
export function parseHex(
  raw: unknown,
  field = "hex",
  pattern: RegExp = /^0x[a-fA-F0-9]+$/,
): `0x${string}` {
  const s = requireString(raw, field);
  if (!pattern.test(s)) {
    throw new HttpError(400, `Invalid ${field}`, `${field} did not match ${pattern}`);
  }
  return s as `0x${string}`;
}

/**
 * Whole-dollar USDT0 amount string ("5", "0.5", "10.50") → 6-decimal micros.
 * Rejects negatives, zero, NaN, anything over the $1000 frame cap.
 *
 * Used by the Farcaster frame inputText where the user types a dollar amount
 * (not micros).
 */
const FRAME_AMOUNT_REGEX = /^(\d{1,4})(?:\.(\d{1,6}))?$/;
const FRAME_MAX_DOLLARS = 1000;
const USDT0_DEC = 6;

export function parseFrameAmount(raw: unknown, field = "amount"): bigint {
  const s = requireString(raw, field);
  const match = FRAME_AMOUNT_REGEX.exec(s);
  if (!match) {
    throw new HttpError(400, "Invalid amount", `${field} not a valid dollar amount: ${s}`);
  }
  const whole = BigInt(match[1] ?? "0");
  if (whole > BigInt(FRAME_MAX_DOLLARS)) {
    throw new HttpError(
      400,
      `Amount above $${FRAME_MAX_DOLLARS} cap`,
      `${field} above cap: ${s}`,
    );
  }
  const fracStr = (match[2] ?? "").padEnd(USDT0_DEC, "0").slice(0, USDT0_DEC);
  const frac = BigInt(fracStr || "0");
  const micros = whole * 10n ** BigInt(USDT0_DEC) + frac;
  if (micros <= 0n) {
    throw new HttpError(400, "Amount must be greater than zero", `${field} is zero`);
  }
  // Second cap check: e.g. "1000.5" passes the whole-dollar check but the
  // micros total exceeds.
  if (micros > BigInt(FRAME_MAX_DOLLARS) * 10n ** BigInt(USDT0_DEC)) {
    throw new HttpError(
      400,
      `Amount above $${FRAME_MAX_DOLLARS} cap`,
      `${field} micros above cap: ${micros}`,
    );
  }
  return micros;
}
