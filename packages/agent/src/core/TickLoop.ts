import type { Logger } from "pino";
import type { Hex } from "viem";

import { FINAL_STATUSES, type MatchDelta, type MatchSnapshot } from "../matches/types.js";
import type { MatchPoller, TickEvent } from "../matches/MatchPoller.js";
import { createMarketSkill as defaultCreateMarketSkill } from "../skills/createMarket.js";
import { revealMarketSkill as defaultRevealMarketSkill } from "../skills/revealMarket.js";

import { BaseAgent } from "./BaseAgent.js";
import { fixtureIdToMatchId } from "./matchId.js";
import { AgentDatabase, type MarketRow } from "./persistence/AgentDatabase.js";

const REVEAL_WINDOW_MS = 180 * 1000;
const REVEAL_SAFETY_BUFFER_MS = 5_000;
const FINAL_STATUS_SET: ReadonlySet<string> = FINAL_STATUSES;

export interface PollerLike {
  onTick(h: (e: TickEvent) => void): () => void;
  onError(h: (e: Error) => void): () => void;
  start(): void;
  stop(): Promise<void>;
}

export interface Scheduler {
  schedule(cb: () => void, delayMs: number): { cancel: () => void };
}

const defaultScheduler: Scheduler = {
  schedule(cb, delayMs) {
    const t = setTimeout(cb, delayMs);
    return { cancel: () => clearTimeout(t) };
  },
};

export interface TickLoopArgs {
  agent: BaseAgent;
  matchPoller: PollerLike;
  db: AgentDatabase;
  createMarketSkill?: typeof defaultCreateMarketSkill;
  revealMarketSkill?: typeof defaultRevealMarketSkill;
  clock?: () => Date;
  scheduler?: Scheduler;
  logger: Logger;
}

export class TickLoop {
  private readonly agent: BaseAgent;
  private readonly poller: PollerLike;
  private readonly db: AgentDatabase;
  private readonly createMarketSkill: typeof defaultCreateMarketSkill;
  private readonly revealMarketSkill: typeof defaultRevealMarketSkill;
  private readonly clock: () => Date;
  private readonly scheduler: Scheduler;
  private readonly logger: Logger;

  private fixtureId: number | null = null;
  private revealTimers = new Map<string, { cancel: () => void }>();
  private unsubscribers: Array<() => void> = [];
  private finalStatusObserved: string | null = null;
  private pending = new Set<Promise<unknown>>();

  private track<T>(p: Promise<T>): Promise<T> {
    this.pending.add(p);
    p.finally(() => this.pending.delete(p));
    return p;
  }

  constructor(args: TickLoopArgs) {
    this.agent = args.agent;
    this.poller = args.matchPoller;
    this.db = args.db;
    this.createMarketSkill = args.createMarketSkill ?? defaultCreateMarketSkill;
    this.revealMarketSkill = args.revealMarketSkill ?? defaultRevealMarketSkill;
    this.clock = args.clock ?? (() => new Date());
    this.scheduler = args.scheduler ?? defaultScheduler;
    this.logger = args.logger.child({ component: "tick-loop" });
  }

  async start(fixtureId: number): Promise<void> {
    this.fixtureId = fixtureId;
    await this.db.startMatchSession(fixtureId);
    this.logger.info({ fixtureId }, "tick-loop: start");

    await this.restorePendingReveals();

    this.unsubscribers.push(
      this.poller.onTick(({ snapshot, deltas }) => {
        this.track(this.handleSnapshot(snapshot, deltas));
      })
    );
    this.unsubscribers.push(
      this.poller.onError((err) => {
        this.logger.error({ err }, "tick-loop: poller error");
        this.track(
          this.db.logActivity({
            agentIndex: this.agent.identity.index,
            fixtureId,
            eventType: "ERROR",
            metadata: { source: "poller", message: err.message },
          })
        );
      })
    );

    this.poller.start();
  }

  async stop(): Promise<void> {
    for (const u of this.unsubscribers) u();
    this.unsubscribers = [];

    for (const t of this.revealTimers.values()) t.cancel();
    this.revealTimers.clear();

    // Wait for any in-flight handleSnapshot / fireReveal / activity-log writes
    // to settle before we tell the caller "stopped".
    await Promise.allSettled(Array.from(this.pending));

    await this.poller.stop();
    if (this.fixtureId !== null) {
      await this.db.endMatchSession(
        this.fixtureId,
        this.finalStatusObserved ?? "INTERRUPTED"
      );
    }
    this.logger.info("tick-loop: stop");
  }

  private async handleSnapshot(snapshot: MatchSnapshot, deltas: MatchDelta[]): Promise<void> {
    if (this.fixtureId === null) return;
    if (FINAL_STATUS_SET.has(snapshot.status)) this.finalStatusObserved = snapshot.status;

    await this.db.logActivity({
      agentIndex: this.agent.identity.index,
      fixtureId: this.fixtureId,
      eventType: "TICK",
      metadata: {
        minute: snapshot.minute,
        status: snapshot.status,
        deltaKinds: deltas.map((d) => d.kind),
      },
    });

    if (!this.agent.isInWindow(snapshot)) return;

    const opened = await this.db.countAgentMarketsForFixture(
      this.agent.config.index,
      this.fixtureId
    );
    if (opened >= this.agent.config.maxMarketsPerMatch) return;

    const proposals = await this.agent.evaluate({
      snapshot,
      recentDeltas: deltas,
      marketsAlreadyOpenedThisMatch: opened,
    });
    if (proposals.length === 0) return;

    await this.db.logActivity({
      agentIndex: this.agent.identity.index,
      fixtureId: this.fixtureId,
      eventType: "PROPOSE",
      metadata: { count: proposals.length, rationales: proposals.map((p) => p.rationale) },
    });

    let remaining = this.agent.config.maxMarketsPerMatch - opened;
    for (const proposal of proposals) {
      if (remaining-- <= 0) break;
      await this.tryOpenMarket(proposal, snapshot);
    }
  }

  private async tryOpenMarket(
    proposal: import("./BaseAgent.js").ProposedMarket,
    snapshot: MatchSnapshot
  ): Promise<void> {
    if (this.fixtureId === null) return;
    try {
      const revealedParams = await this.agent.buildRevealedParams({ proposal, snapshot });
      const out = await this.createMarketSkill({
        agentIndex: this.agent.identity.index,
        // walletAccount is an HDAccount in production wiring; we widen via the same
        // structural account used in P9 createMarketSkill tests.
        agentAccount: this.agent.walletAccount as Parameters<typeof this.createMarketSkill>[0]["agentAccount"],
        walletClient: this.agent.walletClient,
        publicClient: this.agent.publicClient,
        factoryAddress: this.agent.factoryAddress,
        resolverAddress: this.agent.resolverAddress,
        matchId: fixtureIdToMatchId(this.fixtureId),
        // PropMarketHookFactory accepts a bytes32 propositionId — we use the
        // template's stable id here. For a future persona that opens multiple
        // markets with the same template per match, a (templateId, paramsHash)
        // derivation can replace this.
        propositionId: proposal.templateId,
        revealedParams,
        marketDeadline: proposal.marketDeadline,
        resolveDeadline: proposal.resolveDeadline,
        logger: this.logger,
      });

      const scheduledRevealAt = new Date(this.clock().getTime() + REVEAL_WINDOW_MS + REVEAL_SAFETY_BUFFER_MS);

      const row = await this.db.insertMarket({
        id: out.marketId,
        hookAddress: out.hookAddress,
        agentIndex: this.agent.identity.index,
        agentName: this.agent.identity.name,
        fixtureId: this.fixtureId,
        matchId: fixtureIdToMatchId(this.fixtureId),
        propositionId: proposal.templateId,
        revealedParams,
        revealSalt: out.revealSalt,
        create2Salt: out.create2Salt,
        commitHash: out.commitHash,
        marketDeadline: proposal.marketDeadline,
        resolveDeadline: proposal.resolveDeadline,
        createdAtBlock: out.blockNumber,
        createdTxHash: out.txHash,
        scheduledRevealAt,
      });

      await this.db.logActivity({
        agentIndex: this.agent.identity.index,
        fixtureId: this.fixtureId,
        eventType: "CREATE",
        marketId: out.marketId,
        metadata: { hook: out.hookAddress, txHash: out.txHash, blockNumber: out.blockNumber },
      });

      await this.scheduleReveal(row);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      this.logger.error({ err: e, templateId: proposal.templateId }, "tick-loop: createMarket failed");
      await this.db.logActivity({
        agentIndex: this.agent.identity.index,
        fixtureId: this.fixtureId,
        eventType: "ERROR",
        metadata: { stage: "createMarket", message: e.message },
      });
    }
  }

  private async scheduleReveal(market: MarketRow): Promise<void> {
    const delay = Math.max(0, market.scheduledRevealAt.getTime() - this.clock().getTime());
    const handle = this.scheduler.schedule(() => {
      this.track(this.fireReveal(market.id));
    }, delay);
    this.revealTimers.set(market.id, handle);

    await this.db.logActivity({
      agentIndex: market.agentIndex as import("../types/agent.js").AgentIndex,
      fixtureId: market.fixtureId,
      eventType: "REVEAL_SCHEDULED",
      marketId: market.id,
      metadata: { delayMs: delay, scheduledFor: market.scheduledRevealAt.toISOString() },
    });
  }

  private async fireReveal(marketId: string): Promise<void> {
    this.revealTimers.delete(marketId);
    const market = await this.db.getMarketById(marketId);
    if (!market) return;
    if (market.status !== "COMMITTED") return;

    await this.db.logActivity({
      agentIndex: market.agentIndex as import("../types/agent.js").AgentIndex,
      fixtureId: market.fixtureId,
      eventType: "REVEAL",
      marketId,
      metadata: { hookAddress: market.hookAddress },
    });

    try {
      const out = await this.revealMarketSkill({
        agentAccount: this.agent.walletAccount as Parameters<typeof this.revealMarketSkill>[0]["agentAccount"],
        walletClient: this.agent.walletClient,
        publicClient: this.agent.publicClient,
        hookAddress: market.hookAddress as `0x${string}`,
        revealedParams: market.revealedParams as Hex,
        revealSalt: market.revealSalt as Hex,
        logger: this.logger,
      });
      await this.db.updateMarketRevealed(marketId, out.txHash, new Date());
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      this.logger.error({ err: e, marketId }, "tick-loop: reveal failed");
      await this.db.updateMarketRevealFailed(marketId, e.message);
      await this.db.logActivity({
        agentIndex: market.agentIndex as import("../types/agent.js").AgentIndex,
        fixtureId: market.fixtureId,
        eventType: "REVEAL_FAILED",
        marketId,
        metadata: { message: e.message },
      });
    }
  }

  private async restorePendingReveals(): Promise<void> {
    const pending = await this.db.getMarketsAwaitingReveal();
    for (const m of pending) await this.scheduleReveal(m);
    if (pending.length > 0) {
      this.logger.info({ count: pending.length }, "tick-loop: restored pending reveals");
    }
  }
}
