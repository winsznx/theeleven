import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { IlCapitano } from "../../src/personas/IlCapitano.js";
import {
  foulsCountOver,
  parseRevealedParams,
  templateRegistry,
  yellowCardCountOver,
  type FoulsCountOverParams,
  type YellowCardCountOverParams,
} from "../../src/propositions/index.js";

import { buildTestAgent, snap } from "./_personaHelpers.js";

describe("IlCapitano", () => {
  let agent: IlCapitano;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const built = buildTestAgent({ Persona: IlCapitano, index: 7, name: "Il Capitano" });
    agent = built.agent;
    cleanup = built.cleanup;
  });
  afterAll(async () => cleanup());

  it("evaluate returns [] when status is HT", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ status: "HT", minute: 45 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("proposes YellowCardCountOver AWAY >1 at minute 25 (slot 1)", async () => {
    const awayYellows = 1;
    const snapshot = snap({
      minute: 25,
      statistics: {
        ...snap().statistics,
        away: { ...snap().statistics.away, yellowCards: awayYellows },
      },
    });
    const r = await agent.evaluate({
      snapshot,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(yellowCardCountOver.id);
    const params = r[0]!.templateParams as YellowCardCountOverParams;
    expect(params.targetTeam).toBe("AWAY");
    expect(params.thresholdCount).toBe(1);
    expect(params.openedAtYellowCount).toBe(awayYellows);
  });

  it("proposes FoulsCountOver AWAY >4 at minute 55 (slot 2)", async () => {
    const awayFouls = 5;
    const snapshot = snap({
      minute: 55,
      status: "2H",
      statistics: {
        ...snap().statistics,
        away: { ...snap().statistics.away, fouls: awayFouls },
      },
    });
    const r = await agent.evaluate({
      snapshot,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(foulsCountOver.id);
    const params = r[0]!.templateParams as FoulsCountOverParams;
    expect(params.targetTeam).toBe("AWAY");
    expect(params.openedAtFoulsCount).toBe(awayFouls);
  });

  it("buildRevealedParams round-trips a slot-1 YellowCard proposal", async () => {
    const proposals = await agent.evaluate({
      snapshot: snap({ minute: 25 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    const encoded = await agent.buildRevealedParams({ proposal: proposals[0]! });
    const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
    expect(parsed.templateId).toBe(proposals[0]!.templateId);
    expect(parsed.decodedParams).toEqual(proposals[0]!.templateParams);
  });
});
