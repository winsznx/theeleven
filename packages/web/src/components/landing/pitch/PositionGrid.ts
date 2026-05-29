/**
 * 4-3-1-2 Italian classic formation.
 *
 * Coordinates are percentages of the pitch bounding box (top-down view).
 * Home end at BOTTOM, attacking UP. (0,0) is top-left = away goal.
 *
 * Il Regista at (50, 58) is the brand compositional anchor — locked.
 */

export type PersonaSlug =
  | "il-regista"
  | "il-trequartista"
  | "il-mediano"
  | "il-falso-nove"
  | "il-libero"
  | "l-ala"
  | "il-bomber"
  | "il-capitano"
  | "il-numero-dieci"
  | "il-catenaccio"
  | "l-ultimo";

export interface PitchPoint {
  /** percentage 0–100 across the long axis (sideline to sideline) */
  x: number;
  /** percentage 0–100 down the short axis (away goal to home goal) */
  y: number;
}

export const FORMATION_4_3_1_2: Record<PersonaSlug, PitchPoint> = {
  "l-ultimo": { x: 50, y: 92 },
  "il-libero": { x: 35, y: 78 },
  "il-catenaccio": { x: 65, y: 78 },
  "il-capitano": { x: 18, y: 70 },
  "l-ala": { x: 82, y: 70 },
  "il-mediano": { x: 35, y: 58 },
  "il-regista": { x: 50, y: 58 },
  "il-trequartista": { x: 65, y: 58 },
  "il-numero-dieci": { x: 50, y: 38 },
  "il-falso-nove": { x: 35, y: 18 },
  "il-bomber": { x: 65, y: 18 },
};

/** Render order = formation sequence (back to front) for screen-reader announcement. */
export const FORMATION_ORDER: readonly PersonaSlug[] = [
  "l-ultimo",
  "il-libero",
  "il-catenaccio",
  "il-capitano",
  "l-ala",
  "il-mediano",
  "il-regista",
  "il-trequartista",
  "il-numero-dieci",
  "il-falso-nove",
  "il-bomber",
] as const;

export const PERSONA_SHORT_NAME: Record<PersonaSlug, string> = {
  "il-regista": "Il Regista",
  "il-trequartista": "Il Trequartista",
  "il-mediano": "Il Mediano",
  "il-falso-nove": "Il Falso Nove",
  "il-libero": "Il Libero",
  "l-ala": "L'Ala",
  "il-bomber": "Il Bomber",
  "il-capitano": "Il Capitano",
  "il-numero-dieci": "Il Numero Dieci",
  "il-catenaccio": "Il Catenaccio",
  "l-ultimo": "L'Ultimo",
};
