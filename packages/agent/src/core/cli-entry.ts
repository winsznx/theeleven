#!/usr/bin/env tsx
import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";

import { loadEnv } from "../config/env.js";
import { loadDeployment } from "../config/deployment.js";
import { makePublicClient } from "../clients/publicClient.js";
import { makeAgentWalletClient } from "../clients/walletClients.js";
import { deriveAgentAccount } from "../wallets/AgentWallets.js";
import { ApiFootballClient } from "../matches/ApiFootballClient.js";
import { FootballDataClient } from "../matches/FootballDataClient.js";
import { MatchPoller } from "../matches/MatchPoller.js";
import { logger } from "../logger.js";
import type { AgentIndex, PersonaName as AgentDisplayName } from "../types/agent.js";
import { getPersonaDefinition } from "../personas/registry.js";

import { AgentDatabase } from "./persistence/AgentDatabase.js";
import { StubPersona } from "./StubPersona.js";
import { TickLoop } from "./TickLoop.js";
import {
  runAgentCli,
  parseAgentCliArgs,
  expandCliPersona,
  type CliPersona,
} from "./cli.js";
import type { BaseAgent, BaseAgentArgs } from "./BaseAgent.js";

/* ─────────────── /health endpoint for Railway/Vercel uptime ─────────────── */

interface HealthState {
  status: "starting" | "ok";
  startedAt: string;
  fixtureId: number | null;
  personasActive: number;
  personaSlugs: CliPersona[];
}

const healthState: HealthState = {
  status: "starting",
  startedAt: new Date().toISOString(),
  fixtureId: null,
  personasActive: 0,
  personaSlugs: [],
};

const HEALTH_PORT = Number(process.env.PORT ?? 8080);
const healthServer = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(healthState));
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});
healthServer.listen(HEALTH_PORT, () => {
  logger.info({ port: HEALTH_PORT }, "agent /health endpoint listening");
});

try {
  const { fixtureId, persona } = parseAgentCliArgs(process.argv);
  healthState.fixtureId = fixtureId;
  healthState.personaSlugs = [...expandCliPersona(persona)];
  healthState.personasActive = healthState.personaSlugs.length;
} catch {
  // surfaced by runAgentCli below; leave state empty.
}

/* ─────────────── Per-persona factory wiring ─────────────── */

function makeAgent(persona: CliPersona, args: BaseAgentArgs): BaseAgent {
  if (persona === "stub") return new StubPersona(args);
  if (persona === "all") throw new Error("makeAgent: 'all' is not a single persona");
  return getPersonaDefinition(persona).factory(args);
}

function resolveIdentity(persona: CliPersona): {
  walletIndex: AgentIndex;
  name: AgentDisplayName;
} {
  if (persona === "all") throw new Error("resolveIdentity: 'all' is not a single persona");
  if (persona === "stub") {
    return { walletIndex: 0 as AgentIndex, name: "Il Regista" };
  }
  const def = getPersonaDefinition(persona);
  return { walletIndex: def.walletIndex, name: def.name };
}

await runAgentCli({
  argv: process.argv,
  deps: {
    env: process.env,
    logger,
    // Fires after every tick loop has started — the only point in the
    // boot path that races ahead of runAgentCli's signal-await.
    onReady: () => {
      healthState.status = "ok";
    },
    buildTickLoop: async (persona: CliPersona, fixtureId: number) => {
      const env = loadEnv();
      const deployment = loadDeployment();
      if (!deployment) {
        throw new Error(
          "deployments/xlayer-mainnet.json missing; run `pnpm --filter @regista11/contracts deploy` (see DEPLOYMENT.md)",
        );
      }

      const { walletIndex, name } = resolveIdentity(persona);
      const publicClient = makePublicClient(env.XLAYER_RPC);
      const agentAccount = deriveAgentAccount(env.MASTER_MNEMONIC, walletIndex);
      const walletClient = makeAgentWalletClient(agentAccount, env.XLAYER_RPC);

      const prisma = new PrismaClient();
      const db = new AgentDatabase(prisma, logger);

      const agent = makeAgent(persona, {
        identity: {
          index: walletIndex,
          name,
          address: agentAccount.address,
        },
        walletClient,
        publicClient,
        factoryAddress: deployment.contracts.PropMarketHookFactory,
        resolverAddress: deployment.resolver,
        db,
        parentLogger: logger,
      });

      // Live match data — pick a provider at boot. If FOOTBALL_DATA_KEY
      // is set, use Football-Data.org (10 req/min, no daily cap, 12
      // top-tier comps). Otherwise fall back to api-football (broader
      // coverage but stricter quotas). Both expose fetchSnapshot(id) and
      // return our internal MatchSnapshot — MatchPoller is provider-
      // agnostic.
      const fdKey = process.env.FOOTBALL_DATA_KEY?.trim();
      const apiClient: ApiFootballClient | FootballDataClient = fdKey
        ? new FootballDataClient({ apiKey: fdKey, logger })
        : new ApiFootballClient({
            apiKey: env.API_FOOTBALL_KEY,
            baseUrl: env.API_FOOTBALL_BASE_URL,
            logger,
          });
      logger.info(
        {
          provider: fdKey ? "football-data" : "api-football",
        },
        "matches: provider selected",
      );
      const matchPoller = new MatchPoller({
        client: apiClient,
        // fixtureId is the CLI-parsed value threaded through runAgentCli.
        // Previously hard-coded to 0, which caused every API-Football
        // request to hit `?id=0` and burn the rate-limit budget without
        // pulling real match data — the agent appeared online but no
        // markets ever minted.
        fixtureId,
        intervalMs: env.MATCH_POLL_INTERVAL_MS,
        logger,
      });

      const tickLoop = new TickLoop({ agent, matchPoller, db, logger });
      return { agent, tickLoop };
    },
  },
}).then(
  (code) => {
    process.exit(code);
  },
  (err) => {
    logger.error({ err }, "agent:start crashed");
    process.exit(1);
  },
);
