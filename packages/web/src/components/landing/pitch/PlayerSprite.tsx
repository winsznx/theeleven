"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";

import { KITS, SHOE, SKIN } from "./kits";
import type { PersonaSlug } from "./PositionGrid";

/**
 * 8×12 pixel sprite (+ 1px shadow row = 13 high) for an AI-agent persona.
 *
 * Rendered with shape-rendering="crispEdges" so each viewBox unit snaps to
 * the device pixel grid — pixel-art aesthetic, Sensible Soccer DNA.
 *
 * Kits and palette live in ./kits.ts so TxHashStrip and other surfaces can
 * reuse persona color codes without duplicating the table.
 */

export type SpriteState = "idle" | "scanning" | "proposing" | "firing";

interface PlayerSpriteProps {
  persona: PersonaSlug;
  state?: SpriteState;
  /** Used for staggered idle breathing so all 11 don't move in sync. */
  index?: number;
  className?: string;
}

export function PlayerSprite({
  persona,
  state = "idle",
  index = 0,
  className,
}: PlayerSpriteProps) {
  const kit = KITS[persona];
  const reduce = useReducedMotion() ?? false;

  const breathing = reduce
    ? {}
    : {
        animate: { y: [0, -1, 0, 1, 0] },
        transition: {
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: (index % 11) * 0.1,
        },
      };

  return (
    <div
      className={cn("relative pointer-events-none", className)}
      data-persona={persona}
      data-state={state}
    >
      {(state === "proposing" || state === "firing") && !reduce && (
        <motion.div
          aria-hidden
          data-pulse={state}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "180%",
            height: "180%",
            background:
              "radial-gradient(circle, var(--color-pitch-gold) 0%, transparent 70%)",
            opacity: state === "firing" ? 0.6 : 0.3,
          }}
          animate={{
            scale: state === "firing" ? [1, 3] : [1, 2],
            opacity: [state === "firing" ? 0.6 : 0.3, 0],
          }}
          transition={{
            duration: state === "firing" ? 1.2 : 0.6,
            repeat: Infinity,
            repeatDelay: state === "firing" ? 0 : 0.2,
            ease: "easeOut",
          }}
        />
      )}

      <svg
        viewBox="0 0 8 13"
        shapeRendering="crispEdges"
        className="block h-auto w-full"
        style={{ overflow: "visible" }}
        aria-hidden
      >
        <motion.g {...breathing}>
          <rect x={2} y={12} width={4} height={1} fill="var(--color-pitch-shadow)" />

          <rect x={2.5} y={0} width={3} height={2} fill={SKIN} />

          <rect x={2} y={3} width={4} height={4} fill={kit.jersey} />

          <rect x={2} y={7} width={4} height={3} fill={kit.shorts} />

          <rect x={2} y={10} width={4} height={1} fill={SKIN} />

          <rect x={2} y={11} width={4} height={1} fill={SHOE} />

          {kit.marker === "armband" && (
            <rect x={2} y={3} width={1} height={1} fill="var(--color-pitch-line)" />
          )}

          {kit.marker === "gloves" && (
            <>
              <rect x={1} y={4} width={1} height={1} fill="var(--color-pitch-line)" />
              <rect x={6} y={4} width={1} height={1} fill="var(--color-pitch-line)" />
            </>
          )}
        </motion.g>

        {state === "scanning" && !reduce && (
          <motion.rect
            x={1.5}
            y={-0.5}
            width={5}
            height={13}
            fill="none"
            stroke="var(--color-pitch-line)"
            strokeWidth={0.3}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 0.4,
            }}
          />
        )}
      </svg>
    </div>
  );
}
