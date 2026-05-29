import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Hex,
} from "viem";

import type { ResolveContext, ResolverResult, Template, TeamSide } from "../types.js";

export type ShotsTarget = TeamSide | "TOTAL";

export interface ShotsOnTargetOverParams {
  targetTeam: ShotsTarget;
  thresholdCount: number;
  windowMinutes: number;
  openedAtMinute: number;
  openedAtShotsCount: number;
}

const PARAM_TYPES = parseAbiParameters("uint8, uint16, uint16, uint16, uint16");
const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

function targetToCode(t: ShotsTarget): number {
  return t === "HOME" ? 0 : t === "AWAY" ? 1 : 2;
}
function codeToTarget(c: number): ShotsTarget {
  return c === 0 ? "HOME" : c === 1 ? "AWAY" : "TOTAL";
}

/** Mirrors CornerCountOver's baseline-in-params recipe (window-restricted delta). */
export const shotsOnTargetOver: Template<ShotsOnTargetOverParams> = {
  id: keccak256(toBytes("SHOTS_ON_TARGET_OVER_v1")),
  name: "SHOTS_ON_TARGET_OVER_v1",
  description:
    "OVER if (currentShotsOnGoal - openedAtShotsCount) > thresholdCount at window close; otherwise UNDER.",
  requiredMinMinute: 5,
  requiredMaxMinute: 75,
  sideLabels: ["OVER", "UNDER"],

  encodeParams(params) {
    return encodeAbiParameters(PARAM_TYPES, [
      targetToCode(params.targetTeam),
      params.thresholdCount,
      params.windowMinutes,
      params.openedAtMinute,
      params.openedAtShotsCount,
    ]);
  },

  decodeParams(encoded: Hex): ShotsOnTargetOverParams {
    const [targetCode, thresholdCount, windowMinutes, openedAtMinute, openedAtShotsCount] =
      decodeAbiParameters(PARAM_TYPES, encoded);
    return {
      targetTeam: codeToTarget(Number(targetCode)),
      thresholdCount: Number(thresholdCount),
      windowMinutes: Number(windowMinutes),
      openedAtMinute: Number(openedAtMinute),
      openedAtShotsCount: Number(openedAtShotsCount),
    };
  },

  resolve(ctx: ResolveContext, params): ResolverResult {
    const elapsed = ctx.snapshot.minute - params.openedAtMinute;
    if (elapsed < params.windowMinutes && !FINAL_STATUSES.has(ctx.snapshot.status)) {
      return null;
    }
    const home = ctx.snapshot.statistics.home.shotsOnGoal;
    const away = ctx.snapshot.statistics.away.shotsOnGoal;
    const current =
      params.targetTeam === "TOTAL" ? home + away : params.targetTeam === "HOME" ? home : away;
    const delta = current - params.openedAtShotsCount;
    return delta > params.thresholdCount ? 1 : 2;
  },
};
