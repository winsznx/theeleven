import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { LUltimo } from "../../src/personas/LUltimo.js";
import {
  cleanSheetRemaining,
  parseRevealedParams,
  templateRegistry,
  type CleanSheetRemainingParams,
} from "../../src/propositions/index.js";

import { buildTestAgent, snap } from "./_personaHelpers.js";

describe("LUltimo", () => {
  let agent: LUltimo;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const built = buildTestAgent({ Persona: LUltimo, index: 10, name: "L'Ultimo" });
    agent = built.agent;
    cleanup = built.cleanup;
  });
  afterAll(async () => cleanup());

  it("evaluate returns [] when status is NS", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ status: "NS", minute: 0 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("proposes CleanSheetRemaining AWAY at minute 30 (slot 1, 25' window)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 30 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(cleanSheetRemaining.id);
    const params = r[0]!.templateParams as CleanSheetRemainingParams;
    expect(params.targetTeam).toBe("AWAY");
    expect(params.windowMinutes).toBe(25);
  });

  it("proposes CleanSheetRemaining HOME at minute 80 (slot 3, 15' window)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 80, status: "2H" }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 2,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(cleanSheetRemaining.id);
    const params = r[0]!.templateParams as CleanSheetRemainingParams;
    expect(params.targetTeam).toBe("HOME");
    expect(params.windowMinutes).toBe(15);
  });

  it("buildRevealedParams round-trips a slot-1 CleanSheet AWAY proposal", async () => {
    const proposals = await agent.evaluate({
      snapshot: snap({ minute: 30 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    const encoded = await agent.buildRevealedParams({ proposal: proposals[0]! });
    const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
    expect(parsed.templateId).toBe(proposals[0]!.templateId);
    expect(parsed.decodedParams).toEqual(proposals[0]!.templateParams);
  });
});
