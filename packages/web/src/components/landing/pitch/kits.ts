import type { PersonaSlug } from "./PositionGrid";

/**
 * Pixel-art kit palette for each persona sprite.
 *
 * Skin tone is a single warm beige (#D9A878) across all 11 personas — these
 * are AI agents, not human players, and the differentiation is by kit.
 *
 * Markers are pixel-level details that distinguish a persona at sprite scale:
 * Capitano gets an armband; L'Ultimo (GK) gets gloves.
 */

export type SpriteMarker = "armband" | "gloves";

export interface SpriteKit {
  jersey: string;
  shorts: string;
  marker?: SpriteMarker;
}

export const KITS: Record<PersonaSlug, SpriteKit> = {
  "il-regista": { jersey: "#6b1f4a", shorts: "#2d2d2d" },
  "il-trequartista": { jersey: "#0066cc", shorts: "#ffffff" },
  "il-mediano": { jersey: "#4a4a4a", shorts: "#1a1a1a" },
  "il-falso-nove": { jersey: "#e8e5dc", shorts: "#e8e5dc" },
  "il-libero": { jersey: "#1f4a2e", shorts: "#1f4a2e" },
  "l-ala": { jersey: "#d63232", shorts: "#1a1a1a" },
  "il-bomber": { jersey: "#e5b43a", shorts: "#1a1a1a" },
  "il-capitano": { jersey: "#1a1a1a", shorts: "#e5b43a", marker: "armband" },
  "il-numero-dieci": { jersey: "#5bafe5", shorts: "#ffffff" },
  "il-catenaccio": { jersey: "#1a2e5c", shorts: "#0a1e3c" },
  "l-ultimo": { jersey: "#dce825", shorts: "#1a1a1a", marker: "gloves" },
};

export const SKIN = "#d9a878";
export const SHOE = "#0a0a0a";
