import { mnemonicToAccount } from "viem/accounts";
import type { PublicClient, WalletClient } from "viem";
import pino from "pino";

import { AgentDatabase } from "../../src/core/persistence/AgentDatabase.js";
import {
  emptyTeamStatistic,
  type MatchSnapshot,
  type Team,
} from "../../src/matches/types.js";
import type { BaseAgent, BaseAgentArgs } from "../../src/core/BaseAgent.js";
import type { AgentIndex, PersonaName } from "../../src/types/agent.js";
import { createTestDb } from "../core/_helpers.js";

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";
export const silentLogger = pino({ level: "silent" });
export const HOME: Team = { id: 100, name: "H" };
export const AWAY: Team = { id: 200, name: "A" };

export function snap(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
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

/** Construct an agent against a throwaway SQLite db + a deterministic Anvil wallet. */
export function buildTestAgent<A extends BaseAgent>(args: {
  Persona: new (a: BaseAgentArgs) => A;
  index: AgentIndex;
  name: PersonaName;
}): { agent: A; cleanup: () => Promise<void> } {
  const t = createTestDb();
  const db = new AgentDatabase(t.prisma, silentLogger);
  const account = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: args.index });
  const agent = new args.Persona({
    identity: { index: args.index, name: args.name, address: account.address },
    walletClient: { account, chain: null } as unknown as WalletClient,
    publicClient: {} as PublicClient,
    factoryAddress: "0x000000000000000000000000000000000000f4cf",
    resolverAddress: "0x00000000000000000000000000000000be501ed1",
    db,
    parentLogger: silentLogger,
  });
  return { agent, cleanup: t.cleanup };
}
