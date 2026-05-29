"use client";

import { useMemo } from "react";
import * as THREE from "three";

import {
  GRASS_BASE,
  GRASS_STRIPE,
  LINE_COLOR,
  PITCH_HALF_L,
  PITCH_HALF_W,
  PITCH_LENGTH,
  PITCH_WIDTH,
} from "../constants";

/**
 * Builds a high-res canvas texture for the pitch: mowing stripes baked
 * into the diffuse + crisp white markings overlaid via Canvas2D. Doing it
 * this way (rather than separate stripe mesh / line geometry) keeps the
 * pitch a single draw call and the texture lives in the lazy chunk.
 */
function usePitchTexture(): THREE.Texture {
  return useMemo(() => {
    const TEX_W = 2048;
    const TEX_H = Math.round(TEX_W * (PITCH_WIDTH / PITCH_LENGTH));
    const canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d")!;

    // Mowing stripes — 14 vertical bands alternating base / striped.
    const STRIPES = 14;
    const stripeW = TEX_W / STRIPES;
    for (let i = 0; i < STRIPES; i++) {
      ctx.fillStyle = i % 2 === 0 ? GRASS_BASE : GRASS_STRIPE;
      ctx.fillRect(i * stripeW, 0, stripeW + 1, TEX_H);
    }

    // White line markings — drawn in pitch-meter coords scaled to texture.
    const PX_PER_M = TEX_W / PITCH_LENGTH;
    const margin = 4 * PX_PER_M; // visual breathing room from texture edges

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 0.18 * PX_PER_M;
    ctx.lineCap = "square";

    // Touchlines + goal lines (outer rect)
    const innerX = margin;
    const innerY = margin;
    const innerW = TEX_W - margin * 2;
    const innerH = TEX_H - margin * 2;
    ctx.strokeRect(innerX, innerY, innerW, innerH);

    // Halfway line
    ctx.beginPath();
    ctx.moveTo(TEX_W / 2, innerY);
    ctx.lineTo(TEX_W / 2, innerY + innerH);
    ctx.stroke();

    // Center circle (r = 9.15 m)
    ctx.beginPath();
    ctx.arc(TEX_W / 2, TEX_H / 2, 9.15 * PX_PER_M, 0, Math.PI * 2);
    ctx.stroke();
    // Center spot
    ctx.fillStyle = LINE_COLOR;
    ctx.beginPath();
    ctx.arc(TEX_W / 2, TEX_H / 2, 0.4 * PX_PER_M, 0, Math.PI * 2);
    ctx.fill();

    // Penalty + goal areas (both ends)
    const drawBox = (cx: number, depthM: number, widthM: number) => {
      const w = widthM * PX_PER_M;
      const d = depthM * PX_PER_M;
      ctx.strokeRect(cx - d / 2, TEX_H / 2 - w / 2, d, w);
    };
    // Penalty area is 40.32 m wide × 16.5 m deep — anchored to the goal line.
    const penaltyDepth = 16.5 * PX_PER_M;
    const penaltyWidth = 40.32 * PX_PER_M;
    // Left penalty box
    ctx.strokeRect(
      innerX,
      TEX_H / 2 - penaltyWidth / 2,
      penaltyDepth,
      penaltyWidth,
    );
    // Right penalty box
    ctx.strokeRect(
      innerX + innerW - penaltyDepth,
      TEX_H / 2 - penaltyWidth / 2,
      penaltyDepth,
      penaltyWidth,
    );
    // Goal areas (18.32 m × 5.5 m)
    const goalAreaDepth = 5.5 * PX_PER_M;
    const goalAreaWidth = 18.32 * PX_PER_M;
    ctx.strokeRect(
      innerX,
      TEX_H / 2 - goalAreaWidth / 2,
      goalAreaDepth,
      goalAreaWidth,
    );
    ctx.strokeRect(
      innerX + innerW - goalAreaDepth,
      TEX_H / 2 - goalAreaWidth / 2,
      goalAreaDepth,
      goalAreaWidth,
    );

    // Penalty spots (11 m from goal line)
    const penaltySpotDist = 11 * PX_PER_M;
    ctx.beginPath();
    ctx.arc(innerX + penaltySpotDist, TEX_H / 2, 0.4 * PX_PER_M, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      innerX + innerW - penaltySpotDist,
      TEX_H / 2,
      0.4 * PX_PER_M,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Penalty arcs (D)
    const arcRadius = 9.15 * PX_PER_M;
    ctx.beginPath();
    ctx.arc(
      innerX + penaltySpotDist,
      TEX_H / 2,
      arcRadius,
      -Math.acos(penaltyDepth / arcRadius - penaltySpotDist / arcRadius),
      Math.acos(penaltyDepth / arcRadius - penaltySpotDist / arcRadius),
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      innerX + innerW - penaltySpotDist,
      TEX_H / 2,
      arcRadius,
      Math.PI - Math.acos(penaltyDepth / arcRadius - penaltySpotDist / arcRadius),
      Math.PI + Math.acos(penaltyDepth / arcRadius - penaltySpotDist / arcRadius),
    );
    ctx.stroke();

    // Corner arcs (r = 1 m)
    const corner = 1 * PX_PER_M;
    const corners: Array<[number, number, number, number]> = [
      [innerX, innerY, 0, Math.PI / 2],
      [innerX + innerW, innerY, Math.PI / 2, Math.PI],
      [innerX + innerW, innerY + innerH, Math.PI, (3 * Math.PI) / 2],
      [innerX, innerY + innerH, (3 * Math.PI) / 2, Math.PI * 2],
    ];
    for (const [cx, cy, a0, a1] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, corner, a0, a1);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
}

/** The pitch plane: textured grass with mowing stripes + FIFA markings. */
export function Pitch() {
  const tex = usePitchTexture();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[PITCH_LENGTH, PITCH_WIDTH]} />
      <meshStandardMaterial
        map={tex}
        roughness={0.95}
        metalness={0}
        // Subtle emissive lift so the pitch reads even at low ambient.
        emissive={"#0a1a08"}
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

/** Re-exported for the goal placement helpers. */
export { PITCH_HALF_L, PITCH_HALF_W };
