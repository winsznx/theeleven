import { describe, it, expect } from "vitest";

import { cornerCountOver } from "../../../src/propositions/templates/CornerCountOver.js";
import { emptyTeamStatistic, type MatchSnapshot, type Team } from "../../../src/matches/types.js";

const HOME: Team = { id: 100, name: "Home" };
const AWAY: Team = { id: 200, name: "Away" };

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

describe("CornerCountOver", () => {
  it("id is the locked keccak256(utf8('CORNER_COUNT_OVER_v1'))", () => {
    expect(cornerCountOver.id).toBe(
      "0x5c8ecc95857151c0502ee7bd83e41b79e44e237339373e5e236b2b3c221b995c"
    );
  });

  it("encode → decode round-trip across all 3 target codes", () => {
    for (const targetTeam of ["HOME", "AWAY", "TOTAL"] as const) {
      const params = {
        targetTeam,
        thresholdCount: 2,
        windowMinutes: 15,
        openedAtMinute: 20,
        openedAtCornerCount: 3,
      };
      expect(cornerCountOver.decodeParams(cornerCountOver.encodeParams(params))).toEqual(params);
    }
  });

  it("resolve returns null while window still open + not final", () => {
    const params = {
      targetTeam: "TOTAL" as const,
      thresholdCount: 2,
      windowMinutes: 15,
      openedAtMinute: 20,
      openedAtCornerCount: 3,
    };
    expect(
      cornerCountOver.resolve({ snapshot: snap({ minute: 30 }), openedAtMinute: 20 }, params)
    ).toBeNull();
  });

  it("TOTAL target: 1 (OVER) when (home+away delta) strictly > threshold", () => {
    const s = snap({ minute: 36 });
    s.statistics.home.cornerKicks = 4; // baseline was 3 + 1 = 4
    s.statistics.away.cornerKicks = 5; // baseline was 0 + 5 = 5
    // total now 9, baseline 3, delta 6 > 2 → OVER
    const params = {
      targetTeam: "TOTAL" as const,
      thresholdCount: 2,
      windowMinutes: 15,
      openedAtMinute: 20,
      openedAtCornerCount: 3,
    };
    expect(cornerCountOver.resolve({ snapshot: s, openedAtMinute: 20 }, params)).toBe(1);
  });

  it("HOME-only target: 2 (UNDER) when home delta does not strictly exceed threshold", () => {
    const s = snap({ minute: 36 });
    s.statistics.home.cornerKicks = 5; // baseline 3, delta 2 (NOT > 2)
    s.statistics.away.cornerKicks = 9; // ignored for HOME target
    const params = {
      targetTeam: "HOME" as const,
      thresholdCount: 2,
      windowMinutes: 15,
      openedAtMinute: 20,
      openedAtCornerCount: 3,
    };
    expect(cornerCountOver.resolve({ snapshot: s, openedAtMinute: 20 }, params)).toBe(2);
  });

  it("openedAtCornerCount baseline correctly subtracted", () => {
    const s = snap({ minute: 36 });
    s.statistics.home.cornerKicks = 8; // baseline 7, delta 1 (NOT > 0)
    const params = {
      targetTeam: "HOME" as const,
      thresholdCount: 0, // any delta > 0 wins OVER
      windowMinutes: 15,
      openedAtMinute: 20,
      openedAtCornerCount: 7,
    };
    expect(cornerCountOver.resolve({ snapshot: s, openedAtMinute: 20 }, params)).toBe(1);
  });
});
