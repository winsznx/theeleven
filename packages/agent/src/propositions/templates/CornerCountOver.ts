import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Hex,
} from "viem";

import type { ResolveContext, ResolverResult, Template, TeamSide } from "../types.js";

export type CornerTarget = TeamSide | "TOTAL";

export interface CornerCountOverParams {
  targetTeam: CornerTarget;
  thresholdCount: number;
  windowMinutes: number;
  openedAtMinute: number;
  /** Baseline corner count at the moment the market was opened — see notes below. */
  openedAtCornerCount: number;
}

const PARAM_TYPES = parseAbiParameters("uint8, uint16, uint16, uint16, uint16");
const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

function targetToCode(t: CornerTarget): number {
  return t === "HOME" ? 0 : t === "AWAY" ? 1 : 2;
}
function codeToTarget(c: number): CornerTarget {
  return c === 0 ? "HOME" : c === 1 ? "AWAY" : "TOTAL";
}

/**
 * Capturing openedAtCornerCount in the encoded params lets the resolver compute
 * a WINDOW-restricted delta even though API-Football reports cumulative stats.
 * Reuse this pattern for any future stat-based templates.
 */
export const cornerCountOver: Template<CornerCountOverParams> = {
  id: keccak256(toBytes("CORNER_COUNT_OVER_v1")),
  name: "CORNER_COUNT_OVER_v1",
  description:
    "OVER if (currentCorners - openedAtCornerCount) > thresholdCount at window close; otherwise UNDER. targetTeam selects HOME, AWAY, or TOTAL.",
  requiredMinMinute: 5,
  requiredMaxMinute: 70,
  sideLabels: ["OVER", "UNDER"],

  encodeParams(params) {
    return encodeAbiParameters(PARAM_TYPES, [
      targetToCode(params.targetTeam),
      params.thresholdCount,
      params.windowMinutes,
      params.openedAtMinute,
      params.openedAtCornerCount,
    ]);
  },

  decodeParams(encoded: Hex): CornerCountOverParams {
    const [targetCode, thresholdCount, windowMinutes, openedAtMinute, openedAtCornerCount] =
      decodeAbiParameters(PARAM_TYPES, encoded);
    return {
      targetTeam: codeToTarget(Number(targetCode)),
      thresholdCount: Number(thresholdCount),
      windowMinutes: Number(windowMinutes),
      openedAtMinute: Number(openedAtMinute),
      openedAtCornerCount: Number(openedAtCornerCount),
    };
  },

  resolve(ctx: ResolveContext, params): ResolverResult {
    const elapsed = ctx.snapshot.minute - params.openedAtMinute;
    if (elapsed < params.windowMinutes && !FINAL_STATUSES.has(ctx.snapshot.status)) {
      return null;
    }
    const home = ctx.snapshot.statistics.home.cornerKicks;
    const away = ctx.snapshot.statistics.away.cornerKicks;
    const current =
      params.targetTeam === "TOTAL" ? home + away : params.targetTeam === "HOME" ? home : away;
    const delta = current - params.openedAtCornerCount;
    return delta > params.thresholdCount ? 1 : 2;
  },
};
