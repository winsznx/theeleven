import type { Logger } from "pino";

import type { BaseAgent } from "./BaseAgent.js";
import type { TickLoop } from "./TickLoop.js";
import {
  PERSONA_REGISTRY,
  PERSONA_SLUGS,
  getPersonaDefinition,
  type PersonaSlug,
} from "../personas/registry.js";

/**
 * What the CLI accepts on the command line. "stub" is a legacy test-only
 * alias kept for backwards-compat with the P12 test fixtures; "all" spawns
 * every persona in PERSONA_REGISTRY in parallel within one process.
 */
export type CliPersona = PersonaSlug | "stub" | "all";

const ACCEPTED_CLI: readonly CliPersona[] = [
  ...PERSONA_SLUGS,
  "stub",
  "all",
];

/** Back-compat re-exports. Older imports keep resolving against these. */
export const PERSONA_NAMES: readonly CliPersona[] = ACCEPTED_CLI;
export type PersonaName = CliPersona;

/**
 * Persona slug → BIP-44 wallet index lookup.
 * Derived from PERSONA_REGISTRY (single source of truth) plus the legacy
 * "stub" slot which borrows ilRegista's index for test convenience.
 */
export const PERSONA_WALLET_INDEX: Record<PersonaSlug | "stub", number> = {
  ...Object.fromEntries(PERSONA_REGISTRY.map((p) => [p.slug, p.walletIndex])),
  stub: 0,
} as Record<PersonaSlug | "stub", number>;

export interface AgentCliArgs {
  fixtureId: number;
  /** Either a single CliPersona, "all", or a comma-separated list of
   *  PersonaSlug values for "run this subset only" mode (used to keep
   *  the agent under API-Football's free-tier 10 req/min while still
   *  showing live mints for a demo). */
  persona: CliPersona | readonly PersonaSlug[];
}

export function parseAgentCliArgs(argv: readonly string[]): AgentCliArgs {
  const rest = argv.slice(2);
  let persona: AgentCliArgs["persona"] = "ilRegista";
  const positional: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]!;
    if (token === "--persona") {
      const value = rest[i + 1];
      if (!value) throw new Error("--persona requires a value");
      persona = validatePersonaArg(value);
      i++;
    } else if (token.startsWith("--persona=")) {
      persona = validatePersonaArg(token.slice("--persona=".length));
    } else if (!token.startsWith("-")) {
      positional.push(token);
    }
  }

  const first = positional[0];
  if (!first) {
    throw new Error(
      `usage: agent:start <fixtureId> [--persona <slug>|all]\n` +
        `       valid slugs: ${PERSONA_SLUGS.join(", ")} (also 'stub', 'all')`,
    );
  }
  const n = Number(first);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`fixtureId must be a positive integer, got: ${first}`);
  }
  return { fixtureId: n, persona };
}

function validatePersona(value: string): CliPersona {
  if (!(ACCEPTED_CLI as readonly string[]).includes(value)) {
    throw new Error(
      `invalid persona '${value}'; expected one of: ${ACCEPTED_CLI.join(", ")}`,
    );
  }
  return value as CliPersona;
}

/** Accepts either a single CliPersona value ("all", "stub", or any
 *  PERSONA_SLUGS member) or a comma-separated list of PERSONA_SLUGS
 *  members (e.g. "ilRegista,ilBomber,lUltimo") for the demo-subset
 *  mode. */
function validatePersonaArg(value: string): AgentCliArgs["persona"] {
  if (!value.includes(",")) return validatePersona(value);
  const parts = value
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    throw new Error("--persona list cannot be empty");
  }
  const slugs = parts.map((p) => {
    if (!(PERSONA_SLUGS as readonly string[]).includes(p)) {
      throw new Error(
        `invalid persona slug '${p}' in list; expected one of: ${PERSONA_SLUGS.join(", ")}`,
      );
    }
    return p as PersonaSlug;
  });
  // De-dupe while preserving order.
  const unique = Array.from(new Set(slugs)) as PersonaSlug[];
  return unique;
}

/** Expand --persona=all into the full list of real persona slugs. */
export function expandCliPersona(
  p: AgentCliArgs["persona"],
): readonly CliPersona[] {
  if (Array.isArray(p)) return p as readonly CliPersona[];
  return p === "all" ? [...PERSONA_SLUGS] : [p as CliPersona];
}

/** Look up the registry entry for a non-stub, non-all slug. Throws on misuse. */
export function lookupRealPersona(slug: CliPersona) {
  if (slug === "all") throw new Error("lookupRealPersona: 'all' is not a single persona");
  if (slug === "stub") throw new Error("lookupRealPersona: 'stub' is not in the registry");
  return getPersonaDefinition(slug);
}

export interface AgentCliDeps {
  env: NodeJS.ProcessEnv;
  logger: Logger;
  /** Builds one tick loop per persona slug. cli-entry.ts wires wallet,
   *  publicClient, factoryAddress, etc. for a single persona at a time.
   *  fixtureId is threaded through so MatchPoller receives the CLI-
   *  parsed value at construction instead of a placeholder. */
  buildTickLoop: (
    persona: CliPersona,
    fixtureId: number,
  ) => Promise<{ agent: BaseAgent; tickLoop: TickLoop }>;
  /** Fired once every tick loop has started. The caller blocks on
   *  runAgentCli's promise (which only resolves on SIGINT/SIGTERM), so
   *  anything that needs to know "boot done, agent now ticking" — like
   *  flipping a health endpoint from "starting" to "ok" — must run from
   *  this callback rather than after the await. */
  onReady?: () => void;
}

export async function runAgentCli(args: {
  argv: readonly string[];
  deps: AgentCliDeps;
}): Promise<number> {
  const { fixtureId, persona } = parseAgentCliArgs(args.argv);
  const env = args.deps.env;

  if (!env.MASTER_MNEMONIC) {
    throw new Error("MASTER_MNEMONIC is required; see DEPLOYMENT.md");
  }

  const personasToRun = expandCliPersona(persona);

  const loops: Array<{ agent: BaseAgent; tickLoop: TickLoop }> = [];
  for (const p of personasToRun) {
    const built = await args.deps.buildTickLoop(p, fixtureId);
    loops.push(built);
    args.deps.logger.info(
      {
        fixtureId,
        persona: p,
        agentName: built.agent.identity.name,
        address: built.agent.identity.address,
      },
      "agent:start",
    );
  }

  await Promise.all(loops.map(({ tickLoop }) => tickLoop.start(fixtureId)));

  args.deps.onReady?.();

  return await new Promise<number>((resolve) => {
    const onSig = () => {
      args.deps.logger.info(
        { personas: loops.length },
        "agent:start received signal; stopping",
      );
      void Promise.all(loops.map(({ tickLoop }) => tickLoop.stop())).then(() =>
        resolve(0),
      );
    };
    process.once("SIGINT", onSig);
    process.once("SIGTERM", onSig);
  });
}
