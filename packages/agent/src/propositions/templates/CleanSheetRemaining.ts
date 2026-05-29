import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Hex,
} from "viem";

import type { ResolveContext, ResolverResult, Template, TeamSide } from "../types.js";

export interface CleanSheetRemainingParams {
  targetTeam: TeamSide;
  windowMinutes: number;
  openedAtMinute: number;
}

const PARAM_TYPES = parseAbiParameters("uint8, uint16, uint16");
const TEAM_END_STATUSES = new Set(["FT", "AET", "PEN", "ABD", "CANC"]);

function teamToCode(t: TeamSide): number {
  return t === "HOME" ? 0 : 1;
}
function codeToTeam(c: number): TeamSide {
  return c === 0 ? "HOME" : "AWAY";
}

export const cleanSheetRemaining: Template<CleanSheetRemainingParams> = {
  id: keccak256(toBytes("CLEAN_SHEET_REMAINING_v1")),
  name: "CLEAN_SHEET_REMAINING_v1",
  description:
    "YES if the targetTeam concedes ZERO goals between openedAtMinute and openedAtMinute + windowMinutes; otherwise NO.",
  requiredMinMinute: 0,
  // can't open in the last 30': window won't fit before FT
  requiredMaxMinute: 60,
  sideLabels: ["YES_CLEAN_SHEET", "NO_GOAL_CONCEDED"],

  encodeParams(params) {
    return encodeAbiParameters(PARAM_TYPES, [
      teamToCode(params.targetTeam),
      params.windowMinutes,
      params.openedAtMinute,
    ]);
  },

  decodeParams(encoded: Hex): CleanSheetRemainingParams {
    const [teamCode, windowMinutes, openedAtMinute] = decodeAbiParameters(
      PARAM_TYPES,
      encoded
    );
    return {
      targetTeam: codeToTeam(Number(teamCode)),
      windowMinutes: Number(windowMinutes),
      openedAtMinute: Number(openedAtMinute),
    };
  },

  resolve(ctx: ResolveContext, params): ResolverResult {
    const elapsed = ctx.snapshot.minute - params.openedAtMinute;
    const windowClosed =
      elapsed >= params.windowMinutes || TEAM_END_STATUSES.has(ctx.snapshot.status);
    if (!windowClosed) return null;

    const opponentTeamId =
      params.targetTeam === "HOME"
        ? ctx.snapshot.awayTeam.id
        : ctx.snapshot.homeTeam.id;

    const windowEnd = params.openedAtMinute + params.windowMinutes;
    const goalsAgainst = ctx.snapshot.events.filter(
      (e) =>
        e.type === "GOAL" &&
        e.minute >= params.openedAtMinute &&
        e.minute <= windowEnd &&
        e.team.id === opponentTeamId
    );

    return goalsAgainst.length === 0 ? 1 : 2;
  },
};
