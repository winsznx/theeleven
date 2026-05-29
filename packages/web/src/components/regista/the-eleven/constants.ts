import type { FormationSlot } from "./types";

/** Pitch dimensions in scene units. The whole scene is built around these. */
export const PITCH_WIDTH = 68; // touchline-to-touchline (FIFA min 64m)
export const PITCH_LENGTH = 105; // goal-to-goal
export const PITCH_HALF_W = PITCH_WIDTH / 2;
export const PITCH_HALF_L = PITCH_LENGTH / 2;

/** Stadium / lighting tuning. */
export const FLOODLIGHT_HEIGHT = 38;
export const FLOODLIGHT_INTENSITY = 1.4;
export const BACKDROP_COLOR = "#05070f"; // near-black stadium darkness
export const GRASS_BASE = "#1d3a1a"; // saturated mid-green
export const GRASS_STRIPE = "#173015";
export const LINE_COLOR = "#fafaf7";

/** Brand colors from CSS tokens (mirrored as hex for THREE materials). */
export const BRAND = {
  actionOrange: "#ec652b",
  ghostWhite: "#fafaf7",
  deepPlum: "#111a4a",
} as const;

/** 4-3-3 formation slots in normalized pitch space.
 *  Defending end (own goal) is z=-1, attacking up to z=+1.
 *  Ordered back-to-front: GK → DEF → MID → ATT. */
export const FORMATION_4_3_3: FormationSlot[] = [
  // Goalkeeper
  { persona: "l-ultimo", line: "GK", x: 0, z: -0.92 },
  // Back four (L→R as you look from our goal forward)
  { persona: "il-capitano", line: "DEF", x: -0.65, z: -0.58 },
  { persona: "il-libero", line: "DEF", x: -0.22, z: -0.62 },
  { persona: "il-catenaccio", line: "DEF", x: 0.22, z: -0.62 },
  { persona: "l-ala", line: "DEF", x: 0.65, z: -0.58 },
  // Midfield three (L → CDM → R)
  { persona: "il-mediano", line: "MID", x: -0.5, z: -0.05 },
  { persona: "il-regista", line: "MID", x: 0, z: -0.18 },
  { persona: "il-trequartista", line: "MID", x: 0.5, z: -0.05 },
  // Front three (LF / F9 / RF)
  { persona: "il-numero-dieci", line: "ATT", x: -0.45, z: 0.55 },
  { persona: "il-falso-nove", line: "ATT", x: 0, z: 0.62 },
  { persona: "il-bomber", line: "ATT", x: 0.45, z: 0.55 },
];
