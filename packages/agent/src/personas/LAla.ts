import type { Hex } from "viem";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../core/BaseAgent.js";
import type { MatchDelta, MatchSnapshot } from "../matches/types.js";
import {
  buildRevealedParams,
  cornerCountOver,
  shotsOnTargetOver,
  templateRegistry,
  type CornerCountOverParams,
  type ShotsOnTargetOverParams,
  type Template,
} from "../propositions/index.js";

const ACTIVE_STATUSES = new Set(["1H", "2H", "ET"]);

/**
 * L'Ala — persona #5, wing-back. Wide-attack reads (corners + shots from
 * the flanks). 3 slots, deterministic.
 *   Slot 1 (10–20'): CornerCountOver HOME >2     next 20'
 *   Slot 2 (35–45'): ShotsOnTargetOver HOME >2   next 15'
 *   Slot 3 (60–75'): CornerCountOver AWAY >2     next 15'
 */
export class LAla extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 5,
    name: "L'Ala",
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

    if (marketsAlreadyOpenedThisMatch === 0 && snapshot.minute >= 10 && snapshot.minute <= 20) {
      const baseline = snapshot.statistics.home.cornerKicks;
      const params: CornerCountOverParams = {
        targetTeam: "HOME",
        thresholdCount: 2,
        windowMinutes: 20,
        openedAtMinute: snapshot.minute,
        openedAtCornerCount: baseline,
      };
      proposals.push(
        this._build(cornerCountOver, params, `Corners HOME >2 next 20' (baseline ${baseline} at ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 1 && snapshot.minute >= 35 && snapshot.minute <= 45) {
      const baseline = snapshot.statistics.home.shotsOnGoal;
      const params: ShotsOnTargetOverParams = {
        targetTeam: "HOME",
        thresholdCount: 2,
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
        openedAtShotsCount: baseline,
      };
      proposals.push(
        this._build(shotsOnTargetOver, params, `ShotsOnTarget HOME >2 next 15' (baseline ${baseline} at ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 2 && snapshot.minute >= 60 && snapshot.minute <= 75) {
      const baseline = snapshot.statistics.away.cornerKicks;
      const params: CornerCountOverParams = {
        targetTeam: "AWAY",
        thresholdCount: 2,
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
        openedAtCornerCount: baseline,
      };
      proposals.push(
        this._build(cornerCountOver, params, `Corners AWAY >2 next 15' (baseline ${baseline} at ${snapshot.minute}')`),
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
