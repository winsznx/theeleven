import type { RawFixtureItem, RawStatsResponse, RawEvent } from "./schemas.js";
import {
  emptyTeamStatistic,
  type FixtureStatus,
  type MatchEvent,
  type MatchSnapshot,
  type Score,
  type Team,
  type TeamStatistic,
} from "./types.js";

const STATUS_CODES: ReadonlySet<FixtureStatus> = new Set<FixtureStatus>([
  "TBD",
  "NS",
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "SUSP",
  "INT",
  "FT",
  "AET",
  "PEN",
  "PST",
  "CANC",
  "ABD",
  "AWD",
  "WO",
  "LIVE",
]);

function coerceStatus(short: string): FixtureStatus {
  if (STATUS_CODES.has(short as FixtureStatus)) return short as FixtureStatus;
  throw new Error(`unknown fixture status code: ${short}`);
}

function mapEventType(raw: string): MatchEvent["type"] | null {
  const t = raw.trim().toLowerCase();
  if (t === "goal") return "GOAL";
  if (t === "card") return "CARD";
  if (t === "subst" || t === "substitution") return "SUBSTITUTION";
  if (t === "var") return "VAR";
  return null;
}

function normalizeEvent(raw: RawEvent): MatchEvent | null {
  const type = mapEventType(raw.type);
  if (!type) return null;
  return {
    type,
    detail: raw.detail,
    minute: raw.time.elapsed ?? 0,
    stoppage: raw.time.extra ?? null,
    team: { id: raw.team.id, name: raw.team.name },
    player: raw.player
      ? { id: raw.player.id, name: raw.player.name ?? "" }
      : null,
    assist: raw.assist
      ? { id: raw.assist.id ?? null, name: raw.assist.name ?? "" }
      : null,
    comments: raw.comments ?? null,
  };
}

export interface PartialFixtureSnapshot {
  fixtureId: number;
  fetchedAt: number;
  status: FixtureStatus;
  minute: number;
  stoppage: number | null;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  scoreBreakdown: MatchSnapshot["scoreBreakdown"];
  events: MatchEvent[];
}

export function normalizeFixtureItem(
  item: RawFixtureItem,
  fetchedAt: number
): PartialFixtureSnapshot {
  const status = coerceStatus(item.fixture.status.short);
  const homeTeam: Team = { id: item.teams.home.id, name: item.teams.home.name };
  const awayTeam: Team = { id: item.teams.away.id, name: item.teams.away.name };
  const events = (item.events ?? []).map(normalizeEvent).filter((e): e is MatchEvent => e !== null);

  const score: Score = {
    homeGoals: item.goals.home ?? 0,
    awayGoals: item.goals.away ?? 0,
  };
  const scoreBreakdown: MatchSnapshot["scoreBreakdown"] = {
    halftime: nullableScore(item.score.halftime),
    fulltime: nullableScore(item.score.fulltime),
    extratime: nullableScore(item.score.extratime),
    penalty: nullableScore(item.score.penalty),
  };

  return {
    fixtureId: item.fixture.id,
    fetchedAt,
    status,
    minute: item.fixture.status.elapsed ?? 0,
    stoppage: item.fixture.status.extra ?? null,
    homeTeam,
    awayTeam,
    score,
    scoreBreakdown,
    events,
  };
}

function nullableScore(s: { home: number | null; away: number | null }): Score | null {
  if (s.home === null && s.away === null) return null;
  return { homeGoals: s.home ?? 0, awayGoals: s.away ?? 0 };
}

const STAT_TYPE_MAP: Record<string, keyof Omit<TeamStatistic, "team">> = {
  "Shots on Goal": "shotsOnGoal",
  "Shots off Goal": "shotsOffGoal",
  "Shots insidebox": "shotsInsidebox",
  "Shots outsidebox": "shotsOutsidebox",
  "Total Shots": "totalShots",
  "Blocked Shots": "blockedShots",
  Fouls: "fouls",
  "Corner Kicks": "cornerKicks",
  Offsides: "offsides",
  "Ball Possession": "ballPossessionPct",
  "Yellow Cards": "yellowCards",
  "Red Cards": "redCards",
  "Goalkeeper Saves": "goalkeeperSaves",
  "Total passes": "totalPasses",
  "Passes accurate": "passesAccurate",
  "Passes %": "passesPct",
};

export function parseStatistic(type: string, value: unknown): {
  field: keyof Omit<TeamStatistic, "team">;
  value: number;
} | null {
  const field = STAT_TYPE_MAP[type];
  if (!field) return null;
  if (value === null || value === undefined) return { field, value: 0 };
  if (typeof value === "number") return { field, value };
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return { field, value: 0 };
    const numeric = Number(trimmed.replace(/%$/, ""));
    if (!Number.isFinite(numeric)) return { field, value: 0 };
    return { field, value: numeric };
  }
  return { field, value: 0 };
}

export function normalizeStatistics(
  raw: RawStatsResponse,
  homeTeam: Team,
  awayTeam: Team
): { home: TeamStatistic; away: TeamStatistic } {
  const home = emptyTeamStatistic(homeTeam);
  const away = emptyTeamStatistic(awayTeam);

  for (const item of raw.response) {
    const target = item.team.id === homeTeam.id ? home : item.team.id === awayTeam.id ? away : null;
    if (!target) continue;
    target.team = { id: item.team.id, name: item.team.name };
    for (const s of item.statistics) {
      const parsed = parseStatistic(s.type, s.value);
      if (parsed) (target as unknown as Record<string, number>)[parsed.field] = parsed.value;
    }
  }
  return { home, away };
}

export function mergeIntoSnapshot(
  fixture: PartialFixtureSnapshot,
  statistics: { home: TeamStatistic; away: TeamStatistic }
): MatchSnapshot {
  return {
    fixtureId: fixture.fixtureId,
    fetchedAt: fixture.fetchedAt,
    status: fixture.status,
    minute: fixture.minute,
    stoppage: fixture.stoppage,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    score: fixture.score,
    scoreBreakdown: fixture.scoreBreakdown,
    events: fixture.events,
    statistics,
  };
}
