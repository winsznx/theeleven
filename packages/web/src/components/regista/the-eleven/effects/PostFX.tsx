"use client";

import {
  Bloom,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

/**
 * Cinematic post pipeline:
 *   - Bloom: picks up the emissive floodlight fixtures + the card pulse
 *     rings, giving the "broadcast night" glow.
 *   - Vignette: pulls focus toward the center of the pitch where the
 *     formation lives, lets the stadium edges fall to black.
 * No film grain / tone curve overrides — Three's ACES default is already
 * close to what we want and adding a LUT chunk for marginal taste isn't
 * worth the bytes.
 */
export function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={0.65}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.18}
        mipmapBlur
      />
      <Vignette
        eskil={false}
        offset={0.25}
        darkness={0.85}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
