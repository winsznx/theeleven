import type { Hex } from "viem";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../core/BaseAgent.js";
import type { MatchDelta, MatchSnapshot } from "../matches/types.js";
import {
  buildRevealedParams,
  nextGoalHomeAway,
  shotsOnTargetOver,
  templateRegistry,
  type NextGoalHomeAwayParams,
  type ShotsOnTargetOverParams,
  type Template,
} from "../propositions/index.js";

const ACTIVE_STATUSES = new Set(["1H", "2H", "ET"]);

/**
 * Il Bomber — persona #6, pure striker. Attacking-force reads anchored
 * on goal calls and total-shot volume. 3 slots, deterministic.
 *   Slot 1 (5–15'):  NextGoalHomeAway              next 20'
 *   Slot 2 (35–45'): ShotsOnTargetOver TOTAL >3   next 15'
 *   Slot 3 (60–75'): NextGoalHomeAway              next 25'
 */
export class IlBomber extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 6,
    name: "Il Bomber",
    minMinute: 0,
    maxMinute: 90,
    maxMarketsPerMatch: 3,
    defaultMarketWindowMs: 300_000, // 5min — salt mining + RPC submit can exceed 60s on Railway's CPU
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

    if (marketsAlreadyOpenedThisMatch === 0 && snapshot.minute >= 5 && snapshot.minute <= 15) {
      const params: NextGoalHomeAwayParams = {
        windowMinutes: 20,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(nextGoalHomeAway, params, `NextGoalHomeAway next 20' (open ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 1 && snapshot.minute >= 35 && snapshot.minute <= 45) {
      const baseline =
        snapshot.statistics.home.shotsOnGoal + snapshot.statistics.away.shotsOnGoal;
      const params: ShotsOnTargetOverParams = {
        targetTeam: "TOTAL",
        thresholdCount: 3,
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
        openedAtShotsCount: baseline,
      };
      proposals.push(
        this._build(shotsOnTargetOver, params, `ShotsOnTarget TOTAL >3 next 15' (baseline ${baseline} at ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 2 && snapshot.minute >= 60 && snapshot.minute <= 75) {
      const params: NextGoalHomeAwayParams = {
        windowMinutes: 25,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(nextGoalHomeAway, params, `NextGoalHomeAway next 25' (open ${snapshot.minute}')`),
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
