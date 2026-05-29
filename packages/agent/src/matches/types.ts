export type FixtureStatus =
  | "TBD"
  | "NS"
  | "1H"
  | "HT"
  | "2H"
  | "ET"
  | "BT"
  | "P"
  | "SUSP"
  | "INT"
  | "FT"
  | "AET"
  | "PEN"
  | "PST"
  | "CANC"
  | "ABD"
  | "AWD"
  | "WO"
  | "LIVE";

/** Set of statuses considered "live" — used by the poller + diff baseline. */
export const LIVE_STATUSES = new Set<FixtureStatus>([
  "1H",
  "2H",
  "HT",
  "ET",
  "BT",
  "P",
  "LIVE",
  "SUSP",
  "INT",
]);

/** Terminal statuses for a finished match. */
export const FINAL_STATUSES = new Set<FixtureStatus>(["FT", "AET", "PEN"]);

export interface Score {
  homeGoals: number;
  awayGoals: number;
}

export interface Team {
  id: number;
  name: string;
}

export type EventType = "GOAL" | "CARD" | "SUBSTITUTION" | "VAR";

export interface MatchEvent {
  type: EventType;
  detail: string;
  minute: number;
  stoppage: number | null;
  team: Team;
  player: { id: number | null; name: string } | null;
  assist: { id: number | null; name: string } | null;
  comments: string | null;
}

/**
 * One team's stats at the snapshot moment. API-Football returns `null` for
 * any stat not yet recorded — by convention those normalize to `0` here.
 * `ballPossessionPct` + `passesPct` are parsed from the upstream "55%" string.
 */
export interface TeamStatistic {
  team: Team;
  shotsOnGoal: number;
  shotsOffGoal: number;
  shotsInsidebox: number;
  shotsOutsidebox: number;
  totalShots: number;
  blockedShots: number;
  fouls: number;
  cornerKicks: number;
  offsides: number;
  ballPossessionPct: number;
  yellowCards: number;
  redCards: number;
  goalkeeperSaves: number;
  totalPasses: number;
  passesAccurate: number;
  passesPct: number;
}

export function emptyTeamStatistic(team: Team): TeamStatistic {
  return {
    team,
    shotsOnGoal: 0,
    shotsOffGoal: 0,
    shotsInsidebox: 0,
    shotsOutsidebox: 0,
    totalShots: 0,
    blockedShots: 0,
    fouls: 0,
    cornerKicks: 0,
    offsides: 0,
    ballPossessionPct: 0,
    yellowCards: 0,
    redCards: 0,
    goalkeeperSaves: 0,
    totalPasses: 0,
    passesAccurate: 0,
    passesPct: 0,
  };
}

export interface ScoreBreakdown {
  halftime: Score | null;
  fulltime: Score | null;
  extratime: Score | null;
  penalty: Score | null;
}

export interface MatchSnapshot {
  fixtureId: number;
  /** unix ms when this snapshot was assembled */
  fetchedAt: number;
  status: FixtureStatus;
  /** elapsed minute, 0 when not started */
  minute: number;
  /** injury time minutes, null when not in stoppage */
  stoppage: number | null;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  scoreBreakdown: ScoreBreakdown;
  events: MatchEvent[];
  statistics: {
    home: TeamStatistic;
    away: TeamStatistic;
  };
}

export type TeamSide = "HOME" | "AWAY";

export type MatchDelta =
  | { kind: "STATUS_CHANGE"; from: FixtureStatus; to: FixtureStatus; emittedAt: number }
  | { kind: "MINUTE_TICK"; from: number; to: number; emittedAt: number }
  | { kind: "GOAL"; event: MatchEvent; newScore: Score; emittedAt: number }
  | { kind: "CARD"; event: MatchEvent; color: "YELLOW" | "RED"; emittedAt: number }
  | { kind: "SUBSTITUTION"; event: MatchEvent; emittedAt: number }
  | { kind: "VAR"; event: MatchEvent; emittedAt: number }
  | { kind: "CORNER_COUNT_INCREMENT"; team: TeamSide; from: number; to: number; emittedAt: number }
  | { kind: "SHOT_ON_GOAL_INCREMENT"; team: TeamSide; from: number; to: number; emittedAt: number }
  | { kind: "FOUL_INCREMENT"; team: TeamSide; from: number; to: number; emittedAt: number }
  | {
      kind: "POSSESSION_SHIFT";
      from: { home: number; away: number };
      to: { home: number; away: number };
      homeDeltaPct: number;
      emittedAt: number;
    }
  | { kind: "FINAL_WHISTLE"; finalScore: Score; emittedAt: number };

export interface DiffOptions {
  /** minimum absolute %-point change in home possession to emit POSSESSION_SHIFT */
  possessionShiftThresholdPct: number;
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  possessionShiftThresholdPct: 3,
};
