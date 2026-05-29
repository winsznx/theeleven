import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

/** A normalized 4-3-3 slot position in pitch-local coordinates.
 *  x ∈ [-1, 1] left-to-right (negative = left).
 *  z ∈ [-1, 1] back-to-front (negative = our goal end, positive = attacking). */
export interface FormationSlot {
  persona: PersonaSlug;
  line: "GK" | "DEF" | "MID" | "ATT";
  /** Normalized x in [-1, 1]. -1 = far left touchline, +1 = far right. */
  x: number;
  /** Normalized z in [-1, 1]. -1 = our goal line, +1 = opposition goal line. */
  z: number;
}

/** Player card metric chip shown on hover. */
export interface PlayerMetric {
  label: string;
  /** Optional numeric value rendered to the right. */
  value?: string;
}
