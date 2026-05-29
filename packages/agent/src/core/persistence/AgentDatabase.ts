/**
 * Typed wrapper around PrismaClient. BigInt fields (marketDeadline,
 * resolveDeadline, createdAtBlock) are stored as BigInt natively in SQLite;
 * the only special handling is JSON serialization of AgentActivity.metadata,
 * which uses a custom replacer to coerce bigint→string before JSON.stringify.
 */
import type { Market, PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import type { Address } from "viem";

import type { AgentIndex } from "../../types/agent.js";
import type { ActivityEntry, NewMarket } from "./types.js";

export type MarketRow = Market;

const bigIntReplacer = (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value;

export class AgentDatabase {
  constructor(
    private readonly client: PrismaClient,
    private readonly logger: Logger
  ) {}

  // ---- Markets ----
  async insertMarket(args: NewMarket): Promise<MarketRow> {
    const row = await this.client.market.create({
      data: {
        id: args.id,
        hookAddress: args.hookAddress,
        agentIndex: args.agentIndex,
        agentName: args.agentName,
        fixtureId: args.fixtureId,
        matchId: args.matchId,
        propositionId: args.propositionId,
        revealedParams: args.revealedParams,
        revealSalt: args.revealSalt,
        create2Salt: args.create2Salt,
        commitHash: args.commitHash,
        marketDeadline: args.marketDeadline,
        resolveDeadline: args.resolveDeadline,
        status: "COMMITTED",
        createdAtBlock: args.createdAtBlock,
        createdTxHash: args.createdTxHash,
        scheduledRevealAt: args.scheduledRevealAt,
      },
    });
    this.logger.debug({ marketId: args.id, hook: args.hookAddress }, "agent-db: market inserted");
    return row;
  }

  async updateMarketRevealed(marketId: string, txHash: `0x${string}`, revealedAt: Date): Promise<void> {
    await this.client.market.update({
      where: { id: marketId },
      data: {
        status: "REVEALED",
        revealedAt,
        revealAttemptedAt: revealedAt,
        revealTxHash: txHash,
        revealError: null,
      },
    });
  }

  async updateMarketRevealFailed(marketId: string, error: string): Promise<void> {
    await this.client.market.update({
      where: { id: marketId },
      data: {
        status: "FAILED",
        revealAttemptedAt: new Date(),
        revealError: error.slice(0, 500),
      },
    });
  }

  async updateMarketResolved(
    marketId: string,
    outcome: number,
    txHash: `0x${string}`,
    resolvedAt: Date
  ): Promise<void> {
    await this.client.market.update({
      where: { id: marketId },
      data: {
        status: outcome === 3 ? "REFUNDED" : "RESOLVED",
        resolvedAt,
        resolveTxHash: txHash,
        resolvedOutcome: outcome,
      },
    });
  }

  async getMarketsAwaitingReveal(): Promise<MarketRow[]> {
    return this.client.market.findMany({
      where: { status: "COMMITTED", scheduledRevealAt: { lte: new Date() } },
      orderBy: { scheduledRevealAt: "asc" },
    });
  }

  async getMarketById(marketId: string): Promise<MarketRow | null> {
    return this.client.market.findUnique({ where: { id: marketId } });
  }

  async getMarketByHook(hookAddress: Address): Promise<MarketRow | null> {
    return this.client.market.findUnique({ where: { hookAddress } });
  }

  async countAgentMarketsForFixture(agentIndex: AgentIndex, fixtureId: number): Promise<number> {
    return this.client.market.count({ where: { agentIndex, fixtureId } });
  }

  // ---- Activity ----
  async logActivity(args: ActivityEntry): Promise<void> {
    await this.client.agentActivity.create({
      data: {
        agentIndex: args.agentIndex,
        fixtureId: args.fixtureId ?? null,
        eventType: args.eventType,
        marketId: args.marketId ?? null,
        metadata: JSON.stringify(args.metadata, bigIntReplacer),
      },
    });
  }

  // ---- Match sessions ----
  async startMatchSession(fixtureId: number): Promise<void> {
    await this.client.matchSession.upsert({
      where: { fixtureId },
      create: { fixtureId, startedAt: new Date(), endedAt: null, finalStatus: null },
      update: { startedAt: new Date(), endedAt: null, finalStatus: null },
    });
  }

  async endMatchSession(fixtureId: number, finalStatus: string): Promise<void> {
    await this.client.matchSession.update({
      where: { fixtureId },
      data: { endedAt: new Date(), finalStatus },
    });
  }

  async close(): Promise<void> {
    await this.client.$disconnect();
  }
}
