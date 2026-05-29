import type { Hex } from "viem";

import type { MatchSnapshot, TeamSide } from "../matches/types.js";

// Re-export so template modules can `import { TeamSide } from "../types.js"`.
export type { TeamSide };

/** Matches PropMarketHook.outcome semantics: 1 = YES side, 2 = NO side. */
export type SideId = 1 | 2;

/** null = not yet resolvable (window still open). */
export type ResolverResult = SideId | null;

export interface ResolveContext {
  snapshot: MatchSnapshot;
  /** snapshot.minute when the market was opened — used for *_NEXT_X templates. */
  openedAtMinute: number;
}

export interface TemplateBase {
  /** bytes32 = keccak256(utf8("NAME_vN")) */
  readonly id: Hex;
  readonly name: string;
  readonly description: string;
  /** earliest snapshot.minute at which this template should be opened */
  readonly requiredMinMinute: number;
  /** latest snapshot.minute at which this template can be opened */
  readonly requiredMaxMinute: number;
}

export interface Template<TParams> extends TemplateBase {
  encodeParams(params: TParams): Hex;
  decodeParams(encoded: Hex): TParams;
  resolve(ctx: ResolveContext, params: TParams): ResolverResult;
  readonly sideLabels: readonly [string, string];
}

