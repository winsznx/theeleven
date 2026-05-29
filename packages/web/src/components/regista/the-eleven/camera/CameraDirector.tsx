"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { useFocus } from "../agents/FocusContext";
import { FORMATION_4_3_3, PITCH_HALF_L, PITCH_HALF_W } from "../constants";

/**
 * Camera choreography:
 *   - Default: slow orbital drift around the pitch center with subtle
 *     mouse parallax. Idle-cinematic establishing read.
 *   - Hover focus: when an AgentCard sets `focused` via context, the
 *     camera lerps to a close-up shot of that player's world position.
 *     drei's <Html distanceFactor> auto-grows the card so its body copy
 *     becomes legible.
 *   - Damped lerp keeps every transition filmic — both default↔focus
 *     and parallax tracking use a smoothing factor that's frame-rate
 *     independent (clamped 1 - exp(-k*dt)).
 */

/** Smoothed frame-rate-independent lerp coefficient. */
function damp(coef: number, dt: number): number {
  return 1 - Math.exp(-coef * dt);
}

/** Compute the world-space pitch position for a slot — MUST mirror the
 *  math in AgentCard so the camera lands centered on the card. The
 *  formation runs along world X (goal-to-goal); touchline is world Z. */
function slotToWorld(slot: { x: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(
    slot.z * PITCH_HALF_L * 0.82,
    0,
    slot.x * PITCH_HALF_W * 0.78,
  );
}

/** Fixed camera offset used for every focus shot. Approaches from the
 *  same touchline side (negative Z) for every player, just at the
 *  player's X — so transitions never flip across the pitch. */
const FOCUS_OFFSET = new THREE.Vector3(0, 14, -26);

interface CameraDirectorProps {
  /** When false (reduced-motion / save-data), the orbit + parallax frame
   *  loop is skipped entirely. Camera holds its initial Canvas-prop
   *  position. Hover focus is also gated on this so the scene reads as
   *  a calm static still under reduced motion. */
  enabled: boolean;
}

export function CameraDirector({ enabled }: CameraDirectorProps) {
  const { camera, mouse } = useThree();
  const { focused } = useFocus();

  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const t0 = useRef<number | null>(null);

  // Pre-bake world positions for every slot once.
  const slotWorld = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    for (const slot of FORMATION_4_3_3) {
      map.set(slot.persona, slotToWorld(slot));
    }
    return map;
  }, []);

  // Reusable scratch vectors so we don't allocate every frame.
  const tmpPos = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    if (!enabled) return; // sceneMode "static" / "minimal" — freeze camera
    if (t0.current === null) t0.current = 0;
    t0.current += dt;
    const t = t0.current;

    const focusedPos = focused ? slotWorld.get(focused) ?? null : null;

    if (focusedPos) {
      // Focus shot: same fixed offset for every player so the camera
      // never flips across the pitch on hover. Always approaches the
      // player from negative-Z side (the closest touchline), at 14 m
      // height. drei's <Html distanceFactor> auto-grows the card.
      tmpPos.current.copy(focusedPos).add(FOCUS_OFFSET);
      tmpLook.current.set(focusedPos.x, 2.6, focusedPos.z);
    } else {
      // Default orbit: wide elevated establishing shot, slow yaw drift.
      const radius = PITCH_HALF_L * 1.55;
      const baseAngle = -Math.PI / 2;
      const drift = Math.sin(t * 0.08) * 0.18;
      const angle = baseAngle + drift;
      const y = 48 + Math.sin(t * 0.14) * 2.2;
      tmpPos.current.set(
        Math.cos(angle) * radius + mouse.x * 4,
        y,
        Math.sin(angle) * radius * 0.4 + mouse.y * 3,
      );
      tmpLook.current.set(mouse.x * 6, 2, mouse.y * 4);
    }

    // Damp toward target position — faster when focusing (snappy hover),
    // slower in idle (filmic drift).
    const posK = focusedPos ? 5.5 : 1.4;
    const lookK = focusedPos ? 6.5 : 2.0;
    camera.position.lerp(tmpPos.current, damp(posK, dt));
    lookTarget.current.lerp(tmpLook.current, damp(lookK, dt));
    camera.lookAt(lookTarget.current);
  });

  return null;
}
