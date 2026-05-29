import type { Hex } from "viem";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../core/BaseAgent.js";
import type { MatchDelta, MatchSnapshot } from "../matches/types.js";
import {
  buildRevealedParams,
  foulsCountOver,
  templateRegistry,
  yellowCardCountOver,
  type FoulsCountOverParams,
  type Template,
  type YellowCardCountOverParams,
} from "../propositions/index.js";

const ACTIVE_STATUSES = new Set(["1H", "2H", "ET"]);

/**
 * Il Capitano — persona #7, captain. Opposing-team discipline reads.
 * 3 slots, deterministic.
 *   Slot 1 (20–30'): YellowCardCountOver AWAY >1 next 20'
 *   Slot 2 (50–60'): FoulsCountOver AWAY >4       next 15'
 *   Slot 3 (75–85'): YellowCardCountOver AWAY >2 next 15'
 */
export class IlCapitano extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 7,
    name: "Il Capitano",
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

    if (marketsAlreadyOpenedThisMatch === 0 && snapshot.minute >= 20 && snapshot.minute <= 30) {
      const baseline = snapshot.statistics.away.yellowCards;
      const params: YellowCardCountOverParams = {
        targetTeam: "AWAY",
        thresholdCount: 1,
        windowMinutes: 20,
        openedAtMinute: snapshot.minute,
        openedAtYellowCount: baseline,
      };
      proposals.push(
        this._build(yellowCardCountOver, params, `YellowCards AWAY >1 next 20' (baseline ${baseline} at ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 1 && snapshot.minute >= 50 && snapshot.minute <= 60) {
      const baseline = snapshot.statistics.away.fouls;
      const params: FoulsCountOverParams = {
        targetTeam: "AWAY",
        thresholdCount: 4,
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
        openedAtFoulsCount: baseline,
      };
      proposals.push(
        this._build(foulsCountOver, params, `Fouls AWAY >4 next 15' (baseline ${baseline} at ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 2 && snapshot.minute >= 75 && snapshot.minute <= 85) {
      const baseline = snapshot.statistics.away.yellowCards;
      const params: YellowCardCountOverParams = {
        targetTeam: "AWAY",
        thresholdCount: 2,
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
        openedAtYellowCount: baseline,
      };
      proposals.push(
        this._build(yellowCardCountOver, params, `YellowCards AWAY >2 next 15' (baseline ${baseline} at ${snapshot.minute}')`),
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
