import {
  USDT0_ADDRESS,
  USDT0_EIP712_NAME,
  USDT0_EIP712_VERSION,
} from "@/config/tokens";

/**
 * EIP-3009 typed-data builder for USDT0 on X Layer.
 *
 * The EIP-712 domain name MUST be exactly "USD₮0" (U+20AE TUGRIK SIGN, NOT
 * ASCII "T"). The deployed USDT0 contract on X Layer uses the tugrik glyph
 * in its DOMAIN_SEPARATOR; an ASCII "T" produces a different hash and the
 * wallet's signature won't recover to the user's address.
 *
 * The wallet popup will display the domain to the user — that's the
 * canonical "this is real USDT, not a phish" moment in the flow.
 */

export const USDT0_EIP712_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export const X_LAYER_CHAIN_ID = 196 as const;

/** Auth validity window — locked at 5 minutes per PRD §8.7. Do not configure. */
export const VALID_BEFORE_WINDOW_SECONDS = 5 * 60;

export interface BuildEIP3009Args {
  from: `0x${string}`;
  /** The market contract that will call USDT0.transferWithAuthorization. */
  to: `0x${string}`;
  /** Amount in 6-decimal USDT0 micros. */
  value: bigint;
  /** Defaults to Date.now() — override only in tests for determinism. */
  nowSeconds?: number;
  /** Defaults to 32 random bytes — override only in tests. */
  nonce?: `0x${string}`;
}

export interface EIP3009TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: `0x${string}`;
  };
  types: typeof USDT0_EIP712_TYPES;
  primaryType: "TransferWithAuthorization";
  message: {
    from: `0x${string}`;
    to: `0x${string}`;
    value: bigint;
    validAfter: bigint;
    validBefore: bigint;
    nonce: `0x${string}`;
  };
}

function randomNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return ("0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")) as `0x${string}`;
}

export function buildEIP3009TypedData({
  from,
  to,
  value,
  nowSeconds,
  nonce,
}: BuildEIP3009Args): EIP3009TypedData {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const validAfter = 0n;
  const validBefore = BigInt(now + VALID_BEFORE_WINDOW_SECONDS);
  const finalNonce = nonce ?? randomNonce();

  return {
    domain: {
      name: USDT0_EIP712_NAME,
      version: USDT0_EIP712_VERSION,
      chainId: X_LAYER_CHAIN_ID,
      verifyingContract: USDT0_ADDRESS,
    },
    types: USDT0_EIP712_TYPES,
    primaryType: "TransferWithAuthorization",
    message: { from, to, value, validAfter, validBefore, nonce: finalNonce },
  };
}

/**
 * Split a 65-byte wallet signature into the v/r/s components expected by
 * USDT0.transferWithAuthorization. Accepts EIP-2098 short signatures and
 * normalizes v=0/1 → 27/28.
 */
export function splitSignature(signature: `0x${string}`): {
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
} {
  if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
    throw new Error(`splitSignature: expected 65-byte hex, got ${signature.length} chars`);
  }
  const r = ("0x" + signature.slice(2, 66)) as `0x${string}`;
  const s = ("0x" + signature.slice(66, 130)) as `0x${string}`;
  let v = parseInt(signature.slice(130, 132), 16);
  if (v === 0 || v === 1) v += 27;
  return { v, r, s };
}
