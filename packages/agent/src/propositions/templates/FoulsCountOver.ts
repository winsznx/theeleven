import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Hex,
} from "viem";

import type { ResolveContext, ResolverResult, Template, TeamSide } from "../types.js";

export type FoulsTarget = TeamSide | "TOTAL";

export interface FoulsCountOverParams {
  targetTeam: FoulsTarget;
  thresholdCount: number;
  windowMinutes: number;
  openedAtMinute: number;
  openedAtFoulsCount: number;
}

const PARAM_TYPES = parseAbiParameters("uint8, uint16, uint16, uint16, uint16");
const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

function targetToCode(t: FoulsTarget): number {
  return t === "HOME" ? 0 : t === "AWAY" ? 1 : 2;
}
function codeToTarget(c: number): FoulsTarget {
  return c === 0 ? "HOME" : c === 1 ? "AWAY" : "TOTAL";
}

export const foulsCountOver: Template<FoulsCountOverParams> = {
  id: keccak256(toBytes("FOULS_COUNT_OVER_v1")),
  name: "FOULS_COUNT_OVER_v1",
  description:
    "OVER if (currentFouls - openedAtFoulsCount) > thresholdCount at window close; otherwise UNDER.",
  requiredMinMinute: 5,
  requiredMaxMinute: 75,
  sideLabels: ["OVER", "UNDER"],

  encodeParams(params) {
    return encodeAbiParameters(PARAM_TYPES, [
      targetToCode(params.targetTeam),
      params.thresholdCount,
      params.windowMinutes,
      params.openedAtMinute,
      params.openedAtFoulsCount,
    ]);
  },

  decodeParams(encoded: Hex): FoulsCountOverParams {
    const [targetCode, thresholdCount, windowMinutes, openedAtMinute, openedAtFoulsCount] =
      decodeAbiParameters(PARAM_TYPES, encoded);
    return {
      targetTeam: codeToTarget(Number(targetCode)),
      thresholdCount: Number(thresholdCount),
      windowMinutes: Number(windowMinutes),
      openedAtMinute: Number(openedAtMinute),
      openedAtFoulsCount: Number(openedAtFoulsCount),
    };
  },

  resolve(ctx: ResolveContext, params): ResolverResult {
    const elapsed = ctx.snapshot.minute - params.openedAtMinute;
    if (elapsed < params.windowMinutes && !FINAL_STATUSES.has(ctx.snapshot.status)) {
      return null;
    }
    const home = ctx.snapshot.statistics.home.fouls;
    const away = ctx.snapshot.statistics.away.fouls;
    const current =
      params.targetTeam === "TOTAL" ? home + away : params.targetTeam === "HOME" ? home : away;
    const delta = current - params.openedAtFoulsCount;
    return delta > params.thresholdCount ? 1 : 2;
  },
};
