import { templateRegistry } from "./registry.js";
import { cleanSheetRemaining } from "./templates/CleanSheetRemaining.js";
import { possessionOverPct } from "./templates/PossessionOverPct.js";
import { cornerCountOver } from "./templates/CornerCountOver.js";
import { nextGoalHomeAway } from "./templates/NextGoalHomeAway.js";
import { shotsOnTargetOver } from "./templates/ShotsOnTargetOver.js";
import { yellowCardCountOver } from "./templates/YellowCardCountOver.js";
import { foulsCountOver } from "./templates/FoulsCountOver.js";

templateRegistry.register(cleanSheetRemaining);
templateRegistry.register(possessionOverPct);
templateRegistry.register(cornerCountOver);
templateRegistry.register(nextGoalHomeAway);
templateRegistry.register(shotsOnTargetOver);
templateRegistry.register(yellowCardCountOver);
templateRegistry.register(foulsCountOver);

export { templateRegistry, TemplateRegistry } from "./registry.js";
export { cleanSheetRemaining } from "./templates/CleanSheetRemaining.js";
export type { CleanSheetRemainingParams } from "./templates/CleanSheetRemaining.js";
export { possessionOverPct } from "./templates/PossessionOverPct.js";
export type { PossessionOverPctParams } from "./templates/PossessionOverPct.js";
export { cornerCountOver } from "./templates/CornerCountOver.js";
export type { CornerCountOverParams, CornerTarget } from "./templates/CornerCountOver.js";

export { nextGoalHomeAway } from "./templates/NextGoalHomeAway.js";
export type { NextGoalHomeAwayParams } from "./templates/NextGoalHomeAway.js";

export { shotsOnTargetOver } from "./templates/ShotsOnTargetOver.js";
export type {
  ShotsOnTargetOverParams,
  ShotsTarget,
} from "./templates/ShotsOnTargetOver.js";

export { yellowCardCountOver } from "./templates/YellowCardCountOver.js";
export type {
  YellowCardCountOverParams,
  YellowCardTarget,
} from "./templates/YellowCardCountOver.js";

export { foulsCountOver } from "./templates/FoulsCountOver.js";
export type {
  FoulsCountOverParams,
  FoulsTarget,
} from "./templates/FoulsCountOver.js";

export * from "./types.js";
export * from "./encoding.js";
