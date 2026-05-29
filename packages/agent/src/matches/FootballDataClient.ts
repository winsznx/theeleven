/**
 * Football-Data.org (https://www.football-data.org) client. Alternative
 * to ApiFootballClient — same `fetchSnapshot(id)` shape so MatchPoller
 * can swap providers without knowing which one is on.
 *
 * Tradeoffs vs api-football:
 *   - 10 req/min free tier, NO daily cap. (api-football free was 100/day.)
 *   - One endpoint per match returns goals + bookings + subs inline (we
 *     only need ONE call, vs api-football's two parallel calls).
 *   - Covers ~12 top-tier competitions only (PL/PD/SA/BL1/FL1/CL/SA/etc.
 *     plus Brazilian Série A, Eredivisie, Championship, Primeira Liga,
 *     Copa Libertadores, World Cup, Euros). Smaller match catalog than
 *     api-football's "every match on earth."
 *   - NO statistics endpoint (no shots/possession/corners etc.). Persona
 *     templates that need rich stats (CornerCount, ShotsOnTarget) won't
 *     trigger on this source; goal/card-based templates (NextGoal,
 *     CleanSheet, YellowCards) will.
 *
 * Rate-limit etiquette: the API returns `x-requests-available-minute` +
 * `x-requestcounter-reset` headers. We log and self-throttle when the
 * counter dips low.
 */

import type { Logger } from "pino";

import {
  ApiFootballError,
  RateLimitedError,
} from "./errors.js";
import {
  emptyTeamStatistic,
  type FixtureStatus,
  type MatchEvent,
  type MatchSnapshot,
  type Score,
  type ScoreBreakdown,
  type Team,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.football-data.org";
const DEFAULT_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [500, 2_000, 5_000] as const;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface FootballDataClientOptions {
  apiKey: string;
  baseUrl?: string;
  logger?: Logger;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
}

/** Raw match shape we read from /v4/matches/{id}.
 *  Only the fields we actually consume — anything we don't read is
 *  allowed to be present and unannotated. */
interface RawMatch {
  id: number;
  utcDate: string;
  status:
    | "SCHEDULED"
    | "TIMED"
    | "IN_PLAY"
    | "PAUSED"
    | "FINISHED"
    | "SUSPENDED"
    | "POSTPONED"
    | "CANCELLED"
    | "AWARDED";
  minute: number | null;
  injuryTime: number | null;
  homeTeam: { id: number; name: string; shortName?: string };
  awayTeam: { id: number; name: string; shortName?: string };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  goals?: Array<{
    minute: number;
    injuryTime: number | null;
    type: "REGULAR" | "PENALTY" | "OWN" | string;
    team: { id: number; name: string };
    scorer: { id: number | null; name: string } | null;
    assist: { id: number | null; name: string } | null;
  }>;
  bookings?: Array<{
    minute: number;
    team: { id: number; name: string };
    player: { id: number | null; name: string } | null;
    card: "YELLOW" | "RED" | string;
  }>;
  substitutions?: Array<{
    minute: number;
    team: { id: number; name: string };
    playerOut: { id: number | null; name: string } | null;
    playerIn: { id: number | null; name: string } | null;
  }>;
}

export class FootballDataClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger: Logger | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleepImpl: (ms: number) => Promise<void>;

  constructor(opts: FootballDataClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.logger = opts.logger;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleepImpl = opts.sleepImpl ?? defaultSleep;
  }

  /** Same return type as ApiFootballClient.fetchSnapshot — MatchPoller
   *  consumes either interchangeably. */
  async fetchSnapshot(id: number): Promise<MatchSnapshot> {
    const raw = await this.getMatch(id);
    return this.toSnapshot(raw);
  }

  private async getMatch(id: number): Promise<RawMatch> {
    const path = `/v4/matches/${id}`;
    const url = `${this.baseUrl}${path}`;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const raw = (await this.fetchOnce(url)) as unknown;
        // Minimal shape guard. We don't run zod here to keep the dep
        // surface small — the field reads below check existence inline.
        if (!raw || typeof raw !== "object" || !("id" in raw)) {
          throw new ApiFootballError(
            `football-data: unexpected shape for ${path}`,
            { status: 200, bodyExcerpt: JSON.stringify(raw).slice(0, 500) },
          );
        }
        return raw as RawMatch;
      } catch (err) {
        lastErr = err;
        const retryable =
          (err instanceof ApiFootballError && err.status >= 500) ||
          err instanceof TypeError ||
          (err instanceof Error && err.name === "AbortError");
        if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw err;
        const delay = RETRY_DELAYS_MS[attempt]!;
        this.logger?.warn(
          { url, attempt: attempt + 1, delay },
          "football-data retrying",
        );
        await this.sleepImpl(delay);
      }
    }
    throw lastErr;
  }

  private async fetchOnce(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, {
        headers: { "X-Auth-Token": this.apiKey, accept: "application/json" },
        signal: controller.signal,
      });

      // Log the budget headers so an operator can see the throttle state.
      const remaining = res.headers.get("x-requests-available-minute");
      const resetIn = res.headers.get("x-requestcounter-reset");
      if (remaining !== null) {
        const remainingN = Number(remaining);
        this.logger?.debug(
          { url, remainingPerMinute: remainingN, resetInSeconds: resetIn },
          "football-data: rate budget",
        );
        // Self-throttle when we dip to ≤1 remaining — sleep until reset.
        if (remainingN <= 1 && resetIn) {
          const sleepMs = (Number(resetIn) + 1) * 1000;
          this.logger?.info(
            { url, sleepMs, remainingPerMinute: remainingN },
            "football-data: throttle proactively",
          );
          await this.sleepImpl(sleepMs);
        }
      }

      if (res.status === 429) {
        const body = await safeText(res);
        throw new RateLimitedError(`rate limited at ${url}`, {
          retryAfterSeconds: resetIn ? Number(resetIn) : null,
          bodyExcerpt: body.slice(0, 500),
        });
      }
      if (!res.ok) {
        const body = await safeText(res);
        throw new ApiFootballError(`HTTP ${res.status} from ${url}`, {
          status: res.status,
          bodyExcerpt: body.slice(0, 500),
        });
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Map a Football-Data /v4/matches/{id} payload into the agent's
   *  internal MatchSnapshot shape so MatchPoller can consume it. */
  private toSnapshot(m: RawMatch): MatchSnapshot {
    const fetchedAt = Date.now();
    const home: Team = { id: m.homeTeam.id, name: m.homeTeam.name };
    const away: Team = { id: m.awayTeam.id, name: m.awayTeam.name };

    const minute = Math.max(0, m.minute ?? 0);
    const status = mapStatus(m.status, minute);

    const homeGoals = m.score.fullTime.home ?? 0;
    const awayGoals = m.score.fullTime.away ?? 0;
    const score: Score = { homeGoals, awayGoals };

    const halftime: Score | null =
      m.score.halfTime.home === null || m.score.halfTime.away === null
        ? null
        : { homeGoals: m.score.halfTime.home, awayGoals: m.score.halfTime.away };
    // Football-Data only exposes fullTime + halfTime at this endpoint;
    // extratime / penalty are absent. Personas that care about ET treat
    // null as "not in extra time," which is what we want.
    const scoreBreakdown: ScoreBreakdown = {
      halftime,
      fulltime:
        status === "FT"
          ? { homeGoals, awayGoals }
          : null,
      extratime: null,
      penalty: null,
    };

    const events: MatchEvent[] = [];
    for (const g of m.goals ?? []) {
      const team: Team = { id: g.team.id, name: g.team.name };
      events.push({
        type: "GOAL",
        detail: g.type === "PENALTY" ? "PENALTY" : "NORMAL_GOAL",
        minute: g.minute,
        stoppage: g.injuryTime,
        team,
        player: g.scorer,
        assist: g.assist,
        comments: null,
      });
    }
    for (const b of m.bookings ?? []) {
      events.push({
        type: "CARD",
        detail: b.card,
        minute: b.minute,
        stoppage: null,
        team: { id: b.team.id, name: b.team.name },
        player: b.player,
        assist: null,
        comments: null,
      });
    }
    for (const s of m.substitutions ?? []) {
      events.push({
        type: "SUBSTITUTION",
        detail: "SUBSTITUTION",
        minute: s.minute,
        stoppage: null,
        team: { id: s.team.id, name: s.team.name },
        player: s.playerOut,
        assist: s.playerIn,
        comments: null,
      });
    }
    // Sort chronologically so MatchStateDiff diffing is deterministic.
    events.sort((a, b) => a.minute - b.minute);

    return {
      fixtureId: m.id,
      fetchedAt,
      status,
      minute,
      stoppage: m.injuryTime,
      homeTeam: home,
      awayTeam: away,
      score,
      scoreBreakdown,
      events,
      // Football-Data has no per-team statistics endpoint at this tier —
      // personas that read these get zeroed stats, which matches the
      // emptyTeamStatistic convention used elsewhere.
      statistics: {
        home: emptyTeamStatistic(home),
        away: emptyTeamStatistic(away),
      },
    };
  }
}

/** Football-Data uses one IN_PLAY status for both halves. We split on
 *  minute to populate the agent's "1H" / "2H" / "ET" enum. */
function mapStatus(
  s: RawMatch["status"],
  minute: number,
): FixtureStatus {
  switch (s) {
    case "IN_PLAY":
      if (minute > 90) return "ET";
      if (minute >= 45) return "2H";
      return "1H";
    case "PAUSED":
      return "HT";
    case "FINISHED":
      return "FT";
    case "POSTPONED":
      return "PST";
    case "CANCELLED":
      return "CANC";
    case "SUSPENDED":
      return "SUSP";
    case "AWARDED":
      return "AWD";
    case "TIMED":
    case "SCHEDULED":
    default:
      return "TBD";
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
