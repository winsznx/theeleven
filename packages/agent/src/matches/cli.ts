import { ApiFootballClient } from "./ApiFootballClient.js";
import { MatchPoller } from "./MatchPoller.js";
import { FINAL_STATUSES } from "./types.js";

export interface ParsedArgs {
  fixtureId: number;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  // argv shape coming from `node script -- <fixtureId>` or `tsx script <fixtureId>`
  const positional = argv.slice(2).filter((a) => !a.startsWith("-"));
  const first = positional[0];
  if (!first) {
    throw new Error("usage: match:watch <fixtureId>");
  }
  const n = Number(first);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`fixtureId must be a positive integer, got: ${first}`);
  }
  return { fixtureId: n };
}

export async function runCli(
  argv: readonly string[],
  deps: {
    env: () => { API_FOOTBALL_KEY: string; API_FOOTBALL_BASE_URL: string; MATCH_POLL_INTERVAL_MS: number };
    logger: import("pino").Logger;
    // injectable for testing; defaults wire the real client
    makeClient?: (opts: { apiKey: string; baseUrl: string; logger: import("pino").Logger }) => ApiFootballClient;
    makePoller?: (opts: ConstructorParameters<typeof MatchPoller>[0]) => MatchPoller;
  }
): Promise<number> {
  const { fixtureId } = parseArgs(argv);
  const env = deps.env();
  const logger = deps.logger;

  const makeClient =
    deps.makeClient ??
    ((o) => new ApiFootballClient({ apiKey: o.apiKey, baseUrl: o.baseUrl, logger: o.logger }));
  const makePoller = deps.makePoller ?? ((o) => new MatchPoller(o));

  const client = makeClient({
    apiKey: env.API_FOOTBALL_KEY,
    baseUrl: env.API_FOOTBALL_BASE_URL,
    logger,
  });
  const poller = makePoller({
    client,
    fixtureId,
    intervalMs: env.MATCH_POLL_INTERVAL_MS,
    logger,
  });

  return await new Promise<number>((resolve) => {
    let exitCode = 0;
    poller.onSnapshot((s) => logger.info({ snapshot: { fixtureId: s.fixtureId, status: s.status, minute: s.minute, score: s.score } }));
    poller.onDelta((d) => logger.info({ delta: d }));
    poller.onError((e) => logger.error({ err: e }, "poller error"));

    const onFinish = () => {
      void poller.stop().then(() => resolve(exitCode));
    };

    poller.onDelta((d) => {
      if (d.kind === "FINAL_WHISTLE") onFinish();
    });
    // Also watch for explicit FT/AET/PEN via status changes (covers join-mid-FT)
    poller.onSnapshot((s) => {
      if (FINAL_STATUSES.has(s.status)) {
        // poller will self-stop after its grace period; we just resolve on its termination
      }
    });

    const onSig = () => {
      logger.info("received signal, stopping poller");
      onFinish();
    };
    process.once("SIGINT", onSig);
    process.once("SIGTERM", onSig);

    poller.onError((e) => {
      exitCode = 1;
      logger.error({ err: e }, "fatal poller error");
    });

    poller.start();
  });
}
