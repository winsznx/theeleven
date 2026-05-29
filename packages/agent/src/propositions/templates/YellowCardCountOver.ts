import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Hex,
} from "viem";

import type { ResolveContext, ResolverResult, Template, TeamSide } from "../types.js";

export type YellowCardTarget = TeamSide | "TOTAL";

export interface YellowCardCountOverParams {
  targetTeam: YellowCardTarget;
  thresholdCount: number;
  windowMinutes: number;
  openedAtMinute: number;
  openedAtYellowCount: number;
}

const PARAM_TYPES = parseAbiParameters("uint8, uint16, uint16, uint16, uint16");
const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

function targetToCode(t: YellowCardTarget): number {
  return t === "HOME" ? 0 : t === "AWAY" ? 1 : 2;
}
function codeToTarget(c: number): YellowCardTarget {
  return c === 0 ? "HOME" : c === 1 ? "AWAY" : "TOTAL";
}

export const yellowCardCountOver: Template<YellowCardCountOverParams> = {
  id: keccak256(toBytes("YELLOW_CARD_COUNT_OVER_v1")),
  name: "YELLOW_CARD_COUNT_OVER_v1",
  description:
    "OVER if (currentYellowCards - openedAtYellowCount) > thresholdCount at window close; otherwise UNDER.",
  requiredMinMinute: 5,
  requiredMaxMinute: 75,
  sideLabels: ["OVER", "UNDER"],

  encodeParams(params) {
    return encodeAbiParameters(PARAM_TYPES, [
      targetToCode(params.targetTeam),
      params.thresholdCount,
      params.windowMinutes,
      params.openedAtMinute,
      params.openedAtYellowCount,
    ]);
  },

  decodeParams(encoded: Hex): YellowCardCountOverParams {
    const [targetCode, thresholdCount, windowMinutes, openedAtMinute, openedAtYellowCount] =
      decodeAbiParameters(PARAM_TYPES, encoded);
    return {
      targetTeam: codeToTarget(Number(targetCode)),
      thresholdCount: Number(thresholdCount),
      windowMinutes: Number(windowMinutes),
      openedAtMinute: Number(openedAtMinute),
      openedAtYellowCount: Number(openedAtYellowCount),
    };
  },

  resolve(ctx: ResolveContext, params): ResolverResult {
    const elapsed = ctx.snapshot.minute - params.openedAtMinute;
    if (elapsed < params.windowMinutes && !FINAL_STATUSES.has(ctx.snapshot.status)) {
      return null;
    }
    const home = ctx.snapshot.statistics.home.yellowCards;
    const away = ctx.snapshot.statistics.away.yellowCards;
    const current =
      params.targetTeam === "TOTAL" ? home + away : params.targetTeam === "HOME" ? home : away;
    const delta = current - params.openedAtYellowCount;
    return delta > params.thresholdCount ? 1 : 2;
  },
};
