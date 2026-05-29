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
 * Il Mediano — persona #2, defensive mid. Foul + card props across game-intensity
 * read points. 4 slots, deterministic.
 *   Slot 1 (10–20'):  FoulsCountOver TOTAL >5  next 20'
 *   Slot 2 (30–40'):  YellowCardCountOver TOTAL >1  next 30'
 *   Slot 3 (50–60'):  FoulsCountOver TOTAL >6  next 20'
 *   Slot 4 (70–80'):  YellowCardCountOver TOTAL >2  next 15'
 */
export class IlMediano extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 2,
    name: "Il Mediano",
    minMinute: 0,
    maxMinute: 90,
    maxMarketsPerMatch: 4,
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

    // Slot 1 (10–20'): FoulsCountOver TOTAL >5 next 20'
    if (
      marketsAlreadyOpenedThisMatch === 0 &&
      snapshot.minute >= 10 &&
      snapshot.minute <= 20
    ) {
      const baselineFouls =
        snapshot.statistics.home.fouls + snapshot.statistics.away.fouls;
      const params: FoulsCountOverParams = {
        targetTeam: "TOTAL",
        thresholdCount: 5,
        windowMinutes: 20,
        openedAtMinute: snapshot.minute,
        openedAtFoulsCount: baselineFouls,
      };
      proposals.push(
        this._build(
          foulsCountOver,
          params,
          `Fouls TOTAL >5 next 20' (baseline ${baselineFouls} at ${snapshot.minute}')`
        )
      );
    }

    // Slot 2 (30–40'): YellowCardCountOver TOTAL >1 next 30'
    if (
      marketsAlreadyOpenedThisMatch === 1 &&
      snapshot.minute >= 30 &&
      snapshot.minute <= 40
    ) {
      const baselineCards =
        snapshot.statistics.home.yellowCards + snapshot.statistics.away.yellowCards;
      const params: YellowCardCountOverParams = {
        targetTeam: "TOTAL",
        thresholdCount: 1,
        windowMinutes: 30,
        openedAtMinute: snapshot.minute,
        openedAtYellowCount: baselineCards,
      };
      proposals.push(
        this._build(
          yellowCardCountOver,
          params,
          `YellowCards TOTAL >1 next 30' (baseline ${baselineCards} at ${snapshot.minute}')`
        )
      );
    }

    // Slot 3 (50–60'): FoulsCountOver TOTAL >6 next 20'
    if (
      marketsAlreadyOpenedThisMatch === 2 &&
      snapshot.minute >= 50 &&
      snapshot.minute <= 60
    ) {
      const baselineFouls =
        snapshot.statistics.home.fouls + snapshot.statistics.away.fouls;
      const params: FoulsCountOverParams = {
        targetTeam: "TOTAL",
        thresholdCount: 6,
        windowMinutes: 20,
        openedAtMinute: snapshot.minute,
        openedAtFoulsCount: baselineFouls,
      };
      proposals.push(
        this._build(
          foulsCountOver,
          params,
          `Fouls TOTAL >6 next 20' (baseline ${baselineFouls} at ${snapshot.minute}')`
        )
      );
    }

    // Slot 4 (70–80'): YellowCardCountOver TOTAL >2 next 15'
    if (
      marketsAlreadyOpenedThisMatch === 3 &&
      snapshot.minute >= 70 &&
      snapshot.minute <= 80
    ) {
      const baselineCards =
        snapshot.statistics.home.yellowCards + snapshot.statistics.away.yellowCards;
      const params: YellowCardCountOverParams = {
        targetTeam: "TOTAL",
        thresholdCount: 2,
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
        openedAtYellowCount: baselineCards,
      };
      proposals.push(
        this._build(
          yellowCardCountOver,
          params,
          `YellowCards TOTAL >2 next 15' (baseline ${baselineCards} at ${snapshot.minute}')`
        )
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
