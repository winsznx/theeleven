import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { AgentDatabase } from "../../src/core/persistence/AgentDatabase.js";
import { createTestDb, silentLogger } from "./_helpers.js";

const NEW_MARKET = {
  id: "0xabc",
  hookAddress: "0x000000000000000000000000000000000000aa80" as `0x${string}`,
  agentIndex: 0 as const,
  agentName: "Il Regista" as const,
  fixtureId: 1145546,
  matchId: "0x000000000000000000000000000000000000000000000000000000000117a8a" as `0x${string}`,
  propositionId: ("0x" + "11".repeat(32)) as `0x${string}`,
  revealedParams: "0xdeadbeef" as `0x${string}`,
  revealSalt: ("0x" + "22".repeat(32)) as `0x${string}`,
  create2Salt: ("0x" + "33".repeat(32)) as `0x${string}`,
  commitHash: ("0x" + "44".repeat(32)) as `0x${string}`,
  marketDeadline: 1_701_000_000n,
  resolveDeadline: 1_702_000_000n,
  createdAtBlock: 4242n,
  createdTxHash: ("0x" + "55".repeat(32)) as `0x${string}`,
  scheduledRevealAt: new Date(Date.UTC(2026, 4, 27, 19, 5, 0)),
};

describe("AgentDatabase", () => {
  let prisma: PrismaClient;
  let cleanup: () => Promise<void>;
  let db: AgentDatabase;

  beforeAll(() => {
    const t = createTestDb();
    prisma = t.prisma;
    cleanup = t.cleanup;
    db = new AgentDatabase(prisma, silentLogger);
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    await prisma.market.deleteMany();
    await prisma.agentActivity.deleteMany();
    await prisma.matchSession.deleteMany();
  });

  it("insertMarket + getMarketByHook round-trips with status=COMMITTED", async () => {
    const row = await db.insertMarket(NEW_MARKET);
    expect(row.status).toBe("COMMITTED");
    const re = await db.getMarketByHook(NEW_MARKET.hookAddress);
    expect(re?.id).toBe(NEW_MARKET.id);
  });

  it("countAgentMarketsForFixture returns correct counts per agent/fixture", async () => {
    await db.insertMarket(NEW_MARKET);
    await db.insertMarket({
      ...NEW_MARKET,
      id: "0xdef",
      hookAddress: "0x000000000000000000000000000000000000ba80" as `0x${string}`,
    });
    const n = await db.countAgentMarketsForFixture(0, 1145546);
    expect(n).toBe(2);
    expect(await db.countAgentMarketsForFixture(0, 999999)).toBe(0);
  });

  it("updateMarketRevealed transitions COMMITTED → REVEALED", async () => {
    await db.insertMarket(NEW_MARKET);
    const txHash = ("0x" + "ee".repeat(32)) as `0x${string}`;
    await db.updateMarketRevealed(NEW_MARKET.id, txHash, new Date());
    const m = await db.getMarketById(NEW_MARKET.id);
    expect(m?.status).toBe("REVEALED");
    expect(m?.revealTxHash).toBe(txHash);
  });

  it("updateMarketRevealFailed sets status=FAILED + error message", async () => {
    await db.insertMarket(NEW_MARKET);
    await db.updateMarketRevealFailed(NEW_MARKET.id, "commit mismatch oh no");
    const m = await db.getMarketById(NEW_MARKET.id);
    expect(m?.status).toBe("FAILED");
    expect(m?.revealError).toContain("commit mismatch");
  });

  it("getMarketsAwaitingReveal filters by status=COMMITTED && scheduledRevealAt <= now", async () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60_000);
    await db.insertMarket({ ...NEW_MARKET, id: "0x1", hookAddress: ("0x" + "01".repeat(20)) as `0x${string}`, scheduledRevealAt: past });
    await db.insertMarket({ ...NEW_MARKET, id: "0x2", hookAddress: ("0x" + "02".repeat(20)) as `0x${string}`, scheduledRevealAt: future });

    const pending = await db.getMarketsAwaitingReveal();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.id).toBe("0x1");
  });

  it("logActivity persists JSON metadata (with bigint coercion)", async () => {
    await db.logActivity({
      agentIndex: 0,
      fixtureId: 1145546,
      eventType: "TICK",
      metadata: { minute: 17, status: "1H", bigVal: 1_234_567_890n },
    });
    const rows = await prisma.agentActivity.findMany();
    expect(rows).toHaveLength(1);
    const parsed = JSON.parse(rows[0]!.metadata);
    expect(parsed.minute).toBe(17);
    expect(parsed.bigVal).toBe("1234567890");
  });

  it("startMatchSession + endMatchSession lifecycle", async () => {
    await db.startMatchSession(42);
    let s = await prisma.matchSession.findUnique({ where: { fixtureId: 42 } });
    expect(s?.endedAt).toBeNull();
    await db.endMatchSession(42, "FT");
    s = await prisma.matchSession.findUnique({ where: { fixtureId: 42 } });
    expect(s?.endedAt).not.toBeNull();
    expect(s?.finalStatus).toBe("FT");
  });

  it("BigInt fields round-trip through SQLite (createdAtBlock, marketDeadline)", async () => {
    const big = 99_999_999_999_999n;
    await db.insertMarket({ ...NEW_MARKET, createdAtBlock: big, marketDeadline: big - 1n });
    const m = await db.getMarketById(NEW_MARKET.id);
    expect(m?.createdAtBlock).toBe(big);
    expect(m?.marketDeadline).toBe(big - 1n);
  });
});
