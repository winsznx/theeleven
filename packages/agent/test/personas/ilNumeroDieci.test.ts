import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { IlNumeroDieci } from "../../src/personas/IlNumeroDieci.js";
import {
  nextGoalHomeAway,
  parseRevealedParams,
  possessionOverPct,
  templateRegistry,
  type NextGoalHomeAwayParams,
  type PossessionOverPctParams,
} from "../../src/propositions/index.js";

import { buildTestAgent, snap } from "./_personaHelpers.js";

describe("IlNumeroDieci", () => {
  let agent: IlNumeroDieci;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const built = buildTestAgent({ Persona: IlNumeroDieci, index: 8, name: "Il Numero Dieci" });
    agent = built.agent;
    cleanup = built.cleanup;
  });
  afterAll(async () => cleanup());

  it("evaluate returns [] outside slot windows (minute 0)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 0 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("proposes PossessionOverPct HOME >60% at minute 15 (slot 1)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 15 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(possessionOverPct.id);
    const params = r[0]!.templateParams as PossessionOverPctParams;
    expect(params.targetTeam).toBe("HOME");
    expect(params.thresholdPct).toBe(60);
    expect(params.windowMinutes).toBe(20);
  });

  it("proposes NextGoalHomeAway at minute 45 (slot 2, 15' window)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 45 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(nextGoalHomeAway.id);
    const params = r[0]!.templateParams as NextGoalHomeAwayParams;
    expect(params.windowMinutes).toBe(15);
  });

  it("buildRevealedParams round-trips a slot-1 Possession proposal", async () => {
    const proposals = await agent.evaluate({
      snapshot: snap({ minute: 15 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    const encoded = await agent.buildRevealedParams({ proposal: proposals[0]! });
    const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
    expect(parsed.templateId).toBe(proposals[0]!.templateId);
    expect(parsed.decodedParams).toEqual(proposals[0]!.templateParams);
  });
});
