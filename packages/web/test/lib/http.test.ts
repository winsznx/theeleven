import { describe, it, expect } from "vitest";

import {
  HttpError,
  parseAddress,
  parseAmount,
  parseHex32,
  parseSignature,
} from "@/lib/http";

describe("HttpError + 3-layer validators", () => {
  it("parseAddress accepts checksummed, lowercase, and mixed-case addresses", () => {
    const lower = "0x1111111111111111111111111111111111111111";
    const mixedA = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const mixedB = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01";
    // All-1s passes checksum trivially; viem normalizes to lowercase.
    expect(parseAddress(lower).toLowerCase()).toBe(lower);
    // Normalised output matches the lowercase source character-for-character.
    expect(parseAddress(mixedA).toLowerCase()).toBe(mixedA);
    expect(parseAddress(mixedB).toLowerCase()).toBe(mixedB.toLowerCase());
  });

  it("parseAddress rejects wrong-length, non-hex, missing 0x", () => {
    expect(() => parseAddress("0x1234")).toThrow(HttpError);
    expect(() => parseAddress("1111111111111111111111111111111111111111")).toThrow(HttpError);
    expect(() => parseAddress("0xzzzz111111111111111111111111111111111111")).toThrow(HttpError);
    expect(() => parseAddress(undefined)).toThrow(HttpError);
    expect(() => parseAddress(12345)).toThrow(HttpError);
  });

  it('parseAmount accepts a positive integer string ("10000000")', () => {
    expect(parseAmount("10000000")).toBe(10_000_000n);
    expect(parseAmount("1")).toBe(1n);
  });

  it("parseAmount rejects negative, decimal, zero, and non-numeric inputs", () => {
    expect(() => parseAmount("-1")).toThrow(HttpError);
    expect(() => parseAmount("1.5")).toThrow(HttpError);
    expect(() => parseAmount("0")).toThrow(HttpError);
    expect(() => parseAmount("abc")).toThrow(HttpError);
    expect(() => parseAmount("")).toThrow(HttpError);
  });

  it("parseHex32 accepts a valid 32-byte hex and rejects malformed input", () => {
    const ok = "0x" + "a".repeat(64);
    expect(parseHex32(ok)).toBe(ok);
    expect(() => parseHex32("0xab")).toThrow(HttpError);
    expect(() => parseHex32("ab".repeat(32))).toThrow(HttpError);
    expect(() => parseHex32("0x" + "z".repeat(64))).toThrow(HttpError);
  });

  it("parseSignature splits 0x-prefixed 130-char hex into v/r/s with v∈{27,28}", () => {
    const r = "a".repeat(64);
    const s = "b".repeat(64);
    const sig = ("0x" + r + s + "1c") as `0x${string}`; // v=0x1c=28
    const out = parseSignature(sig);
    expect(out.v).toBe(28);
    expect(out.r).toBe("0x" + r);
    expect(out.s).toBe("0x" + s);

    expect(() => parseSignature("0xdead")).toThrow(HttpError);
  });
});
