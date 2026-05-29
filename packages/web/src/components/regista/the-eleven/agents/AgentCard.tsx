"use client";

import { Html } from "@react-three/drei";
import { useCallback, useEffect, useRef, useState } from "react";

import { ELEVEN_PERSONAS } from "@/lib/personas";
import type { PersonaCardProps } from "@/components/landing/PersonaCard";

import { PITCH_HALF_L, PITCH_HALF_W } from "../constants";
import type { FormationSlot } from "../types";

import { useFocus } from "./FocusContext";

const personaBySlug = new Map<string, PersonaCardProps>(
  ELEVEN_PERSONAS.map((p) => [p.persona, p]),
);

/** Debounce window on mouseleave. Long enough to absorb the projection
 *  shift while the camera lerps toward the player (~150–300 ms), short
 *  enough that a genuine cursor exit still feels responsive. */
const LEAVE_DEBOUNCE_MS = 260;

interface AgentCardProps {
  slot: FormationSlot;
}

/**
 * AgentCard — floating glass card rendered inside the R3F stadium scene
 * at a tactical 4-3-3 formation position. Used only on the landing
 * page's TheEleven section.
 *
 * For the navigable dApp persona view (utilitarian hex-corner card,
 * static layout), see src/components/landing/PersonaCard.tsx instead.
 * Both components consume the same ELEVEN_PERSONAS data from
 * src/lib/personas.ts — single source of truth.
 *
 * Two stability mechanisms guard against hover oscillation. When the
 * camera lerps toward the focused player, drei's <Html> re-projects the
 * world position to a new screen pixel — the card visibly slides. Without
 * guards, the card would slide out from under a stationary cursor,
 * fire mouseleave, release focus, slide back, re-fire mouseenter, and
 * loop ("shake").
 *
 *   1. A 24 px transparent hit-area pad wrapping the visible card —
 *      small projection shifts during the lerp stay inside the hover
 *      region.
 *   2. Mouseleave is debounced by {@link LEAVE_DEBOUNCE_MS} ms. If the
 *      cursor re-enters within that window (because the card slid back
 *      under it), the pending release is cancelled and focus is kept.
 */
export function AgentCard({ slot }: AgentCardProps) {
  const persona = personaBySlug.get(slot.persona);
  const [hover, setHover] = useState(false);
  const { setFocused } = useFocus();
  const leaveTimerRef = useRef<number | null>(null);

  // Clear any pending timer when the component unmounts.
  useEffect(() => {
    return () => {
      if (leaveTimerRef.current !== null) {
        window.clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
    };
  }, []);

  const cancelPendingLeave = useCallback(() => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const handleEnter = useCallback(() => {
    cancelPendingLeave();
    setHover(true);
    setFocused(slot.persona);
  }, [cancelPendingLeave, setFocused, slot.persona]);

  const handleLeave = useCallback(() => {
    cancelPendingLeave();
    leaveTimerRef.current = window.setTimeout(() => {
      setHover(false);
      setFocused(null);
      leaveTimerRef.current = null;
    }, LEAVE_DEBOUNCE_MS);
  }, [cancelPendingLeave, setFocused]);

  if (!persona) return null;

  // Map normalized slot coords → world coords.
  //   slot.z (back↔front, goal-to-goal) → world X (the LENGTH axis, 105 m)
  //   slot.x (left↔right, touchline)    → world Z (the WIDTH axis, 68 m)
  const worldX = slot.z * PITCH_HALF_L * 0.82;
  const worldZ = slot.x * PITCH_HALF_W * 0.78;

  return (
    <group position={[worldX, 0.5, worldZ]}>
      {/* Pulse ring on the ground beneath the card */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.9, 1.05, 32]} />
        <meshBasicMaterial
          color={hover ? "#ec652b" : "#fafaf7"}
          transparent
          opacity={hover ? 0.8 : 0.35}
        />
      </mesh>

      <Html
        position={[0, 2.6, 0]}
        center
        distanceFactor={28}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "auto" }}
      >
        {/* Hit-area pad: 24px of transparent space around the visible card
            so projection shifts during the camera focus lerp stay inside
            the hover region. */}
        <div
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          style={{ padding: "24px" }}
        >
          <button
            type="button"
            onFocus={handleEnter}
            onBlur={handleLeave}
            data-persona-card={persona.persona}
            className={[
              "w-[176px] rounded-[10px] border text-left transition-all duration-200",
              "border-white/10 bg-[rgba(8,12,24,0.78)] backdrop-blur-md",
              "shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
              hover
                ? "-translate-y-1 scale-[1.04] border-[var(--color-action-orange)]/70 shadow-[0_14px_40px_rgba(236,101,43,0.35)]"
                : "",
            ].join(" ")}
          >
            <div className="flex items-start justify-between px-3 pt-2.5 pb-1.5">
              <div className="flex items-center gap-2">
                <div
                  aria-hidden
                  className="h-3.5 w-3.5 rounded-sm bg-gradient-to-b from-[var(--color-action-orange)] to-[var(--color-deep-plum)]"
                />
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-action-orange)]">
                  {persona.number.toString().padStart(2, "0")}
                </span>
              </div>
              <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
                {slot.line}
              </span>
            </div>
            <div className="px-3 pb-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white">
                {persona.name}
              </div>
              <div className="mt-0.5 text-[10px] text-white/65">
                {persona.role}
              </div>
            </div>
            <div className="mx-3 mt-1 h-px bg-white/10" />
            <div className="px-3 py-1.5">
              <div className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/40">
                Markets
              </div>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {persona.templates.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-[4px] bg-white/[0.06] px-1.5 py-[2px] text-[9px] text-white/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </button>
        </div>
      </Html>
    </group>
  );
}
