import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { LAla } from "../../src/personas/LAla.js";
import {
  cornerCountOver,
  parseRevealedParams,
  shotsOnTargetOver,
  templateRegistry,
  type CornerCountOverParams,
  type ShotsOnTargetOverParams,
} from "../../src/propositions/index.js";

import { buildTestAgent, snap } from "./_personaHelpers.js";

describe("LAla", () => {
  let agent: LAla;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const built = buildTestAgent({ Persona: LAla, index: 5, name: "L'Ala" });
    agent = built.agent;
    cleanup = built.cleanup;
  });
  afterAll(async () => cleanup());

  it("evaluate returns [] for FT (terminal)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ status: "FT", minute: 90 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("proposes CornerCountOver HOME >2 at minute 15 (slot 1)", async () => {
    const homeCorners = 1;
    const snapshot = snap({
      minute: 15,
      statistics: {
        ...snap().statistics,
        home: { ...snap().statistics.home, cornerKicks: homeCorners },
      },
    });
    const r = await agent.evaluate({
      snapshot,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(cornerCountOver.id);
    const params = r[0]!.templateParams as CornerCountOverParams;
    expect(params.targetTeam).toBe("HOME");
    expect(params.thresholdCount).toBe(2);
    expect(params.openedAtCornerCount).toBe(homeCorners);
  });

  it("proposes ShotsOnTargetOver HOME >2 at minute 40 (slot 2)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 40 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(shotsOnTargetOver.id);
    const params = r[0]!.templateParams as ShotsOnTargetOverParams;
    expect(params.targetTeam).toBe("HOME");
    expect(params.thresholdCount).toBe(2);
  });

  it("buildRevealedParams round-trips a slot-1 proposal", async () => {
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
