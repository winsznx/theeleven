"use client";

import { useMemo } from "react";
import * as THREE from "three";

import {
  FLOODLIGHT_HEIGHT,
  FLOODLIGHT_INTENSITY,
  PITCH_HALF_L,
  PITCH_HALF_W,
} from "../constants";

/**
 * Four corner floodlight rigs. Each rig is a thin metal pylon with a
 * gantry of light fixtures + a SpotLight aimed at the center circle.
 *
 * Bloom in the post pipeline picks up the high-emissive fixture meshes,
 * giving the corner-flood "starburst" look without ray-marched volumetrics.
 */
export function Floodlights() {
  const corners: Array<[number, number]> = useMemo(
    () => [
      [-PITCH_HALF_L * 1.1, -PITCH_HALF_W * 1.15],
      [PITCH_HALF_L * 1.1, -PITCH_HALF_W * 1.15],
      [PITCH_HALF_L * 1.1, PITCH_HALF_W * 1.15],
      [-PITCH_HALF_L * 1.1, PITCH_HALF_W * 1.15],
    ],
    [],
  );

  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, 0);
    return o;
  }, []);

  return (
    <>
      <primitive object={target} />
      {corners.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Pylon */}
          <mesh position={[0, FLOODLIGHT_HEIGHT / 2, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.4, FLOODLIGHT_HEIGHT, 8]} />
            <meshStandardMaterial
              color="#1a1d28"
              metalness={0.8}
              roughness={0.4}
            />
          </mesh>
          {/* Gantry — emissive lamp head, picked up by bloom */}
          <mesh position={[0, FLOODLIGHT_HEIGHT, 0]}>
            <boxGeometry args={[2.6, 0.45, 1.4]} />
            <meshStandardMaterial
              color="#fafaf7"
              emissive="#fff4d6"
              emissiveIntensity={4}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
          {/* SpotLight aimed at pitch center */}
          <spotLight
            position={[0, FLOODLIGHT_HEIGHT, 0]}
            target={target}
            angle={0.55}
            penumbra={0.6}
            intensity={FLOODLIGHT_INTENSITY * 1200}
            distance={260}
            decay={1.5}
            color="#fff4d6"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0005}
          />
        </group>
      ))}
    </>
  );
}
