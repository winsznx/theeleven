import type { Hex } from "viem";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../core/BaseAgent.js";
import type { MatchDelta, MatchSnapshot } from "../matches/types.js";
import {
  buildRevealedParams,
  cleanSheetRemaining,
  cornerCountOver,
  templateRegistry,
  type CleanSheetRemainingParams,
  type CornerCountOverParams,
  type Template,
} from "../propositions/index.js";

const ACTIVE_STATUSES = new Set(["1H", "2H", "ET"]);

/**
 * Il Libero — persona #4, sweeper. Defensive reads on both ends with a
 * corner-count tail. 3 slots, deterministic.
 *   Slot 1 (5–15'):  CleanSheetRemaining HOME next 30'
 *   Slot 2 (45–55'): CleanSheetRemaining AWAY next 30'
 *   Slot 3 (75–85'): CornerCountOver AWAY >1   next 10'
 */
export class IlLibero extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 4,
    name: "Il Libero",
    minMinute: 0,
    maxMinute: 90,
    maxMarketsPerMatch: 3,
    defaultMarketWindowMs: 60_000,
    defaultResolveWindowMs: 45 * 60_000,
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
      const params: CleanSheetRemainingParams = {
        targetTeam: "HOME",
        windowMinutes: 30,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(cleanSheetRemaining, params, `CleanSheet HOME next 30' (open ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 1 && snapshot.minute >= 45 && snapshot.minute <= 55) {
      const params: CleanSheetRemainingParams = {
        targetTeam: "AWAY",
        windowMinutes: 30,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(cleanSheetRemaining, params, `CleanSheet AWAY next 30' (open ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 2 && snapshot.minute >= 75 && snapshot.minute <= 85) {
      const baseline = snapshot.statistics.away.cornerKicks;
      const params: CornerCountOverParams = {
        targetTeam: "AWAY",
        thresholdCount: 1,
        windowMinutes: 10,
        openedAtMinute: snapshot.minute,
        openedAtCornerCount: baseline,
      };
      proposals.push(
        this._build(cornerCountOver, params, `Corners AWAY >1 next 10' (baseline ${baseline} at ${snapshot.minute}')`),
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
