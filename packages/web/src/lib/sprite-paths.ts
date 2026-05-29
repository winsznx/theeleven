import { KITS, SHOE, SKIN } from "@/components/landing/pitch/kits";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

/**
 * Server-friendly sprite data for the next/og ImageResponse.
 *
 * The P14 `<PlayerSprite />` React component is `"use client"` (uses
 * Framer Motion's useReducedMotion hook), so it can't render inside the
 * edge-runtime image route. This module mirrors the same kit palette and
 * returns the same 8×13 viewBox rect set as plain data.
 *
 * Caller renders inline SVG via `getSpriteRects(persona).map(r => …)`.
 */

export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

const WHITE = "#ffffff";
const PITCH_SHADOW = "#0e1f0e";

export const SPRITE_VIEWBOX_WIDTH = 8;
export const SPRITE_VIEWBOX_HEIGHT = 13;

export function getSpriteRects(persona: PersonaSlug): SpriteRect[] {
  const kit = KITS[persona];
  const rects: SpriteRect[] = [
    // 1px shadow row at the bottom of the viewBox.
    { x: 2, y: 12, w: 4, h: 1, fill: PITCH_SHADOW },
    // Head (3×2, centered on the 8-wide canvas).
    { x: 2.5, y: 0, w: 3, h: 2, fill: SKIN },
    // Torso (4×4).
    { x: 2, y: 3, w: 4, h: 4, fill: kit.jersey },
    // Shorts (4×3).
    { x: 2, y: 7, w: 4, h: 3, fill: kit.shorts },
    // Legs (skin, 4×1).
    { x: 2, y: 10, w: 4, h: 1, fill: SKIN },
    // Shoes (4×1).
    { x: 2, y: 11, w: 4, h: 1, fill: SHOE },
  ];

  if (kit.marker === "armband") {
    // Il Capitano — single white pixel at top-left of torso.
    rects.push({ x: 2, y: 3, w: 1, h: 1, fill: WHITE });
  } else if (kit.marker === "gloves") {
    // L'Ultimo (GK) — two white pixels just outside the torso at row 4.
    rects.push({ x: 1, y: 4, w: 1, h: 1, fill: WHITE });
    rects.push({ x: 6, y: 4, w: 1, h: 1, fill: WHITE });
  }

  return rects;
}
