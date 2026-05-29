import { describe, it, expect } from "vitest";

import { foulsCountOver } from "../../../src/propositions/templates/FoulsCountOver.js";
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

describe("FoulsCountOver", () => {
  it("id is the locked keccak256(utf8('FOULS_COUNT_OVER_v1'))", () => {
    expect(foulsCountOver.id).toBe(
      "0x7ae209807bc200265c262ffe4d786cf722bfe8b0251644687d74cf544ce2f950"
    );
  });

  it("encode → decode round-trip", () => {
    const params = {
      targetTeam: "TOTAL" as const,
      thresholdCount: 5,
      windowMinutes: 20,
      openedAtMinute: 15,
      openedAtFoulsCount: 4,
    };
    expect(foulsCountOver.decodeParams(foulsCountOver.encodeParams(params))).toEqual(params);
  });

  it("returns null while window still open", () => {
    expect(
      foulsCountOver.resolve(
        { snapshot: snap({ minute: 20 }), openedAtMinute: 15 },
        {
          targetTeam: "TOTAL",
          thresholdCount: 5,
          windowMinutes: 20,
          openedAtMinute: 15,
          openedAtFoulsCount: 4,
        }
      )
    ).toBeNull();
  });

  it("TOTAL: 1 (OVER) when delta strictly > threshold", () => {
    const s = snap({ minute: 36 });
    s.statistics.home.fouls = 8; // 8 + 6 = 14 total, baseline 4, delta 10 > 5
    s.statistics.away.fouls = 6;
    expect(
      foulsCountOver.resolve(
        { snapshot: s, openedAtMinute: 15 },
        {
          targetTeam: "TOTAL",
          thresholdCount: 5,
          windowMinutes: 20,
          openedAtMinute: 15,
          openedAtFoulsCount: 4,
        }
      )
    ).toBe(1);
  });

  it("AWAY-only: 2 (UNDER) when away delta NOT strictly > threshold", () => {
    const s = snap({ minute: 36 });
    s.statistics.away.fouls = 8; // baseline 6, delta 2 NOT > 2
    expect(
      foulsCountOver.resolve(
        { snapshot: s, openedAtMinute: 15 },
        {
          targetTeam: "AWAY",
          thresholdCount: 2,
          windowMinutes: 20,
          openedAtMinute: 15,
          openedAtFoulsCount: 6,
        }
      )
    ).toBe(2);
  });
});
