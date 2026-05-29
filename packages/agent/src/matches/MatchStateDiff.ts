import {
  DEFAULT_DIFF_OPTIONS,
  FINAL_STATUSES,
  type DiffOptions,
  type MatchDelta,
  type MatchEvent,
  type MatchSnapshot,
  type TeamSide,
  type TeamStatistic,
} from "./types.js";

/** Stable identity for an event — used to detect "new" events vs prev snapshot. */
function eventKey(e: MatchEvent): string {
  const playerId = e.player?.id ?? "null";
  return `${e.type}|${e.minute}|${e.stoppage ?? "_"}|${e.team.id}|${playerId}|${e.detail}`;
}

function cardColor(e: MatchEvent): "YELLOW" | "RED" | null {
  const d = e.detail.toLowerCase();
  if (d.includes("yellow")) return "YELLOW";
  if (d.includes("red")) return "RED";
  return null;
}

interface NumericStatChange {
  field: keyof TeamStatistic;
  side: TeamSide;
  from: number;
  to: number;
}

function teamStatDelta(
  prev: TeamStatistic,
  curr: TeamStatistic,
  side: TeamSide,
  field: keyof TeamStatistic
): NumericStatChange | null {
  const before = Number(prev[field]);
  const after = Number(curr[field]);
  if (after > before) return { field, side, from: before, to: after };
  return null;
}

export function diffSnapshots(
  prev: MatchSnapshot | null,
  curr: MatchSnapshot,
  opts: DiffOptions = DEFAULT_DIFF_OPTIONS
): MatchDelta[] {
  const out: MatchDelta[] = [];
  const at = curr.fetchedAt;

  // Baseline rule: first snapshot. Emit STATUS_CHANGE iff we joined mid-match.
  // For "NS" / scheduled / cancelled etc., we silently establish the baseline.
  if (prev === null) {
    if (curr.status !== "NS" && curr.status !== "TBD") {
      out.push({ kind: "STATUS_CHANGE", from: "NS", to: curr.status, emittedAt: at });
    }
    return out;
  }

  // Status change
  if (prev.status !== curr.status) {
    out.push({ kind: "STATUS_CHANGE", from: prev.status, to: curr.status, emittedAt: at });
  }

  // Minute tick — only when integer minute changes (stoppage tick swallowed by design)
  if (prev.minute !== curr.minute) {
    out.push({ kind: "MINUTE_TICK", from: prev.minute, to: curr.minute, emittedAt: at });
  }

  // New events
  const seen = new Set(prev.events.map(eventKey));
  for (const e of curr.events) {
    if (seen.has(eventKey(e))) continue;
    switch (e.type) {
      case "GOAL":
        out.push({ kind: "GOAL", event: e, newScore: curr.score, emittedAt: at });
        break;
      case "CARD": {
        const color = cardColor(e);
        if (color) out.push({ kind: "CARD", event: e, color, emittedAt: at });
        break;
      }
      case "SUBSTITUTION":
        out.push({ kind: "SUBSTITUTION", event: e, emittedAt: at });
        break;
      case "VAR":
        out.push({ kind: "VAR", event: e, emittedAt: at });
        break;
    }
  }

  // Statistic increments per team
  const homeFields: Array<[keyof TeamStatistic, MatchDelta["kind"]]> = [
    ["cornerKicks", "CORNER_COUNT_INCREMENT"],
    ["shotsOnGoal", "SHOT_ON_GOAL_INCREMENT"],
    ["fouls", "FOUL_INCREMENT"],
  ];
  for (const [field, kind] of homeFields) {
    for (const side of ["HOME", "AWAY"] as const) {
      const prevStat = side === "HOME" ? prev.statistics.home : prev.statistics.away;
      const currStat = side === "HOME" ? curr.statistics.home : curr.statistics.away;
      const delta = teamStatDelta(prevStat, currStat, side, field);
      if (delta) {
        out.push({
          kind,
          team: side,
          from: delta.from,
          to: delta.to,
          emittedAt: at,
        } as MatchDelta);
      }
    }
  }

  // Possession shift — only emit when home delta meets threshold
  const homeBefore = prev.statistics.home.ballPossessionPct;
  const homeAfter = curr.statistics.home.ballPossessionPct;
  const homeDelta = homeAfter - homeBefore;
  if (Math.abs(homeDelta) >= opts.possessionShiftThresholdPct) {
    out.push({
      kind: "POSSESSION_SHIFT",
      from: { home: homeBefore, away: prev.statistics.away.ballPossessionPct },
      to: { home: homeAfter, away: curr.statistics.away.ballPossessionPct },
      homeDeltaPct: homeDelta,
      emittedAt: at,
    });
  }

  // Final whistle — transition into a terminal status
  if (!FINAL_STATUSES.has(prev.status) && FINAL_STATUSES.has(curr.status)) {
    out.push({ kind: "FINAL_WHISTLE", finalScore: curr.score, emittedAt: at });
  }

  return out;
}
