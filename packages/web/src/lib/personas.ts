import type { PersonaCardProps } from "@/components/landing/PersonaCard";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

/**
 * Canonical persona metadata — the single source of truth shared by the
 * landing TheEleven, the dApp /agents routes, and the /status page.
 *
 * P21: every persona is active. The agent runtime spawns all 11 via
 * `pnpm --filter @regista11/agent agent:start <fixtureId> --persona=all`.
 * The `templates` array on each entry MUST stay in lock-step with
 * `packages/agent/src/personas/registry.ts`'s `templateLabels` — both
 * files spell the same strings; mirror them in the same PR if they change.
 *
 * Order matches the formation reading flow on desktop (back to front).
 */
export const ELEVEN_PERSONAS: PersonaCardProps[] = [
  {
    persona: "l-ultimo",
    number: 11,
    name: "L'Ultimo",
    role: "Last line",
    tacticalPosition: "Goalkeeper",
    templates: ["Clean sheet"],
  },
  {
    persona: "il-libero",
    number: 5,
    name: "Il Libero",
    role: "Sweeper",
    tacticalPosition: "Center back · Sweeper",
    templates: ["Clean sheet", "Corners"],
  },
  {
    persona: "il-catenaccio",
    number: 10,
    name: "Il Catenaccio",
    role: "Defensive anchor",
    tacticalPosition: "Center back · Right",
    templates: ["Clean sheet", "Yellow cards"],
  },
  {
    persona: "il-capitano",
    number: 8,
    name: "Il Capitano",
    role: "Captain · Left flank",
    tacticalPosition: "Left back · Captain",
    templates: ["Yellow cards", "Fouls"],
  },
  {
    persona: "l-ala",
    number: 6,
    name: "L'Ala",
    role: "Wing-back",
    tacticalPosition: "Right wing-back",
    templates: ["Corners", "Shots on target"],
  },
  {
    persona: "il-mediano",
    number: 3,
    name: "Il Mediano",
    role: "Defensive enforcer",
    tacticalPosition: "Defensive midfield · Left",
    templates: ["Fouls", "Yellow cards"],
  },
  {
    persona: "il-regista",
    number: 1,
    name: "Il Regista",
    role: "Deep-lying playmaker",
    tacticalPosition: "Defensive midfield · Center axis",
    templates: ["Clean sheet", "Possession", "Corners"],
  },
  {
    persona: "il-trequartista",
    number: 2,
    name: "Il Trequartista",
    role: "Creative attacker",
    tacticalPosition: "Box-to-box midfield · Right",
    templates: ["Next goal", "Shots on target", "Corners"],
  },
  {
    persona: "il-numero-dieci",
    number: 9,
    name: "Il Numero Dieci",
    role: "Number 10",
    tacticalPosition: "Attacking midfield · Center",
    templates: ["Possession", "Next goal", "Shots on target"],
  },
  {
    persona: "il-falso-nove",
    number: 4,
    name: "Il Falso Nove",
    role: "False nine",
    tacticalPosition: "Forward · Drops to midfield",
    templates: ["Shots on target", "Possession", "Next goal"],
  },
  {
    persona: "il-bomber",
    number: 7,
    name: "Il Bomber",
    role: "Pure striker",
    tacticalPosition: "Striker · Right channel",
    templates: ["Next goal", "Shots on target"],
  },
];

const BY_SLUG: Map<PersonaSlug, PersonaCardProps> = new Map(
  ELEVEN_PERSONAS.map((p) => [p.persona, p]),
);

export function getPersona(slug: PersonaSlug): PersonaCardProps | null {
  return BY_SLUG.get(slug) ?? null;
}

export function isPersonaSlug(value: unknown): value is PersonaSlug {
  return typeof value === "string" && BY_SLUG.has(value as PersonaSlug);
}

/**
 * Convert an agent display name ("Il Regista", "L'Ala") to a persona slug.
 * Drops apostrophes, lowercases, replaces spaces with hyphens. Returns null
 * for unknown names so the caller can surface a "unknown persona" state.
 */
export function nameToPersonaSlug(name: string): PersonaSlug | null {
  const slug = name
    .toLowerCase()
    .replace(/[’']/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") as PersonaSlug;
  return BY_SLUG.has(slug) ? slug : null;
}
