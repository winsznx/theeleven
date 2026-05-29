import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { IlBomber } from "../../src/personas/IlBomber.js";
import {
  nextGoalHomeAway,
  parseRevealedParams,
  shotsOnTargetOver,
  templateRegistry,
  type NextGoalHomeAwayParams,
  type ShotsOnTargetOverParams,
} from "../../src/propositions/index.js";

import { buildTestAgent, snap } from "./_personaHelpers.js";

describe("IlBomber", () => {
  let agent: IlBomber;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const built = buildTestAgent({ Persona: IlBomber, index: 6, name: "Il Bomber" });
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

  it("proposes NextGoalHomeAway at minute 10 (slot 1, 20' window)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 10 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(nextGoalHomeAway.id);
    const params = r[0]!.templateParams as NextGoalHomeAwayParams;
    expect(params.windowMinutes).toBe(20);
    expect(params.openedAtMinute).toBe(10);
  });

  it("proposes ShotsOnTargetOver TOTAL >3 at minute 40 with TOTAL baseline (slot 2)", async () => {
    const homeShots = 2;
    const awayShots = 3;
    const snapshot = snap({
      minute: 40,
      statistics: {
        home: { ...snap().statistics.home, shotsOnGoal: homeShots },
        away: { ...snap().statistics.away, shotsOnGoal: awayShots },
      },
    });
    const r = await agent.evaluate({
      snapshot,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(shotsOnTargetOver.id);
    const params = r[0]!.templateParams as ShotsOnTargetOverParams;
    expect(params.targetTeam).toBe("TOTAL");
    expect(params.openedAtShotsCount).toBe(homeShots + awayShots);
  });

  it("buildRevealedParams round-trips a slot-1 NextGoal proposal", async () => {
    const proposals = await agent.evaluate({
      snapshot: snap({ minute: 10 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    const encoded = await agent.buildRevealedParams({ proposal: proposals[0]! });
    const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
    expect(parsed.templateId).toBe(proposals[0]!.templateId);
    expect(parsed.decodedParams).toEqual(proposals[0]!.templateParams);
  });
});
