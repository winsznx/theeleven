export * from "./types.js";
export * from "./errors.js";
export * from "./ApiFootballClient.js";
export * from "./MatchPoller.js";
export { diffSnapshots } from "./MatchStateDiff.js";
export {
  normalizeFixtureItem,
  normalizeStatistics,
  mergeIntoSnapshot,
  parseStatistic,
} from "./normalize.js";
export { parseArgs as parseMatchWatchArgs, runCli as runMatchWatchCli } from "./cli.js";
