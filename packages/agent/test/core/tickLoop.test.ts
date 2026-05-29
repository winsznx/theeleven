import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mnemonicToAccount } from "viem/accounts";
import type { Hex, PublicClient, WalletClient } from "viem";
import type { PrismaClient } from "@prisma/client";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../../src/core/BaseAgent.js";
import { TickLoop, type PollerLike } from "../../src/core/TickLoop.js";
import { AgentDatabase } from "../../src/core/persistence/AgentDatabase.js";
import { emptyTeamStatistic, type MatchSnapshot, type TickEvent } from "../../src/matches/types.js";
import { createTestDb, silentLogger } from "./_helpers.js";

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";
const TEAM_HOME = { id: 100, name: "H" };
const TEAM_AWAY = { id: 200, name: "A" };

function snap(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
  return {
    fixtureId: 1,
    fetchedAt: Date.now(),
    status: "1H",
    minute: 15,
    stoppage: null,
    homeTeam: TEAM_HOME,
    awayTeam: TEAM_AWAY,
    score: { homeGoals: 0, awayGoals: 0 },
    scoreBreakdown: { halftime: null, fulltime: null, extratime: null, penalty: null },
    events: [],
    statistics: { home: emptyTeamStatistic(TEAM_HOME), away: emptyTeamStatistic(TEAM_AWAY) },
    ...overrides,
  };
}

class TestPersona extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 0,
    name: "Il Regista",
    minMinute: 0,
    maxMinute: 90,
    maxMarketsPerMatch: 3,
    defaultMarketWindowMs: 300_000,
    defaultResolveWindowMs: 900_000,
  };
  proposals: ProposedMarket[] = [];
  async evaluate(): Promise<ProposedMarket[]> {
    return this.proposals;
  }
  async buildRevealedParams(): Promise<Hex> {
    return "0xfeedface";
  }
}

class MockPoller implements PollerLike {
  started = false;
  stopped = false;
  private tickHandlers = new Set<(e: TickEvent) => void>();
  private errorHandlers = new Set<(e: Error) => void>();
  onTick(h: (e: TickEvent) => void) {
    this.tickHandlers.add(h);
    return () => this.tickHandlers.delete(h);
  }
  onError(h: (e: Error) => void) {
    this.errorHandlers.add(h);
    return () => this.errorHandlers.delete(h);
  }
  start(): void { this.started = true; }
  async stop(): Promise<void> { this.stopped = true; }
  emitTick(e: TickEvent) {
    for (const h of this.tickHandlers) h(e);
  }
  emitError(e: Error) {
    for (const h of this.errorHandlers) h(e);
  }
}

function buildAgent(db: AgentDatabase): TestPersona {
  const account = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: 0 });
  return new TestPersona({
    identity: { index: 0, name: "Il Regista", address: account.address },
    walletClient: { account, chain: null } as unknown as WalletClient,
    publicClient: {} as PublicClient,
    factoryAddress: "0x000000000000000000000000000000000000f4cf",
    resolverAddress: "0x00000000000000000000000000000000be501ed1",
    db,
    parentLogger: silentLogger,
  });
}

function fakeCreateMarketSkill(out: {
  marketId: Hex; hookAddress: `0x${string}`; commitHash: Hex; revealSalt: Hex; create2Salt: Hex; txHash: Hex; blockNumber: bigint; gasUsed: bigint;
}) {
  return vi.fn().mockResolvedValue({
    txHash: out.txHash,
    hookAddress: out.hookAddress,
    marketId: out.marketId,
    poolId: ("0x" + "ff".repeat(32)) as Hex,
    commitHash: out.commitHash,
    revealSalt: out.revealSalt,
    create2Salt: out.create2Salt,
    blockNumber: out.blockNumber,
    gasUsed: out.gasUsed,
  });
}

describe("TickLoop", () => {
  let prisma: PrismaClient;
  let cleanup: () => Promise<void>;
  let db: AgentDatabase;
  let poller: MockPoller;
  let agent: TestPersona;

  beforeEach(async () => {
    const t = createTestDb();
    prisma = t.prisma;
    cleanup = t.cleanup;
    db = new AgentDatabase(prisma, silentLogger);
    poller = new MockPoller();
    agent = buildAgent(db);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("start() persists a MatchSession", async () => {
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: vi.fn(), revealMarketSkill: vi.fn(),
      logger: silentLogger,
    });
    await loop.start(1145546);
    const s = await prisma.matchSession.findUnique({ where: { fixtureId: 1145546 } });
    expect(s).not.toBeNull();
    expect(poller.started).toBe(true);
    await loop.stop();
  });

  it("handleSnapshot skips createMarket when persona returns []", async () => {
    const create = vi.fn();
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: create, revealMarketSkill: vi.fn(),
      logger: silentLogger,
    });
    await loop.start(1145546);
    poller.emitTick({ snapshot: snap(), deltas: [] });
    await new Promise((r) => setTimeout(r, 10));
    expect(create).not.toHaveBeenCalled();
    await loop.stop();
  });

  it("handleSnapshot calls createMarketSkill when persona returns a proposal + persists market", async () => {
    const out = {
      marketId: ("0x" + "ab".repeat(32)) as Hex,
      hookAddress: "0x000000000000000000000000000000000000aa80" as `0x${string}`,
      commitHash: ("0x" + "cc".repeat(32)) as Hex,
      revealSalt: ("0x" + "11".repeat(32)) as Hex,
      create2Salt: ("0x" + "22".repeat(32)) as Hex,
      txHash: ("0x" + "33".repeat(32)) as Hex,
      blockNumber: 4242n,
      gasUsed: 450_000n,
    };
    agent.proposals = [
      {
        templateId: ("0x" + "dd".repeat(32)) as Hex,
        templateParams: { foo: "bar" },
        marketDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        resolveDeadline: BigInt(Math.floor(Date.now() / 1000) + 7200),
        rationale: "test proposal",
      },
    ];
    const create = fakeCreateMarketSkill(out);
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: create, revealMarketSkill: vi.fn(),
      logger: silentLogger,
    });
    await loop.start(1145546);
    poller.emitTick({ snapshot: snap(), deltas: [] });
    await new Promise((r) => setTimeout(r, 20));
    expect(create).toHaveBeenCalledOnce();
    const persisted = await db.getMarketByHook(out.hookAddress);
    expect(persisted?.id).toBe(out.marketId);
    expect(persisted?.revealSalt).toBe(out.revealSalt);
    await loop.stop();
  });

  it("REVEAL fires after REVEAL_WINDOW + buffer via injected scheduler", async () => {
    const out = {
      marketId: ("0x" + "ab".repeat(32)) as Hex,
      hookAddress: "0x000000000000000000000000000000000000aa80" as `0x${string}`,
      commitHash: ("0x" + "cc".repeat(32)) as Hex,
      revealSalt: ("0x" + "11".repeat(32)) as Hex,
      create2Salt: ("0x" + "22".repeat(32)) as Hex,
      txHash: ("0x" + "33".repeat(32)) as Hex,
      blockNumber: 4242n,
      gasUsed: 450_000n,
    };
    agent.proposals = [
      {
        templateId: ("0x" + "dd".repeat(32)) as Hex,
        templateParams: {},
        marketDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        resolveDeadline: BigInt(Math.floor(Date.now() / 1000) + 7200),
        rationale: "test",
      },
    ];
    const create = fakeCreateMarketSkill(out);
    const reveal = vi.fn().mockResolvedValue({
      txHash: ("0x" + "44".repeat(32)) as Hex,
      blockNumber: 4243n,
      gasUsed: 80_000n,
    });

    const scheduled: Array<{ cb: () => void; delayMs: number }> = [];
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: create, revealMarketSkill: reveal,
      scheduler: {
        schedule(cb, delayMs) {
          const entry = { cb, delayMs };
          scheduled.push(entry);
          return { cancel: () => { const i = scheduled.indexOf(entry); if (i >= 0) scheduled.splice(i, 1); } };
        },
      },
      logger: silentLogger,
    });
    await loop.start(1145546);
    poller.emitTick({ snapshot: snap(), deltas: [] });
    // Wait for handleSnapshot → tryOpenMarket → scheduleReveal to settle.
    await new Promise((r) => setTimeout(r, 30));
    expect(scheduled).toHaveLength(1);
    // Delay = REVEAL_WINDOW (180s) + buffer (5s), minus the DB-insert latency between
    // computing scheduledRevealAt and the scheduleReveal call. Tolerate ≤ 100ms drift.
    expect(scheduled[0]!.delayMs).toBeGreaterThan(184_900);
    expect(scheduled[0]!.delayMs).toBeLessThanOrEqual(185_000);
    // Fire the scheduled reveal synchronously — same effect as real time elapsing.
    scheduled[0]!.cb();
    await new Promise((r) => setTimeout(r, 30));
    expect(reveal).toHaveBeenCalledOnce();
    await loop.stop();
  });

  it("reveal failure → market.status=FAILED + REVEAL_FAILED activity", async () => {
    const out = {
      marketId: ("0x" + "ab".repeat(32)) as Hex,
      hookAddress: "0x000000000000000000000000000000000000aa80" as `0x${string}`,
      commitHash: ("0x" + "cc".repeat(32)) as Hex,
      revealSalt: ("0x" + "11".repeat(32)) as Hex,
      create2Salt: ("0x" + "22".repeat(32)) as Hex,
      txHash: ("0x" + "33".repeat(32)) as Hex,
      blockNumber: 4242n,
      gasUsed: 450_000n,
    };
    agent.proposals = [
      {
        templateId: ("0x" + "dd".repeat(32)) as Hex,
        templateParams: {},
        marketDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        resolveDeadline: BigInt(Math.floor(Date.now() / 1000) + 7200),
        rationale: "test",
      },
    ];
    const create = fakeCreateMarketSkill(out);
    const reveal = vi.fn().mockRejectedValue(new Error("CommitMismatch"));

    // Insert a market directly with scheduledRevealAt in the past, so reveal fires immediately.
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: create, revealMarketSkill: reveal,
      logger: silentLogger,
    });
    await db.insertMarket({
      id: out.marketId,
      hookAddress: out.hookAddress,
      agentIndex: 0,
      agentName: "Il Regista",
      fixtureId: 1145546,
      matchId: ("0x" + "00".repeat(32)) as Hex,
      propositionId: ("0x" + "dd".repeat(32)) as Hex,
      revealedParams: "0xfeedface",
      revealSalt: out.revealSalt,
      create2Salt: out.create2Salt,
      commitHash: out.commitHash,
      marketDeadline: 1_701_000_000n,
      resolveDeadline: 1_702_000_000n,
      createdAtBlock: out.blockNumber,
      createdTxHash: out.txHash,
      scheduledRevealAt: new Date(Date.now() - 1000),
    });
    await loop.start(1145546);
    await new Promise((r) => setTimeout(r, 30));
    const m = await db.getMarketById(out.marketId);
    expect(m?.status).toBe("FAILED");
    expect(m?.revealError).toContain("CommitMismatch");
    const acts = await prisma.agentActivity.findMany({ where: { eventType: "REVEAL_FAILED" } });
    expect(acts).toHaveLength(1);
    await loop.stop();
  });

  it("warm restart: pending reveals from DB fire on start", async () => {
    const reveal = vi.fn().mockResolvedValue({
      txHash: ("0x" + "44".repeat(32)) as Hex,
      blockNumber: 1n,
      gasUsed: 1n,
    });
    await db.insertMarket({
      id: ("0x" + "ee".repeat(32)) as Hex,
      hookAddress: "0x000000000000000000000000000000000000bb80" as `0x${string}`,
      agentIndex: 0,
      agentName: "Il Regista",
      fixtureId: 1145546,
      matchId: ("0x" + "00".repeat(32)) as Hex,
      propositionId: ("0x" + "11".repeat(32)) as Hex,
      revealedParams: "0xfeed",
      revealSalt: ("0x" + "22".repeat(32)) as Hex,
      create2Salt: ("0x" + "33".repeat(32)) as Hex,
      commitHash: ("0x" + "44".repeat(32)) as Hex,
      marketDeadline: 1_701_000_000n,
      resolveDeadline: 1_702_000_000n,
      createdAtBlock: 1n,
      createdTxHash: ("0x" + "55".repeat(32)) as Hex,
      scheduledRevealAt: new Date(Date.now() - 60_000),
    });
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: vi.fn(), revealMarketSkill: reveal,
      logger: silentLogger,
    });
    await loop.start(1145546);
    await new Promise((r) => setTimeout(r, 30));
    expect(reveal).toHaveBeenCalledOnce();
    await loop.stop();
  });

  it("maxMarketsPerMatch ceiling — skip when count >= max", async () => {
    agent.proposals = [
      {
        templateId: ("0x" + "dd".repeat(32)) as Hex,
        templateParams: {},
        marketDeadline: 1_701_000_000n,
        resolveDeadline: 1_702_000_000n,
        rationale: "p1",
      },
    ];
    // Pre-populate 3 existing markets for this agent + fixture → at ceiling.
    for (let i = 0; i < 3; i++) {
      await db.insertMarket({
        id: ("0x" + i.toString().padStart(64, "0")) as Hex,
        hookAddress: ("0x" + i.toString().padStart(40, "0")) as `0x${string}`,
        agentIndex: 0,
        agentName: "Il Regista",
        fixtureId: 1145546,
        matchId: ("0x" + "00".repeat(32)) as Hex,
        propositionId: ("0x" + "11".repeat(32)) as Hex,
        revealedParams: "0x",
        revealSalt: ("0x" + "22".repeat(32)) as Hex,
        create2Salt: ("0x" + "33".repeat(32)) as Hex,
        commitHash: ("0x" + "44".repeat(32)) as Hex,
        marketDeadline: 1_701_000_000n,
        resolveDeadline: 1_702_000_000n,
        createdAtBlock: 1n,
        createdTxHash: ("0x" + "55".repeat(32)) as Hex,
        scheduledRevealAt: new Date(Date.now() + 60_000),
      });
    }
    const create = vi.fn();
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: create, revealMarketSkill: vi.fn(),
      logger: silentLogger,
    });
    await loop.start(1145546);
    poller.emitTick({ snapshot: snap(), deltas: [] });
    await new Promise((r) => setTimeout(r, 20));
    expect(create).not.toHaveBeenCalled();
    await loop.stop();
  });

  it("stop() cancels pending reveal timers + ends session", async () => {
    await db.insertMarket({
      id: ("0x" + "ee".repeat(32)) as Hex,
      hookAddress: "0x000000000000000000000000000000000000bb80" as `0x${string}`,
      agentIndex: 0,
      agentName: "Il Regista",
      fixtureId: 1145546,
      matchId: ("0x" + "00".repeat(32)) as Hex,
      propositionId: ("0x" + "11".repeat(32)) as Hex,
      revealedParams: "0xfeed",
      revealSalt: ("0x" + "22".repeat(32)) as Hex,
      create2Salt: ("0x" + "33".repeat(32)) as Hex,
      commitHash: ("0x" + "44".repeat(32)) as Hex,
      marketDeadline: 1_701_000_000n,
      resolveDeadline: 1_702_000_000n,
      createdAtBlock: 1n,
      createdTxHash: ("0x" + "55".repeat(32)) as Hex,
      scheduledRevealAt: new Date(Date.now() + 600_000), // far future
    });
    const reveal = vi.fn();
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: vi.fn(), revealMarketSkill: reveal,
      logger: silentLogger,
    });
    await loop.start(1145546);
    await loop.stop();
    expect(poller.stopped).toBe(true);
    const s = await prisma.matchSession.findUnique({ where: { fixtureId: 1145546 } });
    expect(s?.endedAt).not.toBeNull();
    // Even after stop, the future timer must not fire.
    await new Promise((r) => setTimeout(r, 50));
    expect(reveal).not.toHaveBeenCalled();
  });

  it("onError handler forwards poller errors into ERROR activity rows", async () => {
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: vi.fn(), revealMarketSkill: vi.fn(),
      logger: silentLogger,
    });
    await loop.start(1145546);
    poller.emitError(new Error("boom"));
    await new Promise((r) => setTimeout(r, 20));
    const errs = await prisma.agentActivity.findMany({ where: { eventType: "ERROR" } });
    expect(errs).toHaveLength(1);
    expect(errs[0]!.metadata).toContain("boom");
    await loop.stop();
  });

  it("revealMarketSkill called with revealedParams + revealSalt from DB", async () => {
    const reveal = vi.fn().mockResolvedValue({
      txHash: ("0x" + "44".repeat(32)) as Hex,
      blockNumber: 1n,
      gasUsed: 1n,
    });
    await db.insertMarket({
      id: ("0x" + "ee".repeat(32)) as Hex,
      hookAddress: "0x000000000000000000000000000000000000bb80" as `0x${string}`,
      agentIndex: 0,
      agentName: "Il Regista",
      fixtureId: 1145546,
      matchId: ("0x" + "00".repeat(32)) as Hex,
      propositionId: ("0x" + "11".repeat(32)) as Hex,
      revealedParams: "0xdeadbeefcafebabe",
      revealSalt: ("0x" + "ab".repeat(32)) as Hex,
      create2Salt: ("0x" + "33".repeat(32)) as Hex,
      commitHash: ("0x" + "44".repeat(32)) as Hex,
      marketDeadline: 1_701_000_000n,
      resolveDeadline: 1_702_000_000n,
      createdAtBlock: 1n,
      createdTxHash: ("0x" + "55".repeat(32)) as Hex,
      scheduledRevealAt: new Date(Date.now() - 1000),
    });
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: vi.fn(), revealMarketSkill: reveal,
      logger: silentLogger,
    });
    await loop.start(1145546);
    await new Promise((r) => setTimeout(r, 30));
    expect(reveal).toHaveBeenCalledWith(expect.objectContaining({
      revealedParams: "0xdeadbeefcafebabe",
      revealSalt: "0x" + "ab".repeat(32),
    }));
    await loop.stop();
  });

  it("TICK activity row logged on every snapshot", async () => {
    const loop = new TickLoop({
      agent, matchPoller: poller, db,
      createMarketSkill: vi.fn(), revealMarketSkill: vi.fn(),
      logger: silentLogger,
    });
    await loop.start(1145546);
    poller.emitTick({ snapshot: snap({ minute: 5 }), deltas: [] });
    poller.emitTick({ snapshot: snap({ minute: 6 }), deltas: [] });
    await new Promise((r) => setTimeout(r, 30));
    const ticks = await prisma.agentActivity.findMany({ where: { eventType: "TICK" } });
    expect(ticks).toHaveLength(2);
    await loop.stop();
  });
});
