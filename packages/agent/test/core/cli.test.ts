import { describe, it, expect, vi } from "vitest";
import pino from "pino";

import { parseAgentCliArgs, runAgentCli } from "../../src/core/cli.js";

const silentLogger = pino({ level: "silent" });

describe("parseAgentCliArgs", () => {
  it("parses a positive integer fixtureId; persona defaults to ilRegista", () => {
    expect(parseAgentCliArgs(["node", "x", "1145546"])).toEqual({
      fixtureId: 1145546,
      persona: "ilRegista",
    });
  });

  it("throws on missing arg", () => {
    expect(() => parseAgentCliArgs(["node", "x"])).toThrow(/usage:/);
  });

  it("throws on non-integer", () => {
    expect(() => parseAgentCliArgs(["node", "x", "abc"])).toThrow(/positive integer/);
  });

  it("handles all 4 persona values + absence default + invalid (throws)", () => {
    expect(parseAgentCliArgs(["node", "x", "1", "--persona", "ilRegista"]).persona).toBe(
      "ilRegista"
    );
    expect(parseAgentCliArgs(["node", "x", "1", "--persona", "ilTrequartista"]).persona).toBe(
      "ilTrequartista"
    );
    expect(parseAgentCliArgs(["node", "x", "1", "--persona", "ilMediano"]).persona).toBe(
      "ilMediano"
    );
    expect(parseAgentCliArgs(["node", "x", "1", "--persona", "stub"]).persona).toBe("stub");
    expect(parseAgentCliArgs(["node", "x", "1"]).persona).toBe("ilRegista");
    expect(() => parseAgentCliArgs(["node", "x", "1", "--persona", "nope"])).toThrow(
      /invalid persona/
    );
  });
});

describe("runAgentCli", () => {
  it("throws when MASTER_MNEMONIC is missing", async () => {
    await expect(
      runAgentCli({
        argv: ["node", "x", "1"],
        deps: {
          env: {},
          logger: silentLogger,
          buildTickLoop: vi.fn(),
        },
      })
    ).rejects.toThrow(/MASTER_MNEMONIC/);
  });
});
