"use client";

import { PITCH_HALF_L, PITCH_HALF_W } from "../constants";

/**
 * Minimal stadium shell — an outer floor ring (concrete/dark) + a low
 * raised lip suggesting first-row seating around the pitch. Bowl
 * architecture stays implied, not modeled, so the bundle stays lean.
 */
export function StadiumShell() {
  // OUTER_* are the bounds of the stadium ring. They MUST sit outside
  // the pitch — i.e. OUTER_W/2 > PITCH_HALF_W and OUTER_L/2 > PITCH_HALF_L.
  // Symmetric multipliers off the half-dimensions keep that invariant:
  // 2.6 × half = 1.3 × full → the ring is 30% larger than the pitch on
  // each axis, so the lip lands behind the goal line and the touchline,
  // never in front of the posts.
  const OUTER_W = PITCH_HALF_W * 2.6;
  const OUTER_L = PITCH_HALF_L * 2.6;
  const LIP_H = 1.8;
  const LIP_THICKNESS = 4;

  return (
    <group>
      {/* Dark stadium floor under everything (catches floodlight spill) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[OUTER_L * 3, OUTER_W * 3]} />
        <meshStandardMaterial color="#06080f" roughness={1} metalness={0} />
      </mesh>

      {/* Front lip — front row barrier around the pitch perimeter */}
      <group position={[0, LIP_H / 2, 0]}>
        {/* Long sides (touchlines) */}
        <mesh
          position={[0, 0, OUTER_W / 2 - LIP_THICKNESS / 2 - PITCH_HALF_W * 0.05]}
        >
          <boxGeometry args={[OUTER_L, LIP_H, LIP_THICKNESS]} />
          <meshStandardMaterial
            color="#0b0e18"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>
        <mesh
          position={[0, 0, -(OUTER_W / 2 - LIP_THICKNESS / 2 - PITCH_HALF_W * 0.05)]}
        >
          <boxGeometry args={[OUTER_L, LIP_H, LIP_THICKNESS]} />
          <meshStandardMaterial
            color="#0b0e18"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>
        {/* Short sides (behind goals) */}
        <mesh
          position={[OUTER_L / 2 - LIP_THICKNESS / 2 - PITCH_HALF_L * 0.05, 0, 0]}
        >
          <boxGeometry args={[LIP_THICKNESS, LIP_H, OUTER_W]} />
          <meshStandardMaterial
            color="#0b0e18"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>
        <mesh
          position={[-(OUTER_L / 2 - LIP_THICKNESS / 2 - PITCH_HALF_L * 0.05), 0, 0]}
        >
          <boxGeometry args={[LIP_THICKNESS, LIP_H, OUTER_W]} />
          <meshStandardMaterial
            color="#0b0e18"
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>
      </group>
    </group>
  );
}
