import { describe, it, expect } from "vitest";

import { HttpError, parseFrameAmount } from "@/lib/http";

describe("parseFrameAmount", () => {
  it("converts whole-dollar strings to micros", () => {
    expect(parseFrameAmount("5")).toBe(5_000_000n);
    expect(parseFrameAmount("1")).toBe(1_000_000n);
    expect(parseFrameAmount("1000")).toBe(1_000_000_000n);
  });

  it("converts fractional-dollar strings to micros", () => {
    expect(parseFrameAmount("0.5")).toBe(500_000n);
    expect(parseFrameAmount("10.50")).toBe(10_500_000n);
    expect(parseFrameAmount("0.000001")).toBe(1n);
  });

  it("rejects zero, negative, NaN, and non-numeric input", () => {
    expect(() => parseFrameAmount("0")).toThrow(HttpError);
    expect(() => parseFrameAmount("0.0")).toThrow(HttpError);
    expect(() => parseFrameAmount("-1")).toThrow(HttpError);
    expect(() => parseFrameAmount("abc")).toThrow(HttpError);
    expect(() => parseFrameAmount("")).toThrow(HttpError);
    expect(() => parseFrameAmount("$5")).toThrow(HttpError);
  });

  it("rejects amounts above the $1000 frame cap", () => {
    expect(() => parseFrameAmount("1001")).toThrow(HttpError);
    expect(() => parseFrameAmount("1000.5")).toThrow(HttpError);
    expect(() => parseFrameAmount("9999")).toThrow(HttpError);
  });
});
