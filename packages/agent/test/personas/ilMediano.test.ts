import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mnemonicToAccount } from "viem/accounts";
import type { PublicClient, WalletClient } from "viem";
import pino from "pino";

import { IlMediano } from "../../src/personas/IlMediano.js";
import { AgentDatabase } from "../../src/core/persistence/AgentDatabase.js";
import { emptyTeamStatistic, type MatchSnapshot, type Team } from "../../src/matches/types.js";
import {
  foulsCountOver,
  parseRevealedParams,
  templateRegistry,
  yellowCardCountOver,
  type FoulsCountOverParams,
  type YellowCardCountOverParams,
} from "../../src/propositions/index.js";
import { createTestDb } from "../core/_helpers.js";

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";
const silentLogger = pino({ level: "silent" });
const HOME: Team = { id: 100, name: "H" };
const AWAY: Team = { id: 200, name: "A" };

function snap(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
  return {
    fixtureId: 1,
    fetchedAt: 1_700_000_000_000,
    status: "1H",
    minute: 0,
    stoppage: null,
    homeTeam: HOME,
    awayTeam: AWAY,
    score: { homeGoals: 0, awayGoals: 0 },
    scoreBreakdown: { halftime: null, fulltime: null, extratime: null, penalty: null },
    events: [],
    statistics: { home: emptyTeamStatistic(HOME), away: emptyTeamStatistic(AWAY) },
    ...overrides,
  };
}

describe("IlMediano", () => {
  let agent: IlMediano;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const t = createTestDb();
    cleanup = t.cleanup;
    const db = new AgentDatabase(t.prisma, silentLogger);
    const account = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: 2 });
    agent = new IlMediano({
      identity: { index: 2, name: "Il Mediano", address: account.address },
      walletClient: { account, chain: null } as unknown as WalletClient,
      publicClient: {} as PublicClient,
      factoryAddress: "0x000000000000000000000000000000000000f4cf",
      resolverAddress: "0x00000000000000000000000000000000be501ed1",
      db,
      parentLogger: silentLogger,
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  it("returns [] when status NS or HT", async () => {
    const ns = await agent.evaluate({
      snapshot: snap({ status: "NS" }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(ns).toEqual([]);
    const ht = await agent.evaluate({
      snapshot: snap({ status: "HT", minute: 45 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(ht).toEqual([]);
  });

  it("slot 1: FoulsCountOver TOTAL >5 at minute 15 with summed baseline", async () => {
    const s = snap({ minute: 15 });
    s.statistics.home.fouls = 2;
    s.statistics.away.fouls = 3;
    const r = await agent.evaluate({
      snapshot: s,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(foulsCountOver.id);
    const p = r[0]!.templateParams as FoulsCountOverParams;
    expect(p.targetTeam).toBe("TOTAL");
    expect(p.thresholdCount).toBe(5);
    expect(p.windowMinutes).toBe(20);
    expect(p.openedAtFoulsCount).toBe(5);
  });

  it("slot 2: YellowCardCountOver TOTAL >1 at minute 35", async () => {
    const s = snap({ minute: 35 });
    s.statistics.home.yellowCards = 1;
    s.statistics.away.yellowCards = 2;
    const r = await agent.evaluate({
      snapshot: s,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(yellowCardCountOver.id);
    const p = r[0]!.templateParams as YellowCardCountOverParams;
    expect(p.targetTeam).toBe("TOTAL");
    expect(p.thresholdCount).toBe(1);
    expect(p.windowMinutes).toBe(30);
    expect(p.openedAtYellowCount).toBe(3);
  });

  it("slot 3: FoulsCountOver TOTAL >6 at minute 55", async () => {
    const s = snap({ minute: 55, status: "2H" });
    s.statistics.home.fouls = 9;
    s.statistics.away.fouls = 6;
    const r = await agent.evaluate({
      snapshot: s,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 2,
    });
    expect(r).toHaveLength(1);
    const p = r[0]!.templateParams as FoulsCountOverParams;
    expect(p.thresholdCount).toBe(6);
    expect(p.openedAtFoulsCount).toBe(15);
  });

  it("slot 4: YellowCardCountOver TOTAL >2 at minute 75", async () => {
    const s = snap({ minute: 75, status: "2H" });
    s.statistics.home.yellowCards = 3;
    s.statistics.away.yellowCards = 2;
    const r = await agent.evaluate({
      snapshot: s,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 3,
    });
    expect(r).toHaveLength(1);
    const p = r[0]!.templateParams as YellowCardCountOverParams;
    expect(p.thresholdCount).toBe(2);
    expect(p.windowMinutes).toBe(15);
    expect(p.openedAtYellowCount).toBe(5);
  });

  it("buildRevealedParams round-trips for yellowCard + fouls templates", async () => {
    const fixtures = [
      { minute: 15, opened: 0 },
      { minute: 35, opened: 1 },
    ] as const;
    for (const f of fixtures) {
      const s = snap({ minute: f.minute });
      s.statistics.home.fouls = 2;
      s.statistics.away.fouls = 3;
      s.statistics.home.yellowCards = 1;
      s.statistics.away.yellowCards = 2;
      const [p] = await agent.evaluate({
        snapshot: s,
        recentDeltas: [],
        marketsAlreadyOpenedThisMatch: f.opened,
      });
      const encoded = await agent.buildRevealedParams({ proposal: p! });
      const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
      expect(parsed.templateId).toBe(p!.templateId);
      expect(parsed.decodedParams).toEqual(p!.templateParams);
    }
  });

  it("baselines correctly captured from snapshot.statistics", async () => {
    // Slot 1 baseline check with non-trivial fouls
    const s = snap({ minute: 18 });
    s.statistics.home.fouls = 7;
    s.statistics.away.fouls = 4;
    const [p] = await agent.evaluate({
      snapshot: s,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    const params = p!.templateParams as FoulsCountOverParams;
    expect(params.openedAtFoulsCount).toBe(11);
    expect(params.openedAtMinute).toBe(18);
  });
});
