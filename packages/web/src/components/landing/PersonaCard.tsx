/**
 * PersonaCard — utilitarian persona card for the dApp routes
 * (/agents grid, /agents/[slug] header). Hex-corner Column chrome,
 * static layout, navigable.
 *
 * For the cinematic 3D stadium scene on the landing page, see
 * src/components/regista/the-eleven/agents/AgentCard.tsx instead.
 * Both components consume the same ELEVEN_PERSONAS data from
 * src/lib/personas.ts — single source of truth.
 */

import { HexCard } from "./HexCard";
import { PlayerSprite } from "./pitch/PlayerSprite";
import type { PersonaSlug } from "./pitch/PositionGrid";

export interface PersonaCardProps {
  persona: PersonaSlug;
  /** Display name — "Il Regista", "Il Trequartista", … */
  name: string;
  /** One-line role label — "Deep-lying playmaker". */
  role: string;
  /** Position string — "Defensive midfield · Center axis". */
  tacticalPosition: string;
  /** User-facing template labels (must match agent's PERSONA_REGISTRY). */
  templates: string[];
  /** 1-indexed persona number ("01" … "11"). */
  number: number;
}

/**
 * P21: every persona is active. The pre-WC status discriminator that
 * shipped in P15 has been removed; PERSONA_REGISTRY on the agent side
 * now spawns all 11 via `--persona=all`.
 */
export function PersonaCard({
  persona,
  name,
  role,
  tacticalPosition,
  templates,
  number,
}: PersonaCardProps) {
  return (
    <HexCard innerClassName="flex h-full flex-col gap-4 p-6">
      <div className="flex items-start justify-between">
        <div className="w-8 flex-shrink-0" data-sprite-size="32x48">
          <PlayerSprite persona={persona} />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-slate-text)] tabular-nums">
          {number.toString().padStart(2, "0")}
        </span>
      </div>

      <div className="space-y-1">
        <h3 className="text-[14px] font-semibold uppercase tracking-[0.04em] text-[var(--color-deep-plum)]">
          {name}
        </h3>
        <p className="text-[14px] text-[var(--color-charcoal-text)]">{role}</p>
      </div>

      <div className="space-y-1">
        <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
          Tactical position
        </span>
        <span className="block text-[13px] text-[var(--color-charcoal-text)]">
          {tacticalPosition}
        </span>
      </div>

      <div className="h-px bg-[var(--color-steel-gray)]" role="separator" />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            data-status="active"
            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success-moss)]"
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-charcoal-text)]">
            Active
          </span>
        </div>

        <ul className="space-y-1 text-[13px] text-[var(--color-charcoal-text)]">
          {templates.map((template) => (
            <li key={template} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-[var(--color-deep-plum)]"
              />
              <span>{template}</span>
            </li>
          ))}
        </ul>
      </div>
    </HexCard>
  );
}
