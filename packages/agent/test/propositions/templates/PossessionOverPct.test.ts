import { describe, it, expect } from "vitest";

import { possessionOverPct } from "../../../src/propositions/templates/PossessionOverPct.js";
import { emptyTeamStatistic, type MatchSnapshot, type Team } from "../../../src/matches/types.js";

const HOME: Team = { id: 100, name: "Home" };
const AWAY: Team = { id: 200, name: "Away" };

function snap(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
  return {
    fixtureId: 1,
    fetchedAt: 1_700_000_000_000,
    status: "2H",
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

describe("PossessionOverPct", () => {
  it("id is the locked keccak256(utf8('POSSESSION_OVER_PCT_v1'))", () => {
    expect(possessionOverPct.id).toBe(
      "0xa4483bd5ddac69bbcde753833eaad079662e18d316f765c0809e9a9bd4a470ff"
    );
  });

  it("encodeParams → decodeParams round-trip", () => {
    const params = { targetTeam: "HOME" as const, thresholdPct: 55, windowMinutes: 10, openedAtMinute: 60 };
    expect(possessionOverPct.decodeParams(possessionOverPct.encodeParams(params))).toEqual(params);
  });

  it("resolve returns null while window still open", () => {
    const params = { targetTeam: "HOME" as const, thresholdPct: 55, windowMinutes: 10, openedAtMinute: 60 };
    expect(
      possessionOverPct.resolve({ snapshot: snap({ minute: 65 }), openedAtMinute: 60 }, params)
    ).toBeNull();
  });

  it("resolve returns 1 (OVER) when threshold strictly breached", () => {
    const s = snap({ minute: 70 });
    s.statistics.home.ballPossessionPct = 58;
    const params = { targetTeam: "HOME" as const, thresholdPct: 55, windowMinutes: 10, openedAtMinute: 60 };
    expect(possessionOverPct.resolve({ snapshot: s, openedAtMinute: 60 }, params)).toBe(1);
  });

  it("resolve returns 2 (UNDER) when at-or-below threshold", () => {
    const s = snap({ minute: 70 });
    s.statistics.home.ballPossessionPct = 55; // strictly NOT > 55
    const params = { targetTeam: "HOME" as const, thresholdPct: 55, windowMinutes: 10, openedAtMinute: 60 };
    expect(possessionOverPct.resolve({ snapshot: s, openedAtMinute: 60 }, params)).toBe(2);
  });
});
