import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Hex,
} from "viem";

import type { ResolveContext, ResolverResult, Template, TeamSide } from "../types.js";

export interface PossessionOverPctParams {
  targetTeam: TeamSide;
  thresholdPct: number;
  windowMinutes: number;
  openedAtMinute: number;
}

const PARAM_TYPES = parseAbiParameters("uint8, uint8, uint16, uint16");
const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

function teamToCode(t: TeamSide): number {
  return t === "HOME" ? 0 : 1;
}
function codeToTeam(c: number): TeamSide {
  return c === 0 ? "HOME" : "AWAY";
}

/**
 * KNOWN LIMITATION: API-Football reports cumulative-match possession %, not
 * window-restricted. P11 uses the cumulative reading at window-close as a
 * flow proxy. A future template can read a pre-window snapshot and compute
 * window-restricted possession from the passes-attempted delta.
 */
export const possessionOverPct: Template<PossessionOverPctParams> = {
  id: keccak256(toBytes("POSSESSION_OVER_PCT_v1")),
  name: "POSSESSION_OVER_PCT_v1",
  description:
    "OVER if targetTeam's cumulative possession % strictly exceeds thresholdPct at openedAtMinute + windowMinutes; otherwise UNDER.",
  requiredMinMinute: 30,
  requiredMaxMinute: 75,
  sideLabels: ["OVER", "UNDER"],

  encodeParams(params) {
    return encodeAbiParameters(PARAM_TYPES, [
      teamToCode(params.targetTeam),
      params.thresholdPct,
      params.windowMinutes,
      params.openedAtMinute,
    ]);
  },

  decodeParams(encoded: Hex): PossessionOverPctParams {
    const [teamCode, thresholdPct, windowMinutes, openedAtMinute] = decodeAbiParameters(
      PARAM_TYPES,
      encoded
    );
    return {
      targetTeam: codeToTeam(Number(teamCode)),
      thresholdPct: Number(thresholdPct),
      windowMinutes: Number(windowMinutes),
      openedAtMinute: Number(openedAtMinute),
    };
  },

  resolve(ctx: ResolveContext, params): ResolverResult {
    const elapsed = ctx.snapshot.minute - params.openedAtMinute;
    if (elapsed < params.windowMinutes && !FINAL_STATUSES.has(ctx.snapshot.status)) {
      return null;
    }
    const teamStats =
      params.targetTeam === "HOME" ? ctx.snapshot.statistics.home : ctx.snapshot.statistics.away;
    return teamStats.ballPossessionPct > params.thresholdPct ? 1 : 2;
  },
};
