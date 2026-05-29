import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { IlLibero } from "../../src/personas/IlLibero.js";
import {
  cleanSheetRemaining,
  cornerCountOver,
  parseRevealedParams,
  templateRegistry,
  type CleanSheetRemainingParams,
  type CornerCountOverParams,
} from "../../src/propositions/index.js";

import { buildTestAgent, snap } from "./_personaHelpers.js";

describe("IlLibero", () => {
  let agent: IlLibero;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const built = buildTestAgent({ Persona: IlLibero, index: 4, name: "Il Libero" });
    agent = built.agent;
    cleanup = built.cleanup;
  });
  afterAll(async () => cleanup());

  it("evaluate returns [] when status is HT", async () => {
    // #given half-time
    // #when evaluate runs
    const r = await agent.evaluate({
      snapshot: snap({ status: "HT", minute: 45 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    // #then nothing is proposed
    expect(r).toEqual([]);
  });

  it("proposes CleanSheetRemaining HOME at minute 10 (slot 1)", async () => {
    // #given a slot-1 minute
    // #when evaluate runs with no prior markets
    const r = await agent.evaluate({
      snapshot: snap({ minute: 10 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    // #then HOME CleanSheet is proposed
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(cleanSheetRemaining.id);
    const params = r[0]!.templateParams as CleanSheetRemainingParams;
    expect(params.targetTeam).toBe("HOME");
    expect(params.windowMinutes).toBe(30);
  });

  it("proposes CornerCountOver AWAY >1 at minute 80 with corner baseline captured", async () => {
    // #given a slot-3 minute with marketsAlreadyOpened=2 and known away corners
    const awayCorners = 3;
    const snapshot = snap({
      minute: 80,
      status: "2H",
      statistics: {
        ...snap().statistics,
        away: { ...snap().statistics.away, cornerKicks: awayCorners },
      },
    });
    // #when evaluate runs
    const r = await agent.evaluate({
      snapshot,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 2,
    });
    // #then a CornerCount proposal targeting AWAY is returned
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(cornerCountOver.id);
    const params = r[0]!.templateParams as CornerCountOverParams;
    expect(params.targetTeam).toBe("AWAY");
    expect(params.openedAtCornerCount).toBe(awayCorners);
  });

  it("buildRevealedParams round-trips a slot-1 CleanSheet proposal", async () => {
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
