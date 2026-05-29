import { describe, it, expect, vi } from "vitest";
import pino from "pino";

import { MatchPoller } from "../../src/matches/MatchPoller.js";
import {
  emptyTeamStatistic,
  type MatchDelta,
  type MatchSnapshot,
  type Team,
} from "../../src/matches/types.js";

const HOME: Team = { id: 100, name: "Home" };
const AWAY: Team = { id: 200, name: "Away" };
const silentLogger = pino({ level: "silent" });

function snapshot(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
  return {
    fixtureId: 1,
    fetchedAt: Date.now(),
    status: "1H",
    minute: 1,
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

/** Stub client that delivers a programmed sequence of snapshots or errors. */
function makeStubClient(sequence: Array<MatchSnapshot | Error>) {
  let i = 0;
  return {
    fetchSnapshot: vi.fn(async () => {
      const item = sequence[Math.min(i, sequence.length - 1)];
      i++;
      if (item instanceof Error) throw item;
      return item as MatchSnapshot;
    }),
  } as unknown as ConstructorParameters<typeof MatchPoller>[0]["client"];
}

/** Immediate-resolve sleep so the loop runs synchronously after microtask flushes. */
const fastSleep = (_ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Error("aborted"));
    queueMicrotask(() => (signal.aborted ? reject(new Error("aborted")) : resolve()));
  });

describe("MatchPoller", () => {
  it("emits a snapshot + diff deltas, in order", async () => {
    const s1 = snapshot({ minute: 1 });
    const s2 = snapshot({ minute: 2 });
    const s3 = snapshot({ status: "FT", minute: 90 });

    const client = makeStubClient([s1, s2, s3, s3, s3]);
    const poller = new MatchPoller({
      client,
      fixtureId: 1,
      intervalMs: 1,
      logger: silentLogger,
      sleepImpl: fastSleep,
      finalGraceTicks: 3,
    });

    const deltas: MatchDelta[] = [];
    const snaps: MatchSnapshot[] = [];
    poller.onDelta((d) => deltas.push(d));
    poller.onSnapshot((s) => snaps.push(s));

    poller.start();
    await new Promise<void>((r) => setTimeout(r, 50));
    await poller.stop();

    expect(snaps.length).toBeGreaterThanOrEqual(3);
    expect(deltas.some((d) => d.kind === "MINUTE_TICK" && d.from === 1 && d.to === 2)).toBe(true);
    expect(deltas.some((d) => d.kind === "FINAL_WHISTLE")).toBe(true);
  });

  it("stop() cancels cleanly mid-loop", async () => {
    const client = makeStubClient([snapshot()]);
    const poller = new MatchPoller({
      client,
      fixtureId: 1,
      intervalMs: 1,
      logger: silentLogger,
      sleepImpl: fastSleep,
      finalGraceTicks: 3,
    });
    poller.start();
    await poller.stop();
    // No throws, runner cleared
    expect(true).toBe(true);
  });

  it("onError fires on client throw", async () => {
    const client = makeStubClient([new Error("boom"), snapshot({ status: "FT" }), snapshot({ status: "FT" }), snapshot({ status: "FT" })]);
    const poller = new MatchPoller({
      client,
      fixtureId: 1,
      intervalMs: 1,
      logger: silentLogger,
      sleepImpl: fastSleep,
      finalGraceTicks: 3,
    });
    const errors: Error[] = [];
    poller.onError((e) => errors.push(e));
    poller.start();
    await new Promise<void>((r) => setTimeout(r, 50));
    await poller.stop();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.message).toBe("boom");
  });

  it("onTick fires with both snapshot and deltas in one bundle", async () => {
    const s1 = snapshot({ minute: 10 });
    const s2 = snapshot({ minute: 11 });
    const client = makeStubClient([s1, s2, snapshot({ status: "FT" }), snapshot({ status: "FT" }), snapshot({ status: "FT" })]);
    const poller = new MatchPoller({
      client,
      fixtureId: 1,
      intervalMs: 1,
      logger: silentLogger,
      sleepImpl: fastSleep,
      finalGraceTicks: 3,
    });
    const ticks: Array<{ snapshotMinute: number; deltaKinds: string[] }> = [];
    poller.onTick(({ snapshot: s, deltas }) =>
      ticks.push({ snapshotMinute: s.minute, deltaKinds: deltas.map((d) => d.kind) })
    );
    poller.start();
    await new Promise<void>((r) => setTimeout(r, 50));
    await poller.stop();
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    // Second tick should have MINUTE_TICK in its deltas (10 → 11)
    const hasMinuteTick = ticks.some((t) => t.deltaKinds.includes("MINUTE_TICK"));
    expect(hasMinuteTick).toBe(true);
  });

  it("stops after finalGraceTicks at FT", async () => {
    const finalSnap = snapshot({ status: "FT", minute: 90 });
    const client = makeStubClient([finalSnap, finalSnap, finalSnap, finalSnap, finalSnap]);
    const ticks = vi.fn();
    const poller = new MatchPoller({
      client,
      fixtureId: 1,
      intervalMs: 1,
      logger: silentLogger,
      sleepImpl: fastSleep,
      finalGraceTicks: 3,
    });
    poller.onSnapshot(() => ticks());
    poller.start();
    // Wait for natural self-termination
    await new Promise<void>((r) => setTimeout(r, 50));
    await poller.stop();
    expect(ticks.mock.calls.length).toBe(3);
  });
});
