import { AGENT_NAMES, type AgentIndex, type PersonaName } from "../types/agent.js";
import type { BaseAgent, BaseAgentArgs } from "../core/BaseAgent.js";

import { IlRegista } from "./IlRegista.js";
import { IlTrequartista } from "./IlTrequartista.js";
import { IlMediano } from "./IlMediano.js";
import { IlFalsoNove } from "./IlFalsoNove.js";
import { IlLibero } from "./IlLibero.js";
import { LAla } from "./LAla.js";
import { IlBomber } from "./IlBomber.js";
import { IlCapitano } from "./IlCapitano.js";
import { IlNumeroDieci } from "./IlNumeroDieci.js";
import { IlCatenaccio } from "./IlCatenaccio.js";
import { LUltimo } from "./LUltimo.js";

/**
 * Canonical CLI slug for each persona. Used as the `--persona=<slug>` value
 * + as the key the registry is looked up by. Distinct from the web's
 * kebab-case PersonaSlug ("il-regista") so the agent CLI stays
 * camelCase-stable.
 */
export type PersonaSlug =
  | "ilRegista"
  | "ilTrequartista"
  | "ilMediano"
  | "ilFalsoNove"
  | "ilLibero"
  | "lAla"
  | "ilBomber"
  | "ilCapitano"
  | "ilNumeroDieci"
  | "ilCatenaccio"
  | "lUltimo";

export interface PersonaDefinition {
  /** Position in the BIP-44 wallet derivation chain (`m/44'/60'/0'/0/{index}`). */
  index: AgentIndex;
  /** CLI slug, e.g. "ilRegista". */
  slug: PersonaSlug;
  /** Display name from AGENT_NAMES, e.g. "Il Regista". */
  name: PersonaName;
  /** One-line tactical role for UI copy. */
  role: string;
  /** Where on the pitch this persona reads from. */
  tacticalPosition: string;
  /** BIP-44 wallet index — currently equal to `index`, kept distinct for clarity. */
  walletIndex: AgentIndex;
  /** Returns a fresh BaseAgent instance bound to the supplied wiring. */
  factory: (args: BaseAgentArgs) => BaseAgent;
  /**
   * User-facing template labels. MUST stay in lock-step with the web's
   * `ELEVEN_PERSONAS[i].templates` array in `packages/web/src/lib/personas.ts` —
   * if these change here, mirror them there in the same PR.
   */
  templateLabels: readonly string[];
}

export const PERSONA_REGISTRY: readonly PersonaDefinition[] = [
  {
    index: 0,
    slug: "ilRegista",
    name: AGENT_NAMES[0],
    role: "Deep-lying playmaker",
    tacticalPosition: "Defensive midfield · Center axis",
    walletIndex: 0,
    factory: (args) => new IlRegista(args),
    templateLabels: ["Clean sheet", "Possession", "Corners"],
  },
  {
    index: 1,
    slug: "ilTrequartista",
    name: AGENT_NAMES[1],
    role: "Creative attacker",
    tacticalPosition: "Box-to-box midfield · Right",
    walletIndex: 1,
    factory: (args) => new IlTrequartista(args),
    templateLabels: ["Next goal", "Shots on target", "Corners"],
  },
  {
    index: 2,
    slug: "ilMediano",
    name: AGENT_NAMES[2],
    role: "Defensive enforcer",
    tacticalPosition: "Defensive midfield · Left",
    walletIndex: 2,
    factory: (args) => new IlMediano(args),
    templateLabels: ["Fouls", "Yellow cards"],
  },
  {
    index: 3,
    slug: "ilFalsoNove",
    name: AGENT_NAMES[3],
    role: "False nine",
    tacticalPosition: "Forward · Drops to midfield",
    walletIndex: 3,
    factory: (args) => new IlFalsoNove(args),
    templateLabels: ["Shots on target", "Possession", "Next goal"],
  },
  {
    index: 4,
    slug: "ilLibero",
    name: AGENT_NAMES[4],
    role: "Sweeper",
    tacticalPosition: "Center back · Sweeper",
    walletIndex: 4,
    factory: (args) => new IlLibero(args),
    templateLabels: ["Clean sheet", "Corners"],
  },
  {
    index: 5,
    slug: "lAla",
    name: AGENT_NAMES[5],
    role: "Wing-back",
    tacticalPosition: "Right wing-back",
    walletIndex: 5,
    factory: (args) => new LAla(args),
    templateLabels: ["Corners", "Shots on target"],
  },
  {
    index: 6,
    slug: "ilBomber",
    name: AGENT_NAMES[6],
    role: "Pure striker",
    tacticalPosition: "Striker · Right channel",
    walletIndex: 6,
    factory: (args) => new IlBomber(args),
    templateLabels: ["Next goal", "Shots on target"],
  },
  {
    index: 7,
    slug: "ilCapitano",
    name: AGENT_NAMES[7],
    role: "Captain · Left flank",
    tacticalPosition: "Left back · Captain",
    walletIndex: 7,
    factory: (args) => new IlCapitano(args),
    templateLabels: ["Yellow cards", "Fouls"],
  },
  {
    index: 8,
    slug: "ilNumeroDieci",
    name: AGENT_NAMES[8],
    role: "Number 10",
    tacticalPosition: "Attacking midfield · Center",
    walletIndex: 8,
    factory: (args) => new IlNumeroDieci(args),
    templateLabels: ["Possession", "Next goal", "Shots on target"],
  },
  {
    index: 9,
    slug: "ilCatenaccio",
    name: AGENT_NAMES[9],
    role: "Defensive anchor",
    tacticalPosition: "Center back · Right",
    walletIndex: 9,
    factory: (args) => new IlCatenaccio(args),
    templateLabels: ["Clean sheet", "Yellow cards"],
  },
  {
    index: 10,
    slug: "lUltimo",
    name: AGENT_NAMES[10],
    role: "Last line",
    tacticalPosition: "Goalkeeper",
    walletIndex: 10,
    factory: (args) => new LUltimo(args),
    templateLabels: ["Clean sheet"],
  },
] as const;

const BY_SLUG = new Map<PersonaSlug, PersonaDefinition>(
  PERSONA_REGISTRY.map((p) => [p.slug, p]),
);

export const PERSONA_SLUGS: readonly PersonaSlug[] = PERSONA_REGISTRY.map((p) => p.slug);

export function getPersonaDefinition(slug: PersonaSlug): PersonaDefinition {
  const hit = BY_SLUG.get(slug);
  if (!hit) throw new Error(`unknown persona slug: ${slug}`);
  return hit;
}

export function isPersonaSlug(value: unknown): value is PersonaSlug {
  return typeof value === "string" && BY_SLUG.has(value as PersonaSlug);
}
