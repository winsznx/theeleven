import { describe, it, expect } from "vitest";

import { yellowCardCountOver } from "../../../src/propositions/templates/YellowCardCountOver.js";
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

describe("YellowCardCountOver", () => {
  it("id is the locked keccak256(utf8('YELLOW_CARD_COUNT_OVER_v1'))", () => {
    expect(yellowCardCountOver.id).toBe(
      "0x6950a7c8651c05c7870db4c798dc6eff5e3354382beca7bac1b205f19f0e0054"
    );
  });

  it("encode → decode round-trip", () => {
    const params = {
      targetTeam: "TOTAL" as const,
      thresholdCount: 1,
      windowMinutes: 30,
      openedAtMinute: 35,
      openedAtYellowCount: 2,
    };
    expect(yellowCardCountOver.decodeParams(yellowCardCountOver.encodeParams(params))).toEqual(params);
  });

  it("returns null while window still open", () => {
    expect(
      yellowCardCountOver.resolve(
        { snapshot: snap({ minute: 40 }), openedAtMinute: 35 },
        {
          targetTeam: "TOTAL",
          thresholdCount: 1,
          windowMinutes: 30,
          openedAtMinute: 35,
          openedAtYellowCount: 2,
        }
      )
    ).toBeNull();
  });

  it("TOTAL: 1 (OVER) when delta strictly > threshold", () => {
    const s = snap({ minute: 66 });
    s.statistics.home.yellowCards = 3; // 1 + 3 = 4 total, baseline 2, delta 2 > 1
    s.statistics.away.yellowCards = 1;
    expect(
      yellowCardCountOver.resolve(
        { snapshot: s, openedAtMinute: 35 },
        {
          targetTeam: "TOTAL",
          thresholdCount: 1,
          windowMinutes: 30,
          openedAtMinute: 35,
          openedAtYellowCount: 2,
        }
      )
    ).toBe(1);
  });

  it("HOME-only: 2 (UNDER) when home delta NOT strictly > threshold", () => {
    const s = snap({ minute: 66 });
    s.statistics.home.yellowCards = 2; // baseline 1, delta 1 NOT > 1
    expect(
      yellowCardCountOver.resolve(
        { snapshot: s, openedAtMinute: 35 },
        {
          targetTeam: "HOME",
          thresholdCount: 1,
          windowMinutes: 30,
          openedAtMinute: 35,
          openedAtYellowCount: 1,
        }
      )
    ).toBe(2);
  });
});
