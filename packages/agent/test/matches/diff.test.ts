import { describe, it, expect } from "vitest";
import { diffSnapshots } from "../../src/matches/MatchStateDiff.js";
import {
  emptyTeamStatistic,
  type MatchEvent,
  type MatchSnapshot,
  type Team,
} from "../../src/matches/types.js";

const HOME: Team = { id: 100, name: "Home" };
const AWAY: Team = { id: 200, name: "Away" };

function baseSnapshot(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
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

function ev(partial: Partial<MatchEvent> & Pick<MatchEvent, "type" | "minute" | "team">): MatchEvent {
  return {
    detail: partial.detail ?? "Normal Goal",
    minute: partial.minute,
    stoppage: partial.stoppage ?? null,
    team: partial.team,
    player: partial.player ?? { id: 1, name: "Player" },
    assist: partial.assist ?? null,
    comments: partial.comments ?? null,
    type: partial.type,
  };
}

describe("diffSnapshots", () => {
  it("null prev + NS curr → []", () => {
    const out = diffSnapshots(null, baseSnapshot({ status: "NS" }));
    expect(out).toEqual([]);
  });

  it("null prev + LIVE curr → [STATUS_CHANGE from NS to LIVE]", () => {
    const out = diffSnapshots(null, baseSnapshot({ status: "LIVE" }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "STATUS_CHANGE", from: "NS", to: "LIVE" });
  });

  it("status NS → 1H emits STATUS_CHANGE", () => {
    const prev = baseSnapshot({ status: "NS" });
    const curr = baseSnapshot({ status: "1H", minute: 1 });
    const out = diffSnapshots(prev, curr);
    expect(out.some((d) => d.kind === "STATUS_CHANGE" && d.from === "NS" && d.to === "1H")).toBe(true);
  });

  it("minute 17 → 18 emits MINUTE_TICK", () => {
    const prev = baseSnapshot({ minute: 17 });
    const curr = baseSnapshot({ minute: 18 });
    const out = diffSnapshots(prev, curr);
    expect(out).toEqual([{ kind: "MINUTE_TICK", from: 17, to: 18, emittedAt: curr.fetchedAt }]);
  });

  it("new GOAL event → [GOAL] with newScore", () => {
    const prev = baseSnapshot();
    const goal = ev({ type: "GOAL", minute: 12, team: HOME, detail: "Normal Goal" });
    const curr = baseSnapshot({ events: [goal], score: { homeGoals: 1, awayGoals: 0 } });
    const out = diffSnapshots(prev, curr);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "GOAL", newScore: { homeGoals: 1, awayGoals: 0 } });
  });

  it("new YELLOW CARD → [CARD color YELLOW]", () => {
    const card = ev({ type: "CARD", minute: 22, team: AWAY, detail: "Yellow Card" });
    const out = diffSnapshots(baseSnapshot(), baseSnapshot({ events: [card] }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "CARD", color: "YELLOW" });
  });

  it("new RED CARD → [CARD color RED]", () => {
    const card = ev({ type: "CARD", minute: 89, team: AWAY, detail: "Red Card" });
    const out = diffSnapshots(baseSnapshot(), baseSnapshot({ events: [card] }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "CARD", color: "RED" });
  });

  it("new SUBSTITUTION → [SUBSTITUTION]", () => {
    const sub = ev({ type: "SUBSTITUTION", minute: 67, team: HOME, detail: "Substitution 1" });
    const out = diffSnapshots(baseSnapshot(), baseSnapshot({ events: [sub] }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "SUBSTITUTION" });
  });

  it("CORNER_COUNT_INCREMENT 4→5 (home)", () => {
    const prev = baseSnapshot();
    prev.statistics.home.cornerKicks = 4;
    const curr = baseSnapshot();
    curr.statistics.home.cornerKicks = 5;
    const out = diffSnapshots(prev, curr);
    expect(out).toEqual([
      { kind: "CORNER_COUNT_INCREMENT", team: "HOME", from: 4, to: 5, emittedAt: curr.fetchedAt },
    ]);
  });

  it("SHOT_ON_GOAL_INCREMENT 2→3 (away)", () => {
    const prev = baseSnapshot();
    prev.statistics.away.shotsOnGoal = 2;
    const curr = baseSnapshot();
    curr.statistics.away.shotsOnGoal = 3;
    const out = diffSnapshots(prev, curr);
    expect(out).toEqual([
      { kind: "SHOT_ON_GOAL_INCREMENT", team: "AWAY", from: 2, to: 3, emittedAt: curr.fetchedAt },
    ]);
  });

  it("POSSESSION_SHIFT when home moves 50→55 (delta 5 ≥ threshold 3)", () => {
    const prev = baseSnapshot();
    prev.statistics.home.ballPossessionPct = 50;
    prev.statistics.away.ballPossessionPct = 50;
    const curr = baseSnapshot();
    curr.statistics.home.ballPossessionPct = 55;
    curr.statistics.away.ballPossessionPct = 45;
    const out = diffSnapshots(prev, curr);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "POSSESSION_SHIFT",
      from: { home: 50, away: 50 },
      to: { home: 55, away: 45 },
      homeDeltaPct: 5,
    });
  });

  it("no POSSESSION_SHIFT below threshold", () => {
    const prev = baseSnapshot();
    prev.statistics.home.ballPossessionPct = 50;
    const curr = baseSnapshot();
    curr.statistics.home.ballPossessionPct = 51;
    const out = diffSnapshots(prev, curr);
    expect(out.find((d) => d.kind === "POSSESSION_SHIFT")).toBeUndefined();
  });

  it("status 2H → FT emits FINAL_WHISTLE with finalScore", () => {
    const prev = baseSnapshot({ status: "2H", minute: 90 });
    const curr = baseSnapshot({ status: "FT", minute: 90, score: { homeGoals: 2, awayGoals: 1 } });
    const out = diffSnapshots(prev, curr);
    expect(out.some((d) => d.kind === "STATUS_CHANGE" && d.to === "FT")).toBe(true);
    expect(
      out.some((d) => d.kind === "FINAL_WHISTLE" && d.finalScore.homeGoals === 2 && d.finalScore.awayGoals === 1)
    ).toBe(true);
  });

  it("composite snapshot emits all simultaneous deltas", () => {
    const prev = baseSnapshot({ status: "1H", minute: 17 });
    prev.statistics.home.cornerKicks = 1;
    prev.statistics.home.ballPossessionPct = 50;
    prev.statistics.away.ballPossessionPct = 50;

    const goal = ev({ type: "GOAL", minute: 18, team: HOME, detail: "Normal Goal" });
    const yellow = ev({ type: "CARD", minute: 18, team: AWAY, detail: "Yellow Card", player: { id: 2, name: "P2" } });
    const curr = baseSnapshot({
      status: "1H",
      minute: 18,
      events: [goal, yellow],
      score: { homeGoals: 1, awayGoals: 0 },
    });
    curr.statistics.home.cornerKicks = 2;
    curr.statistics.home.ballPossessionPct = 56;
    curr.statistics.away.ballPossessionPct = 44;

    const kinds = diffSnapshots(prev, curr).map((d) => d.kind);
    expect(kinds).toContain("MINUTE_TICK");
    expect(kinds).toContain("GOAL");
    expect(kinds).toContain("CARD");
    expect(kinds).toContain("CORNER_COUNT_INCREMENT");
    expect(kinds).toContain("POSSESSION_SHIFT");
    expect(kinds.length).toBe(5);
  });
});
