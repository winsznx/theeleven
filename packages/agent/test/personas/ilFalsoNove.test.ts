import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { IlFalsoNove } from "../../src/personas/IlFalsoNove.js";
import {
  parseRevealedParams,
  possessionOverPct,
  shotsOnTargetOver,
  templateRegistry,
  type ShotsOnTargetOverParams,
} from "../../src/propositions/index.js";

import { buildTestAgent, snap } from "./_personaHelpers.js";

describe("IlFalsoNove", () => {
  let agent: IlFalsoNove;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const built = buildTestAgent({ Persona: IlFalsoNove, index: 3, name: "Il Falso Nove" });
    agent = built.agent;
    cleanup = built.cleanup;
  });
  afterAll(async () => cleanup());

  it("evaluate returns [] when status is NS", async () => {
    // #given a not-started snapshot
    // #when evaluate runs
    const r = await agent.evaluate({
      snapshot: snap({ status: "NS", minute: 0 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    // #then nothing is proposed
    expect(r).toEqual([]);
  });

  it("proposes ShotsOnTargetOver HOME >1 at minute 20 with shots baseline captured", async () => {
    // #given a snapshot inside slot-1 window with a known baseline
    const homeShots = 2;
    const snapshot = snap({
      minute: 20,
      statistics: {
        ...snap().statistics,
        home: { ...snap().statistics.home, shotsOnGoal: homeShots },
      },
    });
    // #when evaluate runs with no prior markets
    const r = await agent.evaluate({
      snapshot,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    // #then a slot-1 ShotsOnTargetOver proposal is returned
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(shotsOnTargetOver.id);
    const params = r[0]!.templateParams as ShotsOnTargetOverParams;
    expect(params.targetTeam).toBe("HOME");
    expect(params.thresholdCount).toBe(1);
    expect(params.windowMinutes).toBe(15);
    expect(params.openedAtShotsCount).toBe(homeShots);
  });

  it("proposes PossessionOverPct HOME >55% at minute 45 when slot-1 already opened", async () => {
    // #given a snapshot inside slot-2 window with marketsAlreadyOpened=1
    // #when evaluate runs
    const r = await agent.evaluate({
      snapshot: snap({ minute: 45 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    // #then a Possession proposal is returned
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(possessionOverPct.id);
  });

  it("buildRevealedParams round-trips a slot-1 proposal back to original params", async () => {
    // #given a slot-1 proposal
    const proposals = await agent.evaluate({
      snapshot: snap({ minute: 20 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    // #when revealed params are encoded then decoded
    const encoded = await agent.buildRevealedParams({ proposal: proposals[0]! });
    const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
    // #then the round-trip preserves templateId + params
    expect(parsed.templateId).toBe(proposals[0]!.templateId);
    expect(parsed.decodedParams).toEqual(proposals[0]!.templateParams);
  });
});
