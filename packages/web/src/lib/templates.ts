import {
  decodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Hex,
} from "viem";

/**
 * Mirror of packages/agent's template registry — id, display name, and a
 * best-effort decoder that turns the on-chain revealedParams envelope
 * (bytes32 templateId, bytes payload) into a human question.
 *
 * Decoder fidelity is intentionally lossy here: the agent owns the
 * authoritative resolution logic. The web app only needs enough to render
 * "Will HOME keep a clean sheet in next 30'?" on a market detail page.
 */

type TeamCode = 0 | 1;
type TeamLabel = "HOME" | "AWAY" | "TOTAL";

function teamLabel(code: number, allowTotal = false): TeamLabel {
  if (allowTotal && code === 2) return "TOTAL";
  return code === 0 ? "HOME" : "AWAY";
}

export interface DecodedMarket {
  templateId: Hex;
  templateName: string;
  displayName: string;
  humanQuestion: string;
}

interface TemplateEntry {
  id: Hex;
  name: string;
  displayName: string;
  decode: (payload: Hex) => string;
}

function id(label: string): Hex {
  return keccak256(toBytes(label));
}

const CLEAN_SHEET = parseAbiParameters("uint8, uint16, uint16");
const POSSESSION = parseAbiParameters("uint8, uint8, uint16, uint16");
const FIVE_UINT = parseAbiParameters("uint8, uint16, uint16, uint16, uint16");
const NEXT_GOAL = parseAbiParameters("uint16, uint16");

const TEMPLATES: TemplateEntry[] = [
  {
    id: id("CLEAN_SHEET_REMAINING_v1"),
    name: "CLEAN_SHEET_REMAINING_v1",
    displayName: "Clean sheet remaining",
    decode(payload) {
      const [team, windowMin, openedAt] = decodeAbiParameters(CLEAN_SHEET, payload);
      const t = teamLabel(Number(team));
      return `Will ${t} keep a clean sheet between min ${openedAt} and min ${Number(openedAt) + Number(windowMin)}?`;
    },
  },
  {
    id: id("POSSESSION_OVER_PCT_v1"),
    name: "POSSESSION_OVER_PCT_v1",
    displayName: "Possession over %",
    decode(payload) {
      const [team, threshold, windowMin, openedAt] = decodeAbiParameters(POSSESSION, payload);
      const t = teamLabel(Number(team));
      return `${t} possession over ${threshold}% by min ${Number(openedAt) + Number(windowMin)}?`;
    },
  },
  {
    id: id("CORNER_COUNT_OVER_v1"),
    name: "CORNER_COUNT_OVER_v1",
    displayName: "Corner count over",
    decode(payload) {
      const [team, threshold, windowMin, openedAt] = decodeAbiParameters(FIVE_UINT, payload);
      const t = teamLabel(Number(team), true);
      return `Over ${threshold} corners (${t}) between min ${openedAt} and min ${Number(openedAt) + Number(windowMin)}?`;
    },
  },
  {
    id: id("NEXT_GOAL_HOME_AWAY_v1"),
    name: "NEXT_GOAL_HOME_AWAY_v1",
    displayName: "Next goal: HOME or AWAY",
    decode(payload) {
      const [windowMin, openedAt] = decodeAbiParameters(NEXT_GOAL, payload);
      return `Which side scores first between min ${openedAt} and min ${Number(openedAt) + Number(windowMin)}?`;
    },
  },
  {
    id: id("SHOTS_ON_TARGET_OVER_v1"),
    name: "SHOTS_ON_TARGET_OVER_v1",
    displayName: "Shots on target over",
    decode(payload) {
      const [team, threshold, windowMin, openedAt] = decodeAbiParameters(FIVE_UINT, payload);
      const t = teamLabel(Number(team), true);
      return `Over ${threshold} shots on target (${t}) between min ${openedAt} and min ${Number(openedAt) + Number(windowMin)}?`;
    },
  },
  {
    id: id("YELLOW_CARD_COUNT_OVER_v1"),
    name: "YELLOW_CARD_COUNT_OVER_v1",
    displayName: "Yellow card count over",
    decode(payload) {
      const [team, threshold, windowMin, openedAt] = decodeAbiParameters(FIVE_UINT, payload);
      const t = teamLabel(Number(team), true);
      return `Over ${threshold} yellow cards (${t}) between min ${openedAt} and min ${Number(openedAt) + Number(windowMin)}?`;
    },
  },
  {
    id: id("FOULS_COUNT_OVER_v1"),
    name: "FOULS_COUNT_OVER_v1",
    displayName: "Fouls count over",
    decode(payload) {
      const [team, threshold, windowMin, openedAt] = decodeAbiParameters(FIVE_UINT, payload);
      const t = teamLabel(Number(team), true);
      return `Over ${threshold} fouls (${t}) between min ${openedAt} and min ${Number(openedAt) + Number(windowMin)}?`;
    },
  },
];

const BY_ID = new Map<Hex, TemplateEntry>(TEMPLATES.map((t) => [t.id, t]));

/**
 * Decode the on-chain revealedParams envelope `(bytes32 templateId, bytes payload)`
 * into a human-readable question. Returns null when the templateId is unknown
 * (e.g., a v2 template the web hasn't shipped knowledge of yet).
 */
export function decodeRevealedParams(revealedParams: Hex): DecodedMarket | null {
  if (revealedParams === "0x" || revealedParams.length < 130) return null;
  try {
    const [templateId, payload] = decodeAbiParameters(
      parseAbiParameters("bytes32, bytes"),
      revealedParams,
    );
    const entry = BY_ID.get(templateId);
    if (!entry) return null;
    return {
      templateId,
      templateName: entry.name,
      displayName: entry.displayName,
      humanQuestion: entry.decode(payload),
    };
  } catch {
    return null;
  }
}

export function getTemplateDisplayName(templateId: Hex): string | null {
  return BY_ID.get(templateId)?.displayName ?? null;
}

export const ALL_TEMPLATES: ReadonlyArray<{ id: Hex; name: string; displayName: string }> =
  TEMPLATES.map(({ id: tid, name, displayName }) => ({ id: tid, name, displayName }));
