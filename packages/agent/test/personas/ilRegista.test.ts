import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mnemonicToAccount } from "viem/accounts";
import type { PublicClient, WalletClient } from "viem";
import pino from "pino";

import { IlRegista } from "../../src/personas/IlRegista.js";
import { AgentDatabase } from "../../src/core/persistence/AgentDatabase.js";
import { emptyTeamStatistic, type MatchSnapshot, type Team } from "../../src/matches/types.js";
import {
  cleanSheetRemaining,
  parseRevealedParams,
  possessionOverPct,
  templateRegistry,
  type CleanSheetRemainingParams,
  type PossessionOverPctParams,
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

describe("IlRegista", () => {
  let agent: IlRegista;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const t = createTestDb();
    cleanup = t.cleanup;
    const db = new AgentDatabase(t.prisma, silentLogger);
    const account = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: 0 });
    agent = new IlRegista({
      identity: { index: 0, name: "Il Regista", address: account.address },
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

  it("evaluate returns [] when status is NS", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ status: "NS", minute: 0 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("evaluate returns [] at half-time (HT)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ status: "HT", minute: 45 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("evaluate returns [] when minute < slot-1 lower bound", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 3 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toEqual([]);
  });

  it("evaluate proposes one CleanSheet at minute 10 when tied (defaults to HOME)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 10, score: { homeGoals: 0, awayGoals: 0 } }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(cleanSheetRemaining.id);
    const params = r[0]!.templateParams as CleanSheetRemainingParams;
    expect(params.targetTeam).toBe("HOME");
    expect(params.openedAtMinute).toBe(10);
    expect(params.windowMinutes).toBe(30);
  });

  it("CleanSheet target follows the LEADING side when score is uneven", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 12, score: { homeGoals: 0, awayGoals: 1 } }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    const params = r[0]!.templateParams as CleanSheetRemainingParams;
    expect(params.targetTeam).toBe("AWAY");
  });

  it("evaluate returns [] for slot-1 window when one market already opened", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 10 }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    // marketsAlreadyOpened=1 disqualifies slot-1 (requires ==0), and slot-2 window not reached
    expect(r).toEqual([]);
  });

  it("evaluate proposes Possession at minute 65 when slot-1 already opened (count==1)", async () => {
    const r = await agent.evaluate({
      snapshot: snap({ minute: 65, status: "2H" }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 1,
    });
    expect(r).toHaveLength(1);
    expect(r[0]!.templateId).toBe(possessionOverPct.id);
    const params = r[0]!.templateParams as PossessionOverPctParams;
    expect(params.targetTeam).toBe("HOME");
    expect(params.thresholdPct).toBe(55);
    expect(params.windowMinutes).toBe(10);
    expect(params.openedAtMinute).toBe(65);
  });

  it("buildRevealedParams produces decodable bytes that round-trip to original params", async () => {
    const proposals = await agent.evaluate({
      snapshot: snap({ minute: 10, score: { homeGoals: 1, awayGoals: 0 } }),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    const proposal = proposals[0]!;
    const encoded = await agent.buildRevealedParams({ proposal });
    const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
    expect(parsed.templateId).toBe(proposal.templateId);
    expect(parsed.decodedParams).toEqual(proposal.templateParams);
  });
});
