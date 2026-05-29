import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Hex,
} from "viem";

import type { ResolveContext, ResolverResult, Template } from "../types.js";

export interface NextGoalHomeAwayParams {
  windowMinutes: number;
  openedAtMinute: number;
}

const PARAM_TYPES = parseAbiParameters("uint16, uint16");
const TERMINAL_STATUSES = new Set(["FT", "AET", "PEN", "ABD", "CANC"]);

/**
 * Event-based proposition. Resolves to the side of the FIRST goal scored in
 * (openedAtMinute, openedAtMinute + windowMinutes].
 *
 * REFUND-PATH SEMANTICS: when the window closes (or the match terminates)
 * WITHOUT any goal in-window, resolve() returns `null` permanently. The
 * market then has no binary outcome; the on-chain resolveDeadline will lapse
 * and PropMarketHook.refund() returns stakes to both sides. Document this
 * for any future automation that wraps this template.
 */
export const nextGoalHomeAway: Template<NextGoalHomeAwayParams> = {
  id: keccak256(toBytes("NEXT_GOAL_HOME_AWAY_v1")),
  name: "NEXT_GOAL_HOME_AWAY_v1",
  description:
    "HOME_SCORES_FIRST (1) or AWAY_SCORES_FIRST (2) within (openedAt, openedAt + windowMinutes]. No goal in window → null (refund path).",
  requiredMinMinute: 0,
  requiredMaxMinute: 80,
  sideLabels: ["HOME_SCORES_FIRST", "AWAY_SCORES_FIRST"],

  encodeParams(params) {
    return encodeAbiParameters(PARAM_TYPES, [params.windowMinutes, params.openedAtMinute]);
  },

  decodeParams(encoded: Hex): NextGoalHomeAwayParams {
    const [windowMinutes, openedAtMinute] = decodeAbiParameters(PARAM_TYPES, encoded);
    return {
      windowMinutes: Number(windowMinutes),
      openedAtMinute: Number(openedAtMinute),
    };
  },

  resolve(ctx: ResolveContext, params): ResolverResult {
    const elapsed = ctx.snapshot.minute - params.openedAtMinute;
    const windowClosed =
      elapsed >= params.windowMinutes || TERMINAL_STATUSES.has(ctx.snapshot.status);
    if (!windowClosed) return null;

    const windowEnd = params.openedAtMinute + params.windowMinutes;
    const goals = ctx.snapshot.events
      .filter(
        (e) =>
          e.type === "GOAL" && e.minute > params.openedAtMinute && e.minute <= windowEnd
      )
      .sort(
        (a, b) =>
          a.minute - b.minute || (a.stoppage ?? 0) - (b.stoppage ?? 0)
      );

    if (goals.length === 0) return null; // refund path
    return goals[0]!.team.id === ctx.snapshot.homeTeam.id ? 1 : 2;
  },
};
