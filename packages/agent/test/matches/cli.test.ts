import { describe, it, expect } from "vitest";
import { parseArgs } from "../../src/matches/cli.js";

describe("match:watch CLI parseArgs", () => {
  it("parses a positive integer fixtureId", () => {
    expect(parseArgs(["node", "cli", "1145546"])).toEqual({ fixtureId: 1145546 });
  });

  it("throws on missing arg", () => {
    expect(() => parseArgs(["node", "cli"])).toThrow(/usage:/);
  });

  it("throws on non-integer", () => {
    expect(() => parseArgs(["node", "cli", "abc"])).toThrow(/positive integer/);
  });

  it("throws on zero / negative", () => {
    expect(() => parseArgs(["node", "cli", "0"])).toThrow(/positive integer/);
    expect(() => parseArgs(["node", "cli", "-1"])).toThrow();
  });
});
