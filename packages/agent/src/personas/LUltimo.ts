import type { Hex } from "viem";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../core/BaseAgent.js";
import type { MatchDelta, MatchSnapshot } from "../matches/types.js";
import {
  buildRevealedParams,
  cleanSheetRemaining,
  templateRegistry,
  type CleanSheetRemainingParams,
  type Template,
} from "../propositions/index.js";

const ACTIVE_STATUSES = new Set(["1H", "2H", "ET"]);

/**
 * L'Ultimo — persona #10, goalkeeper. Pure CleanSheet read at three
 * crucial moments. 3 slots, deterministic.
 *   Slot 1 (25–35'): CleanSheetRemaining AWAY next 25'  (mid-1H push)
 *   Slot 2 (50–60'): CleanSheetRemaining HOME next 30'  (post-restart)
 *   Slot 3 (75–85'): CleanSheetRemaining HOME next 15'  (closing minutes)
 */
export class LUltimo extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 10,
    name: "L'Ultimo",
    minMinute: 0,
    maxMinute: 90,
    maxMarketsPerMatch: 3,
    defaultMarketWindowMs: 300_000, // 5min — salt mining + RPC submit can exceed 60s on Railway's CPU
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

    if (marketsAlreadyOpenedThisMatch === 0 && snapshot.minute >= 25 && snapshot.minute <= 35) {
      const params: CleanSheetRemainingParams = {
        targetTeam: "AWAY",
        windowMinutes: 25,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(cleanSheetRemaining, params, `CleanSheet AWAY next 25' (open ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 1 && snapshot.minute >= 50 && snapshot.minute <= 60) {
      const params: CleanSheetRemainingParams = {
        targetTeam: "HOME",
        windowMinutes: 30,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(cleanSheetRemaining, params, `CleanSheet HOME next 30' (open ${snapshot.minute}')`),
      );
    }

    if (marketsAlreadyOpenedThisMatch === 2 && snapshot.minute >= 75 && snapshot.minute <= 85) {
      const params: CleanSheetRemainingParams = {
        targetTeam: "HOME",
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(cleanSheetRemaining, params, `CleanSheet HOME next 15' (open ${snapshot.minute}')`),
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
