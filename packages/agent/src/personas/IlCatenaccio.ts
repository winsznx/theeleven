import type { Hex } from "viem";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../core/BaseAgent.js";
import type { MatchDelta, MatchSnapshot } from "../matches/types.js";
import {
  buildRevealedParams,
  cleanSheetRemaining,
  templateRegistry,
  yellowCardCountOver,
  type CleanSheetRemainingParams,
  type Template,
  type YellowCardCountOverParams,
} from "../propositions/index.js";

const ACTIVE_STATUSES = new Set(["1H", "2H", "ET"]);

/**
 * Il Catenaccio — persona #9, defensive lock. Two HOME clean-sheet
 * windows bookending a yellow-card intensity read. 3 slots, deterministic.
 *   Slot 1 (15–25'): CleanSheetRemaining HOME       next 25'
 *   Slot 2 (40–50'): YellowCardCountOver TOTAL >2   next 25'
 *   Slot 3 (70–80'): CleanSheetRemaining HOME       next 20'
 */
export class IlCatenaccio extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 9,
    name: "Il Catenaccio",
    minMinute: 0,
    maxMinute: 90,
    maxMarketsPerMatch: 3,
    defaultMarketWindowMs: 60_000,
    defaultResolveWindowMs: 40 * 60_000,
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
      const params: CleanSheetRemainingParams = {
        targetTeam: "HOME",
        windowMinutes: 25,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(cleanSheetRemaining, params, `CleanSheet HOME next 25' (open ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 1 && snapshot.minute >= 40 && snapshot.minute <= 50) {
      const baseline =
        snapshot.statistics.home.yellowCards + snapshot.statistics.away.yellowCards;
      const params: YellowCardCountOverParams = {
        targetTeam: "TOTAL",
        thresholdCount: 2,
        windowMinutes: 25,
        openedAtMinute: snapshot.minute,
        openedAtYellowCount: baseline,
      };
      proposals.push(
        this._build(yellowCardCountOver, params, `YellowCards TOTAL >2 next 25' (baseline ${baseline} at ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 2 && snapshot.minute >= 70 && snapshot.minute <= 80) {
      const params: CleanSheetRemainingParams = {
        targetTeam: "HOME",
        windowMinutes: 20,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(cleanSheetRemaining, params, `CleanSheet HOME next 20' (open ${snapshot.minute}')`),
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
