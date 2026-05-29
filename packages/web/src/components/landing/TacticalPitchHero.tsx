import { PitchBoard } from "./pitch/PitchBoard";
import { PlayerSprite, type SpriteState } from "./pitch/PlayerSprite";
import {
  FORMATION_4_3_1_2,
  FORMATION_ORDER,
  PERSONA_SHORT_NAME,
  type PersonaSlug,
} from "./pitch/PositionGrid";

interface TacticalPitchHeroProps {
  /**
   * Per-persona sprite state. Any persona not listed defaults to "idle".
   * State changes flow ONLY from props — no internal timers fake activity.
   */
  states?: Partial<Record<PersonaSlug, SpriteState>>;
  className?: string;
}

export function TacticalPitchHero({ states, className }: TacticalPitchHeroProps) {
  return (
    <div
      className={
        "relative mx-auto aspect-[16/10] w-full max-w-[720px] overflow-hidden rounded-[12px] shadow-[var(--shadow-elevated)] max-h-[50vh] [@media(min-width:380px)]:max-h-[60vh] sm:max-h-none " +
        (className ?? "")
      }
      tabIndex={0}
    >
      <PitchBoard className="absolute inset-0" />

      {FORMATION_ORDER.map((persona, i) => {
        const pos = FORMATION_4_3_1_2[persona];
        const state = states?.[persona] ?? "idle";
        return (
          <div
            key={persona}
            className="absolute w-[6%] sm:w-[5%] md:w-[4.5%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            aria-hidden
          >
            <PlayerSprite persona={persona} state={state} index={i} />
          </div>
        );
      })}

      <ul className="sr-only" aria-label="Eleven AI-agent personas in 4-3-1-2 formation">
        {FORMATION_ORDER.map((persona) => (
          <li key={persona}>{PERSONA_SHORT_NAME[persona]}</li>
        ))}
      </ul>

    </div>
  );
}
