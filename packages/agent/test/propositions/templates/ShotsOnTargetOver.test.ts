import { describe, it, expect } from "vitest";

import { shotsOnTargetOver } from "../../../src/propositions/templates/ShotsOnTargetOver.js";
import { emptyTeamStatistic, type MatchSnapshot, type Team } from "../../../src/matches/types.js";

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

describe("ShotsOnTargetOver", () => {
  it("id is the locked keccak256(utf8('SHOTS_ON_TARGET_OVER_v1'))", () => {
    expect(shotsOnTargetOver.id).toBe(
      "0xe5976e5f95a3832be31afde8cfc0fb1883a5681ddf9fc504d8e4739505c0605a"
    );
  });

  it("encode → decode round-trip across all 3 target codes", () => {
    for (const targetTeam of ["HOME", "AWAY", "TOTAL"] as const) {
      const params = {
        targetTeam,
        thresholdCount: 2,
        windowMinutes: 10,
        openedAtMinute: 30,
        openedAtShotsCount: 4,
      };
      expect(shotsOnTargetOver.decodeParams(shotsOnTargetOver.encodeParams(params))).toEqual(params);
    }
  });

  it("returns null while window still open + not final", () => {
    expect(
      shotsOnTargetOver.resolve(
        { snapshot: snap({ minute: 35 }), openedAtMinute: 30 },
        {
          targetTeam: "TOTAL",
          thresholdCount: 2,
          windowMinutes: 10,
          openedAtMinute: 30,
          openedAtShotsCount: 4,
        }
      )
    ).toBeNull();
  });

  it("TOTAL target: 1 (OVER) when (home+away delta) strictly > threshold", () => {
    const s = snap({ minute: 41 });
    s.statistics.home.shotsOnGoal = 5; // baseline 2+2=4 → home up to 5, away up to 4 = total 9, delta 5 > 2
    s.statistics.away.shotsOnGoal = 4;
    expect(
      shotsOnTargetOver.resolve(
        { snapshot: s, openedAtMinute: 30 },
        {
          targetTeam: "TOTAL",
          thresholdCount: 2,
          windowMinutes: 10,
          openedAtMinute: 30,
          openedAtShotsCount: 4,
        }
      )
    ).toBe(1);
  });

  it("HOME-only target: 2 (UNDER) when home delta not strictly > threshold", () => {
    const s = snap({ minute: 41 });
    s.statistics.home.shotsOnGoal = 4; // baseline 2, delta 2 NOT > 2
    expect(
      shotsOnTargetOver.resolve(
        { snapshot: s, openedAtMinute: 30 },
        {
          targetTeam: "HOME",
          thresholdCount: 2,
          windowMinutes: 10,
          openedAtMinute: 30,
          openedAtShotsCount: 2,
        }
      )
    ).toBe(2);
  });

  it("openedAtShotsCount baseline is correctly subtracted", () => {
    const s = snap({ minute: 41 });
    s.statistics.away.shotsOnGoal = 9; // baseline 7, delta 2
    expect(
      shotsOnTargetOver.resolve(
        { snapshot: s, openedAtMinute: 30 },
        {
          targetTeam: "AWAY",
          thresholdCount: 1,
          windowMinutes: 10,
          openedAtMinute: 30,
          openedAtShotsCount: 7,
        }
      )
    ).toBe(1);
  });
});
