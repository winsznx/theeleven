"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";

import { BACKDROP_COLOR, PITCH_HALF_L } from "./constants";
import { CameraDirector } from "./camera/CameraDirector";
import { PostFX } from "./effects/PostFX";
import { FocusProvider } from "./agents/FocusContext";
import { FormationLayout } from "./agents/FormationLayout";
import { Goal } from "./pitch/Goal";
import { Pitch } from "./pitch/Pitch";
import { Floodlights } from "./stadium/Floodlights";
import { StadiumShell } from "./stadium/StadiumShell";
import type { SceneMode } from "./useSceneMode";

interface SceneProps {
  /** Accessibility + data-saver-driven render mode (see useSceneMode). */
  sceneMode: SceneMode;
}

/**
 * Top-level R3F scene. Mounted by the lazy dynamic loader in index.tsx.
 *
 * sceneMode gates two animation/perf boundaries:
 *   - "full"     → camera orbits + Bloom + Vignette
 *   - "static"   → camera frozen at rest, postprocessing kept
 *   - "minimal"  → camera frozen, postprocessing skipped (raw render)
 */
export function Scene({ sceneMode }: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 48, -PITCH_HALF_L * 1.55], fov: 35, near: 0.1, far: 600 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        scene.background = new THREE.Color(BACKDROP_COLOR);
        scene.fog = new THREE.Fog(BACKDROP_COLOR, PITCH_HALF_L * 1.4, PITCH_HALF_L * 3);
      }}
    >
      <Suspense fallback={null}>
        <FocusProvider>
          <ambientLight intensity={0.32} color="#9faecd" />
          {/* Cool key from above to keep the pitch readable when floodlights wash. */}
          <hemisphereLight args={["#d6e4ff", "#1a1d28", 0.45]} />

          <StadiumShell />
          <Pitch />
          {/* Both goals open toward midfield: the back frame extends OUT
              past the goal line, the mouth faces the pitch. */}
          <Goal x={-PITCH_HALF_L * 0.995} facingX={1} />
          <Goal x={PITCH_HALF_L * 0.995} facingX={-1} />
          <Floodlights />
          <FormationLayout />

          <CameraDirector enabled={sceneMode === "full"} />
          {sceneMode !== "minimal" && <PostFX />}
        </FocusProvider>
      </Suspense>
    </Canvas>
  );
}
