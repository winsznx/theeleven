import { describe, it, expect } from "vitest";

import {
  USDT0_ADDRESS,
  USDT0_EIP712_NAME,
  USDT0_EIP712_VERSION,
} from "@/config/tokens";
import {
  X_LAYER_CHAIN_ID,
  buildEIP3009TypedData,
  splitSignature,
} from "@/lib/eip3009";

const FROM = "0x1111111111111111111111111111111111111111" as `0x${string}`;
const TO = "0x2222222222222222222222222222222222222222" as `0x${string}`;

describe("buildEIP3009TypedData", () => {
  it("returns the correct EIP-712 domain (name, version, chainId, contract)", () => {
    const td = buildEIP3009TypedData({ from: FROM, to: TO, value: 10n });
    expect(td.domain.name).toBe(USDT0_EIP712_NAME);
    // Critical: U+20AE TUGRIK SIGN, NOT ASCII T.
    expect(td.domain.name).toBe("USD₮0");
    expect(td.domain.version).toBe(USDT0_EIP712_VERSION);
    expect(td.domain.chainId).toBe(X_LAYER_CHAIN_ID);
    expect(td.domain.chainId).toBe(196);
    expect(td.domain.verifyingContract).toBe(USDT0_ADDRESS);
  });

  it("validBefore is exactly 5 minutes from sign time (±2s tolerance)", () => {
    const now = Math.floor(Date.now() / 1000);
    const td = buildEIP3009TypedData({ from: FROM, to: TO, value: 1n, nowSeconds: now });
    const expected = BigInt(now + 5 * 60);
    expect(td.message.validBefore).toBe(expected);
  });

  it("validAfter is always 0n", () => {
    const td = buildEIP3009TypedData({ from: FROM, to: TO, value: 1n });
    expect(td.message.validAfter).toBe(0n);
  });

  it("generates a different 32-byte nonce on each call", () => {
    const a = buildEIP3009TypedData({ from: FROM, to: TO, value: 1n });
    const b = buildEIP3009TypedData({ from: FROM, to: TO, value: 1n });
    expect(a.message.nonce).not.toBe(b.message.nonce);
    expect(a.message.nonce).toMatch(/^0x[a-f0-9]{64}$/);
    expect(b.message.nonce).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("splitSignature splits a 65-byte hex into v/r/s; v 0/1 normalises to 27/28", () => {
    const r = "a".repeat(64);
    const s = "b".repeat(64);
    const sig = ("0x" + r + s + "1b") as `0x${string}`; // v=0x1b=27
    const { v, r: outR, s: outS } = splitSignature(sig);
    expect(v).toBe(27);
    expect(outR).toBe(("0x" + r) as `0x${string}`);
    expect(outS).toBe(("0x" + s) as `0x${string}`);

    const sigV0 = ("0x" + r + s + "00") as `0x${string}`;
    expect(splitSignature(sigV0).v).toBe(27);
  });
});
