import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mnemonicToAccount } from "viem/accounts";
import type { PublicClient, WalletClient } from "viem";

import { StubPersona } from "../../src/core/StubPersona.js";
import { AgentDatabase } from "../../src/core/persistence/AgentDatabase.js";
import { emptyTeamStatistic, type MatchSnapshot } from "../../src/matches/types.js";
import { createTestDb, silentLogger } from "./_helpers.js";

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";

const TEAM_HOME = { id: 100, name: "H" };
const TEAM_AWAY = { id: 200, name: "A" };

function snap(minute: number): MatchSnapshot {
  return {
    fixtureId: 1,
    fetchedAt: Date.now(),
    status: "1H",
    minute,
    stoppage: null,
    homeTeam: TEAM_HOME,
    awayTeam: TEAM_AWAY,
    score: { homeGoals: 0, awayGoals: 0 },
    scoreBreakdown: { halftime: null, fulltime: null, extratime: null, penalty: null },
    events: [],
    statistics: { home: emptyTeamStatistic(TEAM_HOME), away: emptyTeamStatistic(TEAM_AWAY) },
  };
}

describe("StubPersona / BaseAgent", () => {
  let agent: StubPersona;
  let cleanup: () => Promise<void>;

  beforeAll(() => {
    const t = createTestDb();
    cleanup = t.cleanup;
    const db = new AgentDatabase(t.prisma, silentLogger);
    const account = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: 0 });
    agent = new StubPersona({
      identity: { index: 0, name: "Il Regista", address: account.address },
      walletClient: { account, chain: null } as unknown as WalletClient,
      publicClient: {} as PublicClient,
      factoryAddress: "0x0000000000000000000000000000000000000f4c",
      resolverAddress: "0x0000000000000000000000000000000000000be5",
      db,
      parentLogger: silentLogger,
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  it("evaluate() returns []", async () => {
    const out = await agent.evaluate({
      snapshot: snap(15),
      recentDeltas: [],
      marketsAlreadyOpenedThisMatch: 0,
    });
    expect(out).toEqual([]);
  });

  it("isInWindow returns true within [minMinute, maxMinute]", () => {
    expect(agent.isInWindow(snap(45))).toBe(true);
  });

  it("isInWindow returns false outside the window", () => {
    // StubPersona window is 0..90; minute 91 is out.
    expect(agent.isInWindow(snap(91))).toBe(false);
  });
});
