import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mnemonicToAccount } from "viem/accounts";
import type { PublicClient, WalletClient } from "viem";
import pino from "pino";

import { IlTrequartista } from "../../src/personas/IlTrequartista.js";
import { AgentDatabase } from "../../src/core/persistence/AgentDatabase.js";
import { emptyTeamStatistic, type MatchSnapshot, type Team } from "../../src/matches/types.js";
import {
  cornerCountOver,
  nextGoalHomeAway,
  parseRevealedParams,
  shotsOnTargetOver,
  templateRegistry,
  type CornerCountOverParams,
  type NextGoalHomeAwayParams,
  type ShotsOnTargetOverParams,
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

describe("IlTrequartista", () => {
  let agent: IlTrequartista;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const t = createTestDb();
    cleanup = t.cleanup;
    const db = new AgentDatabase(t.prisma, silentLogger);
    const account = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: 1 });
    agent = new IlTrequartista({
      identity: { index: 1, name: "Il Trequartista", address: account.address },
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

  it("returns [] when status NS", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ status: "NS", minute: 0 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("returns [] at HT", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ status: "HT", minute: 45 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("slot 1: returns NextGoalHomeAway at minute 10", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 10 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(nextGoalHomeAway.id);
    const p = r[0]!.templateParams as NextGoalHomeAwayParams;
    expect(p).toEqual({ windowMinutes: 30, openedAtMinute: 10 });
  });

  it("slot 1 skipped when marketsAlreadyOpened >= 1", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 10 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toEqual([]);
  });

  it("slot 2: ShotsOnTarget HOME at minute 30 with correct baseline", async () => {
    const s = snap({ minute: 30 });
    s.statistics.home.shotsOnGoal = 4;
    const r = await agent.evaluate({
      snapshot: s,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(shotsOnTargetOver.id);
    const p = r[0]!.templateParams as ShotsOnTargetOverParams;
    expect(p.targetTeam).toBe("HOME");
    expect(p.openedAtShotsCount).toBe(4);
    expect(p.windowMinutes).toBe(10);
    expect(p.thresholdCount).toBe(2);
  });

  it("slot 3: ShotsOnTarget AWAY at minute 55", async () => {
    const s = snap({ minute: 55, status: "2H" });
    s.statistics.away.shotsOnGoal = 3;
    const r = await agent.evaluate({
      snapshot: s,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 2,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(shotsOnTargetOver.id);
    const p = r[0]!.templateParams as ShotsOnTargetOverParams;
    expect(p.targetTeam).toBe("AWAY");
    expect(p.openedAtShotsCount).toBe(3);
    expect(p.windowMinutes).toBe(15);
  });

  it("slot 4: CornerCount TOTAL at minute 75 with summed baseline", async () => {
    const s = snap({ minute: 75, status: "2H" });
    s.statistics.home.cornerKicks = 5;
    s.statistics.away.cornerKicks = 3;
    const r = await agent.evaluate({
      snapshot: s,
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 3,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(cornerCountOver.id);
    const p = r[0]!.templateParams as CornerCountOverParams;
    expect(p.targetTeam).toBe("TOTAL");
    expect(p.openedAtCornerCount).toBe(8);
    expect(p.windowMinutes).toBe(10);
    expect(p.thresholdCount).toBe(2);
  });

  it("returns [] at minute 85 (no slot window fits)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 85, status: "2H" }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 3,
    });
    expect(r).toEqual([]);
  });

  it("buildRevealedParams round-trips for all 4 template types this persona uses", async () => {
    const fixtures: Array<{ minute: number; opened: number; status?: MatchSnapshot["status"] }> = [
      { minute: 10, opened: 0 },
      { minute: 30, opened: 1 },
      { minute: 55, opened: 2, status: "2H" },
      { minute: 75, opened: 3, status: "2H" },
    ];
    for (const f of fixtures) {
      const s = snap({ minute: f.minute, ...(f.status ? { status: f.status } : {}) });
      s.statistics.home.shotsOnGoal = 4;
      s.statistics.away.shotsOnGoal = 3;
      s.statistics.home.cornerKicks = 5;
      s.statistics.away.cornerKicks = 3;
      const proposals = await agent.evaluate({
        snapshot: s,
        recentDeltas: [],
        marketsAlreadyOpenedThisMatch: f.opened,
      });
      expect(proposals).toHaveLength(1);
      const encoded = await agent.buildRevealedParams({ proposal: proposals[0]! });
      const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
      expect(parsed.templateId).toBe(proposals[0]!.templateId);
      expect(parsed.decodedParams).toEqual(proposals[0]!.templateParams);
    }
  });

  it("slot windows don't overlap — minute 12 with count=1 returns [] (not slot 2)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 12 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toEqual([]);
  });
});
