import type { Hex } from "viem";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../core/BaseAgent.js";
import type { MatchDelta, MatchSnapshot } from "../matches/types.js";
import {
  buildRevealedParams,
  cleanSheetRemaining,
  possessionOverPct,
  templateRegistry,
  type CleanSheetRemainingParams,
  type PossessionOverPctParams,
  type Template,
  type TeamSide,
} from "../propositions/index.js";

const SLOT_1_MIN_MINUTE = 5;
const SLOT_1_MAX_MINUTE = 15;
const SLOT_1_WINDOW_MINUTES = 30;

const SLOT_2_MIN_MINUTE = 55;
const SLOT_2_MAX_MINUTE = 70;
const SLOT_2_WINDOW_MINUTES = 10;
const SLOT_2_POSSESSION_THRESHOLD = 55;

/**
 * Il Regista — persona #0, deep playmaker. Long-window flow reads.
 *   Slot 1 (minute 5–15): CleanSheetRemaining over the next 30 minutes.
 *   Slot 2 (minute 55–70): PossessionOverPct >55% over the next 10 minutes.
 * Both slots are deterministic — no Math.random.
 */
export class IlRegista extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 0,
    name: "Il Regista",
    minMinute: 0,
    maxMinute: 90,
    maxMarketsPerMatch: 2,
    defaultMarketWindowMs: 300_000, // 5min — salt mining + RPC submit can exceed 60s on Railway's CPU
    defaultResolveWindowMs: 45 * 60_000,
  };

  async evaluate(args: {
    snapshot: MatchSnapshot;
    recentDeltas: MatchDelta[];
    marketsAlreadyOpenedThisMatch: number;
  }): Promise<ProposedMarket[]> {
    const { snapshot, marketsAlreadyOpenedThisMatch } = args;

    if (snapshot.status !== "1H" && snapshot.status !== "2H") return [];
    if (marketsAlreadyOpenedThisMatch >= this.config.maxMarketsPerMatch) return [];

    const proposals: ProposedMarket[] = [];

    // ---- Slot 1: CleanSheetRemaining (minute 5–15, ONLY if no markets yet)
    if (
      marketsAlreadyOpenedThisMatch === 0 &&
      snapshot.minute >= SLOT_1_MIN_MINUTE &&
      snapshot.minute <= SLOT_1_MAX_MINUTE
    ) {
      const targetTeam = pickLeadingSide(snapshot);
      const params: CleanSheetRemainingParams = {
        targetTeam,
        windowMinutes: SLOT_1_WINDOW_MINUTES,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._buildProposal(
          cleanSheetRemaining,
          params,
          `CleanSheet ${targetTeam} next ${SLOT_1_WINDOW_MINUTES}' (open at ${snapshot.minute}')`
        )
      );
    }

    // ---- Slot 2: PossessionOverPct (minute 55–70, ONLY if slot 1 already opened)
    if (
      marketsAlreadyOpenedThisMatch === 1 &&
      snapshot.minute >= SLOT_2_MIN_MINUTE &&
      snapshot.minute <= SLOT_2_MAX_MINUTE
    ) {
      const params: PossessionOverPctParams = {
        targetTeam: "HOME",
        thresholdPct: SLOT_2_POSSESSION_THRESHOLD,
        windowMinutes: SLOT_2_WINDOW_MINUTES,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._buildProposal(
          possessionOverPct,
          params,
          `Possession HOME >${SLOT_2_POSSESSION_THRESHOLD}% next ${SLOT_2_WINDOW_MINUTES}' (open at ${snapshot.minute}')`
        )
      );
    }

    return proposals;
  }

  async buildRevealedParams(args: { proposal: ProposedMarket }): Promise<Hex> {
    const template = templateRegistry.get(args.proposal.templateId);
    if (!template) {
      throw new Error(`Unknown templateId ${args.proposal.templateId}`);
    }
    return buildRevealedParams({ template, params: args.proposal.templateParams });
  }

  private _buildProposal<T>(
    template: Template<T>,
    params: T,
    rationale: string
  ): ProposedMarket {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return {
      templateId: template.id,
      templateParams: params,
      marketDeadline: now + BigInt(this.config.defaultMarketWindowMs / 1000),
      resolveDeadline: now + BigInt(this.config.defaultResolveWindowMs / 1000),
      rationale,
    };
  }
}

/** Side that's currently ahead; HOME wins ties (home-advantage prior). */
function pickLeadingSide(snapshot: MatchSnapshot): TeamSide {
  if (snapshot.score.homeGoals > snapshot.score.awayGoals) return "HOME";
  if (snapshot.score.awayGoals > snapshot.score.homeGoals) return "AWAY";
  return "HOME";
}
