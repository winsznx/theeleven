import { describe, it, expect } from "vitest";

import { cleanSheetRemaining } from "../../../src/propositions/templates/CleanSheetRemaining.js";
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

describe("CleanSheetRemaining", () => {
  it("id is the locked keccak256(utf8('CLEAN_SHEET_REMAINING_v1'))", () => {
    expect(cleanSheetRemaining.id).toBe(
      "0xb492fc4cc821cf5c27278ec64016c366da3b3a1db6b84df676350cc572f3ba96"
    );
  });

  it("encodeParams → decodeParams round-trip", () => {
    const params = { targetTeam: "HOME" as const, windowMinutes: 30, openedAtMinute: 10 };
    const encoded = cleanSheetRemaining.encodeParams(params);
    expect(cleanSheetRemaining.decodeParams(encoded)).toEqual(params);
  });

  it("resolve returns null while window still open", () => {
    const params = { targetTeam: "HOME" as const, windowMinutes: 30, openedAtMinute: 10 };
    const r = cleanSheetRemaining.resolve({ snapshot: snap({ minute: 15 }), openedAtMinute: 10 }, params);
    expect(r).toBeNull();
  });

  it("resolve returns 1 (YES_CLEAN_SHEET) when no opponent goals in window", () => {
    const params = { targetTeam: "HOME" as const, windowMinutes: 30, openedAtMinute: 10 };
    const r = cleanSheetRemaining.resolve(
      { snapshot: snap({ minute: 45, status: "1H", events: [] }), openedAtMinute: 10 },
      params
    );
    expect(r).toBe(1);
  });

  it("resolve returns 2 (NO_GOAL_CONCEDED) when opponent goal in window", () => {
    const params = { targetTeam: "HOME" as const, windowMinutes: 30, openedAtMinute: 10 };
    const r = cleanSheetRemaining.resolve(
      {
        snapshot: snap({
          minute: 45,
          events: [
            {
              type: "GOAL",
              detail: "Normal Goal",
              minute: 25,
              stoppage: null,
              team: AWAY,
              player: { id: 1, name: "X" },
              assist: null,
              comments: null,
            },
          ],
        }),
        openedAtMinute: 10,
      },
      params
    );
    expect(r).toBe(2);
  });

  it("HOME target ignores HOME goals (only counts AWAY scoring)", () => {
    const params = { targetTeam: "HOME" as const, windowMinutes: 30, openedAtMinute: 10 };
    const r = cleanSheetRemaining.resolve(
      {
        snapshot: snap({
          minute: 45,
          events: [
            {
              type: "GOAL",
              detail: "Normal Goal",
              minute: 25,
              stoppage: null,
              team: HOME, // HOME scoring doesn't break HOME's clean sheet
              player: { id: 1, name: "X" },
              assist: null,
              comments: null,
            },
          ],
        }),
        openedAtMinute: 10,
      },
      params
    );
    expect(r).toBe(1);
  });

  it("AWAY target only counts HOME goals", () => {
    const params = { targetTeam: "AWAY" as const, windowMinutes: 30, openedAtMinute: 10 };
    const r = cleanSheetRemaining.resolve(
      {
        snapshot: snap({
          minute: 45,
          events: [
            {
              type: "GOAL",
              detail: "Normal Goal",
              minute: 22,
              stoppage: null,
              team: HOME,
              player: { id: 1, name: "X" },
              assist: null,
              comments: null,
            },
          ],
        }),
        openedAtMinute: 10,
      },
      params
    );
    expect(r).toBe(2);
  });

  it("treats FT as window-closed even when elapsed < windowMinutes", () => {
    const params = { targetTeam: "HOME" as const, windowMinutes: 30, openedAtMinute: 80 };
    // openedAt 80, FT at minute 90 — elapsed = 10 < 30, but status FT → resolvable
    const r = cleanSheetRemaining.resolve(
      { snapshot: snap({ minute: 90, status: "FT", events: [] }), openedAtMinute: 80 },
      params
    );
    expect(r).toBe(1);
  });
});
