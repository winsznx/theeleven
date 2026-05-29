import type { Hex } from "viem";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../core/BaseAgent.js";
import type { MatchDelta, MatchSnapshot } from "../matches/types.js";
import {
  buildRevealedParams,
  nextGoalHomeAway,
  possessionOverPct,
  shotsOnTargetOver,
  templateRegistry,
  type NextGoalHomeAwayParams,
  type PossessionOverPctParams,
  type ShotsOnTargetOverParams,
  type Template,
} from "../propositions/index.js";

const ACTIVE_STATUSES = new Set(["1H", "2H", "ET"]);

/**
 * Il Falso Nove — persona #3, false nine. Attacking drift reads — HOME
 * focus, fewer/cleaner signals than Trequartista (one shot, one possession
 * read, one goal call). 3 slots, deterministic.
 *   Slot 1 (15–25'): ShotsOnTargetOver HOME >1 next 15'
 *   Slot 2 (40–50'): PossessionOverPct HOME >55%  next 15'
 *   Slot 3 (65–75'): NextGoalHomeAway              next 20'
 */
export class IlFalsoNove extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 3,
    name: "Il Falso Nove",
    minMinute: 0,
    maxMinute: 90,
    maxMarketsPerMatch: 3,
    defaultMarketWindowMs: 60_000,
    defaultResolveWindowMs: 30 * 60_000,
  };

  async evaluate(args: {
    snapshot: MatchSnapshot;
    recentDeltas: MatchDelta[];
    marketsAlreadyOpenedThisMatch: number;
  }): Promise<ProposedMarket[]> {
    const { snapshot, marketsAlreadyOpenedThisMatch } = args;
    if (!ACTIVE_STATUSES.has(snapshot.status)) return [];
    if (marketsAlreadyOpenedThisMatch >= this.config.maxMarketsPerMatch) return [];
    const proposals: ProposedMarket[] = [];

    if (marketsAlreadyOpenedThisMatch === 0 && snapshot.minute >= 15 && snapshot.minute <= 25) {
      const baseline = snapshot.statistics.home.shotsOnGoal;
      const params: ShotsOnTargetOverParams = {
        targetTeam: "HOME",
        thresholdCount: 1,
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
        openedAtShotsCount: baseline,
      };
      proposals.push(
        this._build(shotsOnTargetOver, params, `ShotsOnTarget HOME >1 next 15' (baseline ${baseline} at ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 1 && snapshot.minute >= 40 && snapshot.minute <= 50) {
      const params: PossessionOverPctParams = {
        targetTeam: "HOME",
        thresholdPct: 55,
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(possessionOverPct, params, `Possession HOME >55% next 15' (open ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 2 && snapshot.minute >= 65 && snapshot.minute <= 75) {
      const params: NextGoalHomeAwayParams = {
        windowMinutes: 20,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(nextGoalHomeAway, params, `NextGoalHomeAway next 20' (open ${snapshot.minute}')`),
      );
    }

    return proposals;
  }

  async buildRevealedParams(args: { proposal: ProposedMarket }): Promise<Hex> {
    const template = templateRegistry.get(args.proposal.templateId);
    if (!template) throw new Error(`Unknown templateId ${args.proposal.templateId}`);
    return buildRevealedParams({ template, params: args.proposal.templateParams });
  }

  private _build<T>(template: Template<T>, params: T, rationale: string): ProposedMarket {
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
