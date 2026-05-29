import { describe, it, expect } from "vitest";

import { nextGoalHomeAway } from "../../../src/propositions/templates/NextGoalHomeAway.js";
import { emptyTeamStatistic, type MatchEvent, type MatchSnapshot, type Team } from "../../../src/matches/types.js";

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

function goal(team: Team, minute: number, stoppage: number | null = null): MatchEvent {
  return {
    type: "GOAL",
    detail: "Normal Goal",
    minute,
    stoppage,
    team,
    player: { id: 1, name: "P" },
    assist: null,
    comments: null,
  };
}

describe("NextGoalHomeAway", () => {
  it("id is the locked keccak256(utf8('NEXT_GOAL_HOME_AWAY_v1'))", () => {
    expect(nextGoalHomeAway.id).toBe(
      "0x506cc97cb6a522c4c2c52e8be33d8f8a882e0bd31ff5a9621ce84497b317f544"
    );
  });

  it("encodeParams → decodeParams round-trip", () => {
    const params = { windowMinutes: 30, openedAtMinute: 10 };
    expect(nextGoalHomeAway.decodeParams(nextGoalHomeAway.encodeParams(params))).toEqual(params);
  });

  it("returns null while window not closed AND no goal yet", () => {
    expect(
      nextGoalHomeAway.resolve(
        { snapshot: snap({ minute: 15 }), openedAtMinute: 10 },
        { windowMinutes: 30, openedAtMinute: 10 }
      )
    ).toBeNull();
  });

  it("returns null when window closed without any in-window goal (REFUND path)", () => {
    // window 10..40, current minute 45 (closed), no events
    expect(
      nextGoalHomeAway.resolve(
        { snapshot: snap({ minute: 45 }), openedAtMinute: 10 },
        { windowMinutes: 30, openedAtMinute: 10 }
      )
    ).toBeNull();
  });

  it("returns 1 (HOME) when first in-window goal is home", () => {
    const s = snap({ minute: 45, events: [goal(HOME, 22), goal(AWAY, 30)] });
    expect(
      nextGoalHomeAway.resolve(
        { snapshot: s, openedAtMinute: 10 },
        { windowMinutes: 30, openedAtMinute: 10 }
      )
    ).toBe(1);
  });

  it("returns 2 (AWAY) when first in-window goal is away", () => {
    const s = snap({ minute: 45, events: [goal(AWAY, 18), goal(HOME, 25)] });
    expect(
      nextGoalHomeAway.resolve(
        { snapshot: s, openedAtMinute: 10 },
        { windowMinutes: 30, openedAtMinute: 10 }
      )
    ).toBe(2);
  });

  it("picks the FIRST in-window goal (minute + stoppage tie-break)", () => {
    // Both at minute 30: home stoppage=2, away stoppage=4 → home is first
    const s = snap({
      minute: 45,
      events: [
        goal(AWAY, 30, 4),
        goal(HOME, 30, 2),
        goal(HOME, 5), // BEFORE window — must be ignored
      ],
    });
    expect(
      nextGoalHomeAway.resolve(
        { snapshot: s, openedAtMinute: 10 },
        { windowMinutes: 30, openedAtMinute: 10 }
      )
    ).toBe(1);
  });
});
