import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeFixtureItem,
  normalizeStatistics,
  parseStatistic,
  mergeIntoSnapshot,
} from "../../src/matches/normalize.js";
import {
  fixtureResponseSchema,
  statisticsResponseSchema,
} from "../../src/matches/schemas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX_DIR = resolve(HERE, "../fixtures/match");

function load(name: string) {
  const raw = JSON.parse(readFileSync(resolve(FIX_DIR, name), "utf8"));
  const fixture = fixtureResponseSchema.parse(raw.fixture);
  const statistics = statisticsResponseSchema.parse(raw.statistics);
  return { fixture, statistics };
}

describe("parseStatistic", () => {
  it("parses possession '55%' to 55", () => {
    const out = parseStatistic("Ball Possession", "55%");
    expect(out).toEqual({ field: "ballPossessionPct", value: 55 });
  });

  it("maps null to 0", () => {
    expect(parseStatistic("Fouls", null)).toEqual({ field: "fouls", value: 0 });
  });

  it("returns null for unknown stat types", () => {
    expect(parseStatistic("Made-Up Stat", 7)).toBeNull();
  });

  it("handles passes% similarly to possession", () => {
    expect(parseStatistic("Passes %", "83%")).toEqual({ field: "passesPct", value: 83 });
  });
});

describe("normalizeFixtureItem", () => {
  it("status NS + elapsed null → minute 0", () => {
    const { fixture } = load("0-not-started.json");
    const item = fixture.response[0]!;
    const snap = normalizeFixtureItem(item, 1_700_000_000_000);
    expect(snap.status).toBe("NS");
    expect(snap.minute).toBe(0);
    expect(snap.stoppage).toBeNull();
    expect(snap.score).toEqual({ homeGoals: 0, awayGoals: 0 });
    expect(snap.events).toEqual([]);
  });

  it("status 1H + elapsed 17 → minute 17 with one Goal event normalized", () => {
    const { fixture } = load("1-mid-first-half.json");
    const item = fixture.response[0]!;
    const snap = normalizeFixtureItem(item, 1_700_000_001_000);
    expect(snap.status).toBe("1H");
    expect(snap.minute).toBe(17);
    expect(snap.score).toEqual({ homeGoals: 1, awayGoals: 0 });
    expect(snap.events).toHaveLength(1);
    expect(snap.events[0]!.type).toBe("GOAL");
    expect(snap.events[0]!.team.id).toBe(100);
  });

  it("status FT with extra=4 + multi-event normalization", () => {
    const { fixture } = load("2-final.json");
    const item = fixture.response[0]!;
    const snap = normalizeFixtureItem(item, 1_700_000_002_000);
    expect(snap.status).toBe("FT");
    expect(snap.minute).toBe(90);
    expect(snap.stoppage).toBe(4);
    expect(snap.score).toEqual({ homeGoals: 2, awayGoals: 1 });
    expect(snap.events.map((e) => e.type)).toEqual([
      "GOAL",
      "CARD",
      "GOAL",
      "SUBSTITUTION",
      "GOAL",
      "CARD",
    ]);
  });
});

describe("normalizeStatistics + mergeIntoSnapshot", () => {
  it("possession parsed, null → 0, mapped to correct team", () => {
    const { fixture, statistics } = load("1-mid-first-half.json");
    const item = fixture.response[0]!;
    const partial = normalizeFixtureItem(item, 1_700_000_000_000);
    const stats = normalizeStatistics(statistics, partial.homeTeam, partial.awayTeam);
    expect(stats.home.ballPossessionPct).toBe(58);
    expect(stats.away.ballPossessionPct).toBe(42);
    expect(stats.away.blockedShots).toBe(0); // null in source
    expect(stats.home.cornerKicks).toBe(2);
  });

  it("empty statistics response → both teams zeroed", () => {
    const { fixture, statistics } = load("0-not-started.json");
    const item = fixture.response[0]!;
    const partial = normalizeFixtureItem(item, 1_700_000_000_000);
    const stats = normalizeStatistics(statistics, partial.homeTeam, partial.awayTeam);
    expect(stats.home.shotsOnGoal).toBe(0);
    expect(stats.away.cornerKicks).toBe(0);
  });

  it("full snapshot shape composes via mergeIntoSnapshot", () => {
    const { fixture, statistics } = load("2-final.json");
    const item = fixture.response[0]!;
    const partial = normalizeFixtureItem(item, 1_700_000_000_000);
    const stats = normalizeStatistics(statistics, partial.homeTeam, partial.awayTeam);
    const snap = mergeIntoSnapshot(partial, stats);
    expect(snap.fixtureId).toBe(1145546);
    expect(snap.statistics.home.shotsOnGoal).toBe(8);
    expect(snap.scoreBreakdown.halftime).toEqual({ homeGoals: 1, awayGoals: 0 });
    expect(snap.scoreBreakdown.fulltime).toEqual({ homeGoals: 2, awayGoals: 1 });
  });
});
