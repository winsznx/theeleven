import type { Logger } from "pino";

import { diffSnapshots } from "./MatchStateDiff.js";
import {
  DEFAULT_DIFF_OPTIONS,
  FINAL_STATUSES,
  type DiffOptions,
  type MatchDelta,
  type MatchSnapshot,
} from "./types.js";

/** Structural interface any provider must satisfy. Both
 *  ApiFootballClient and FootballDataClient implement this; MatchPoller
 *  doesn't care which one it gets. */
export interface MatchSnapshotProvider {
  fetchSnapshot(id: number): Promise<MatchSnapshot>;
}

export interface MatchPollerOptions {
  client: MatchSnapshotProvider;
  fixtureId: number;
  intervalMs?: number;
  logger: Logger;
  diffOptions?: DiffOptions;
  /** Override for tests — receives ms, returns a Promise. */
  sleepImpl?: (ms: number, signal: AbortSignal) => Promise<void>;
  /** Number of post-FT ticks before the loop self-terminates. Default 3. */
  finalGraceTicks?: number;
}

type DeltaHandler = (delta: MatchDelta) => void;
type SnapshotHandler = (snap: MatchSnapshot) => void;
type ErrorHandler = (err: Error) => void;
export interface TickEvent {
  snapshot: MatchSnapshot;
  deltas: MatchDelta[];
}
type TickHandler = (e: TickEvent) => void;

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_FINAL_GRACE = 3;
const MAX_BACKOFF_MULT = 8;

function defaultSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Error("aborted"));
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export class MatchPoller {
  private readonly client: MatchSnapshotProvider;
  private readonly fixtureId: number;
  private readonly intervalMs: number;
  private readonly logger: Logger;
  private readonly diffOptions: DiffOptions;
  private readonly sleepImpl: (ms: number, signal: AbortSignal) => Promise<void>;
  private readonly finalGraceTicks: number;

  private readonly deltaSubs = new Set<DeltaHandler>();
  private readonly snapshotSubs = new Set<SnapshotHandler>();
  private readonly errorSubs = new Set<ErrorHandler>();
  private readonly tickSubs = new Set<TickHandler>();

  private controller: AbortController | null = null;
  private runner: Promise<void> | null = null;
  private prev: MatchSnapshot | null = null;
  private backoffMult = 1;
  private postFinalTicks = 0;

  constructor(opts: MatchPollerOptions) {
    this.client = opts.client;
    this.fixtureId = opts.fixtureId;
    this.intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.logger = opts.logger;
    this.diffOptions = opts.diffOptions ?? DEFAULT_DIFF_OPTIONS;
    this.sleepImpl = opts.sleepImpl ?? defaultSleep;
    this.finalGraceTicks = opts.finalGraceTicks ?? DEFAULT_FINAL_GRACE;
  }

  start(): void {
    if (this.controller) return;
    this.controller = new AbortController();
    this.runner = this.loop(this.controller.signal).catch(() => {
      // loop swallows its own errors via onError handlers; this catch is
      // safety net so an unhandled rejection never leaks.
    });
  }

  async stop(): Promise<void> {
    if (!this.controller) return;
    this.controller.abort();
    try {
      await this.runner;
    } finally {
      this.controller = null;
      this.runner = null;
    }
  }

  onDelta(h: DeltaHandler): () => void {
    this.deltaSubs.add(h);
    return () => this.deltaSubs.delete(h);
  }
  onSnapshot(h: SnapshotHandler): () => void {
    this.snapshotSubs.add(h);
    return () => this.snapshotSubs.delete(h);
  }
  onError(h: ErrorHandler): () => void {
    this.errorSubs.add(h);
    return () => this.errorSubs.delete(h);
  }
  /** Bundled per-tick callback: snapshot + diff deltas in one event. */
  onTick(h: TickHandler): () => void {
    this.tickSubs.add(h);
    return () => this.tickSubs.delete(h);
  }

  private emitDelta(d: MatchDelta) {
    for (const h of this.deltaSubs) h(d);
  }
  private emitSnapshot(s: MatchSnapshot) {
    for (const h of this.snapshotSubs) h(s);
  }
  private emitError(e: Error) {
    for (const h of this.errorSubs) h(e);
  }
  private emitTick(e: TickEvent) {
    for (const h of this.tickSubs) h(e);
  }

  private async loop(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      let ok = false;
      try {
        const snap = await this.client.fetchSnapshot(this.fixtureId);
        if (signal.aborted) return;
        this.emitSnapshot(snap);
        const deltas = diffSnapshots(this.prev, snap, this.diffOptions);
        for (const d of deltas) this.emitDelta(d);
        this.emitTick({ snapshot: snap, deltas });
        this.prev = snap;
        ok = true;

        if (FINAL_STATUSES.has(snap.status)) {
          this.postFinalTicks += 1;
          if (this.postFinalTicks >= this.finalGraceTicks) {
            this.logger.info(
              { fixtureId: this.fixtureId, status: snap.status },
              "final-status grace period elapsed; poller stopping"
            );
            return;
          }
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        this.logger.warn({ err: e, fixtureId: this.fixtureId }, "poller tick failed");
        this.emitError(e);
      }

      this.backoffMult = ok ? 1 : Math.min(this.backoffMult * 2, MAX_BACKOFF_MULT);
      const wait = this.intervalMs * this.backoffMult;

      try {
        await this.sleepImpl(wait, signal);
      } catch {
        return; // aborted during sleep
      }
    }
  }
}
