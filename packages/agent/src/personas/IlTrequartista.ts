import type { Hex } from "viem";

import { BaseAgent, type PersonaConfig, type ProposedMarket } from "../core/BaseAgent.js";
import type { MatchDelta, MatchSnapshot, TeamSide } from "../matches/types.js";
import {
  buildRevealedParams,
  cornerCountOver,
  nextGoalHomeAway,
  shotsOnTargetOver,
  templateRegistry,
  type CornerCountOverParams,
  type NextGoalHomeAwayParams,
  type ShotsOnTargetOverParams,
  type Template,
} from "../propositions/index.js";

const ACTIVE_STATUSES = new Set(["1H", "2H", "ET"]);

/**
 * Il Trequartista — persona #1, attacking mid. Final-third props across
 * attacking phases. 4 slots, deterministic.
 *   Slot 1 (5–15'):   NextGoalHomeAway,    30' window
 *   Slot 2 (25–35'):  ShotsOnTargetOver HOME >2, 10' window
 *   Slot 3 (50–60'):  ShotsOnTargetOver AWAY >2, 15' window
 *   Slot 4 (70–80'):  CornerCountOver TOTAL >2,  10' window
 */
export class IlTrequartista extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 1,
    name: "Il Trequartista",
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

    // Slot 1 (5–15'): NextGoalHomeAway 30'
    if (
      marketsAlreadyOpenedThisMatch === 0 &&
      snapshot.minute >= 5 &&
      snapshot.minute <= 15
    ) {
      const params: NextGoalHomeAwayParams = {
        windowMinutes: 30,
        openedAtMinute: snapshot.minute,
      };
      proposals.push(
        this._build(
          nextGoalHomeAway,
          params,
          `NextGoalHomeAway next 30' (open ${snapshot.minute}')`
        )
      );
    }

    // Slot 2 (25–35'): ShotsOnTargetOver HOME >2 next 10'
    if (
      marketsAlreadyOpenedThisMatch === 1 &&
      snapshot.minute >= 25 &&
      snapshot.minute <= 35
    ) {
      const baselineShots = snapshot.statistics.home.shotsOnGoal;
      const params: ShotsOnTargetOverParams = {
        targetTeam: "HOME" satisfies TeamSide,
        thresholdCount: 2,
        windowMinutes: 10,
        openedAtMinute: snapshot.minute,
        openedAtShotsCount: baselineShots,
      };
      proposals.push(
        this._build(
          shotsOnTargetOver,
          params,
          `ShotsOnTarget HOME >2 next 10' (baseline ${baselineShots} at ${snapshot.minute}')`
        )
      );
    }

    // Slot 3 (50–60'): ShotsOnTargetOver AWAY >2 next 15'
    if (
      marketsAlreadyOpenedThisMatch === 2 &&
      snapshot.minute >= 50 &&
      snapshot.minute <= 60
    ) {
      const baselineShots = snapshot.statistics.away.shotsOnGoal;
      const params: ShotsOnTargetOverParams = {
        targetTeam: "AWAY" satisfies TeamSide,
        thresholdCount: 2,
        windowMinutes: 15,
        openedAtMinute: snapshot.minute,
        openedAtShotsCount: baselineShots,
      };
      proposals.push(
        this._build(
          shotsOnTargetOver,
          params,
          `ShotsOnTarget AWAY >2 next 15' (baseline ${baselineShots} at ${snapshot.minute}')`
        )
      );
    }

    // Slot 4 (70–80'): CornerCountOver TOTAL >2 next 10' (reuses P11 template)
    if (
      marketsAlreadyOpenedThisMatch === 3 &&
      snapshot.minute >= 70 &&
      snapshot.minute <= 80
    ) {
      const baselineCorners =
        snapshot.statistics.home.cornerKicks + snapshot.statistics.away.cornerKicks;
      const params: CornerCountOverParams = {
        targetTeam: "TOTAL",
        thresholdCount: 2,
        windowMinutes: 10,
        openedAtMinute: snapshot.minute,
        openedAtCornerCount: baselineCorners,
      };
      proposals.push(
        this._build(
          cornerCountOver,
          params,
          `Corners TOTAL >2 next 10' (baseline ${baselineCorners} at ${snapshot.minute}')`
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
