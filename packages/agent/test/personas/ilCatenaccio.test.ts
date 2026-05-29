import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { IlCatenaccio } from "../../src/personas/IlCatenaccio.js";
import {
  cleanSheetRemaining,
  parseRevealedParams,
  templateRegistry,
  yellowCardCountOver,
  type CleanSheetRemainingParams,
  type YellowCardCountOverParams,
} from "../../src/propositions/index.js";

import { buildTestAgent, snap } from "./_personaHelpers.js";

describe("IlCatenaccio", () => {
  let agent: IlCatenaccio;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const built = buildTestAgent({ Persona: IlCatenaccio, index: 9, name: "Il Catenaccio" });
    agent = built.agent;
    cleanup = built.cleanup;
  });
  afterAll(async () => cleanup());

  it("evaluate returns [] when status is FT", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ status: "FT", minute: 90 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("proposes CleanSheetRemaining HOME at minute 20 (slot 1, 25' window)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 20 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(cleanSheetRemaining.id);
    const params = r[0]!.templateParams as CleanSheetRemainingParams;
    expect(params.targetTeam).toBe("HOME");
    expect(params.windowMinutes).toBe(25);
  });

  it("proposes YellowCardCountOver TOTAL >2 at minute 45 with TOTAL baseline (slot 2)", async () => {
    const homeYellows = 1;
    const awayYellows = 2;
    const snapshot = snap({
      minute: 45,
      statistics: {
        home: { ...snap().statistics.home, yellowCards: homeYellows },
        away: { ...snap().statistics.away, yellowCards: awayYellows },
      },
    });
    const r = await agent.evaluate({
      snapshot,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(yellowCardCountOver.id);
    const params = r[0]!.templateParams as YellowCardCountOverParams;
    expect(params.targetTeam).toBe("TOTAL");
    expect(params.openedAtYellowCount).toBe(homeYellows + awayYellows);
  });

  it("buildRevealedParams round-trips a slot-1 CleanSheet proposal", async () => {
    const proposals = await agent.evaluate({
      snapshot: snap({ minute: 20 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    const encoded = await agent.buildRevealedParams({ proposal: proposals[0]! });
    const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
    expect(parsed.templateId).toBe(proposals[0]!.templateId);
    expect(parsed.decodedParams).toEqual(proposals[0]!.templateParams);
  });
});
