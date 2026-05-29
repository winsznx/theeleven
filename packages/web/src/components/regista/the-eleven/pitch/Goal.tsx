"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * FIFA goal: 7.32 m wide × 2.44 m high. Built from cylinders for the
 * posts + crossbar, a back frame (2 sloped back-supports + bottom bar),
 * and a procedural net mesh (line segments) for the back of the goal.
 *
 * `facing = "in"` means the goal opens toward +z (defending end). Mirror
 * via parent rotation/position to put one at each goal line.
 */
const GOAL_WIDTH = 7.32;
const GOAL_HEIGHT = 2.44;
const POST_R = 0.06;
const NET_DEPTH = 2.0;
const NET_DROP = 0.4; // how far the net sags at the back

const POST_MAT = (
  <meshStandardMaterial
    color="#f3f4f7"
    metalness={0.85}
    roughness={0.25}
  />
);

function NetMesh() {
  // Build a wireframe-ish back net + roof + side nets out of line segments.
  // Spacing matches the broadcast look — not a perfectly accurate mesh.
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const CELL = 0.18; // cell size in meters

    const w = GOAL_WIDTH;
    const h = GOAL_HEIGHT;
    const d = NET_DEPTH;

    // Helper: push a line segment a→b
    const seg = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
    ) => {
      positions.push(ax, ay, az, bx, by, bz);
    };

    // Back wall (curving slightly down at the bottom for the sag)
    const backZ = d;
    for (let x = -w / 2; x <= w / 2 + 0.001; x += CELL) {
      // Sag: bottom rear of net droops down by NET_DROP at extremes.
      seg(x, 0, backZ - NET_DROP * 0.25, x, h, backZ);
    }
    for (let y = 0; y <= h + 0.001; y += CELL) {
      seg(-w / 2, y, backZ, w / 2, y, backZ);
    }

    // Roof (top — slopes from crossbar back to top of back wall)
    for (let x = -w / 2; x <= w / 2 + 0.001; x += CELL) {
      seg(x, h, 0, x, h, backZ);
    }
    for (let z = 0; z <= backZ + 0.001; z += CELL) {
      seg(-w / 2, h, z, w / 2, h, z);
    }

    // Side nets (left + right)
    for (let z = 0; z <= backZ + 0.001; z += CELL) {
      // left side
      seg(-w / 2, 0, z, -w / 2, h, z);
      // right side
      seg(w / 2, 0, z, w / 2, h, z);
    }
    for (let y = 0; y <= h + 0.001; y += CELL) {
      seg(-w / 2, y, 0, -w / 2, y, backZ);
      seg(w / 2, y, 0, w / 2, y, backZ);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    return geom;
  }, []);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#dfe2ea",
        transparent: true,
        opacity: 0.55,
      }),
    [],
  );

  return <lineSegments geometry={geometry} material={material} />;
}

interface GoalProps {
  /** World-space x position of the goal-line center. */
  x: number;
  /** Which world-X direction the goal MOUTH (opening) faces.
   *  +1 means the goal opens toward +X (use for the LEFT goal at -X end).
   *  -1 means it opens toward -X (use for the RIGHT goal at +X end). */
  facingX: 1 | -1;
}

export function Goal({ x, facingX }: GoalProps) {
  // The default geometry (sx=+1) opens toward -X: the mouth posts sit at
  // X=0 and the back frame extends to X=+NET_DEPTH. To make the goal
  // open toward +X instead, flip the X scale so the back frame lands at
  // X=-NET_DEPTH.
  const sx = facingX === -1 ? 1 : -1;
  return (
    <group position={[x, 0, 0]}>
      <group scale={[sx, 1, 1]}>
        {/* Left post */}
        <mesh position={[0, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2]} castShadow>
          <cylinderGeometry args={[POST_R, POST_R, GOAL_HEIGHT, 12]} />
          {POST_MAT}
        </mesh>
        {/* Right post */}
        <mesh position={[0, GOAL_HEIGHT / 2, GOAL_WIDTH / 2]} castShadow>
          <cylinderGeometry args={[POST_R, POST_R, GOAL_HEIGHT, 12]} />
          {POST_MAT}
        </mesh>
        {/* Crossbar */}
        <mesh
          position={[0, GOAL_HEIGHT, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry
            args={[POST_R, POST_R, GOAL_WIDTH + POST_R * 2, 12]}
          />
          {POST_MAT}
        </mesh>
        {/* Back frame — top bar */}
        <mesh
          position={[NET_DEPTH, GOAL_HEIGHT - NET_DROP * 0.1, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry
            args={[POST_R * 0.7, POST_R * 0.7, GOAL_WIDTH, 8]}
          />
          {POST_MAT}
        </mesh>
        {/* Back frame — sloped supports */}
        <mesh
          position={[NET_DEPTH / 2, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2]}
          rotation={[0, 0, -Math.atan2(NET_DROP * 0.1, NET_DEPTH)]}
        >
          <cylinderGeometry
            args={[POST_R * 0.6, POST_R * 0.6, NET_DEPTH * 1.05, 8]}
          />
          {POST_MAT}
        </mesh>
        <mesh
          position={[NET_DEPTH / 2, GOAL_HEIGHT / 2, GOAL_WIDTH / 2]}
          rotation={[0, 0, -Math.atan2(NET_DROP * 0.1, NET_DEPTH)]}
        >
          <cylinderGeometry
            args={[POST_R * 0.6, POST_R * 0.6, NET_DEPTH * 1.05, 8]}
          />
          {POST_MAT}
        </mesh>
        {/* The net */}
        <group rotation={[0, -Math.PI / 2, 0]} position={[0, 0, 0]}>
          <NetMesh />
        </group>
      </group>
    </group>
  );
}
