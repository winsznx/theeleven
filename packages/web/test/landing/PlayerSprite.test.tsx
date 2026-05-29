import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { PlayerSprite } from "@/components/landing/pitch/PlayerSprite";
import { KITS, SKIN } from "@/components/landing/pitch/kits";
import {
  FORMATION_ORDER,
  type PersonaSlug,
} from "@/components/landing/pitch/PositionGrid";

function jerseyFillFor(persona: PersonaSlug): string | null {
  const { container } = render(<PlayerSprite persona={persona} />);
  const rects = container.querySelectorAll("svg rect");
  // jersey rect is the one at y="3" with width="4" height="4"
  for (const rect of Array.from(rects)) {
    if (
      rect.getAttribute("y") === "3" &&
      rect.getAttribute("width") === "4" &&
      rect.getAttribute("height") === "4"
    ) {
      return rect.getAttribute("fill");
    }
  }
  return null;
}

describe("PlayerSprite", () => {
  it("renders distinct kit colors for all 11 persona variants", () => {
    const colors = FORMATION_ORDER.map((p) => jerseyFillFor(p));
    expect(colors.every((c) => c !== null)).toBe(true);
    // distinct count (Falso Nove + Libero share within shorts but jerseys differ)
    expect(new Set(colors).size).toBe(11);
  });

  it("defaults state to 'idle' when no state prop is passed", () => {
    const { container } = render(<PlayerSprite persona="il-regista" />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("data-state")).toBe("idle");
    expect(container.querySelector("[data-pulse]")).toBeNull();
  });

  it("renders the pulse halo when state='proposing'", () => {
    const { container } = render(
      <PlayerSprite persona="il-regista" state="proposing" />,
    );
    const halo = container.querySelector('[data-pulse="proposing"]');
    expect(halo).not.toBeNull();
  });

  it("uses a single shared skin tone across every kit (no per-persona skin)", () => {
    // The kits table must NOT carry a per-persona skin property — skin is a
    // single shared constant per the component's JSDoc.
    for (const persona of FORMATION_ORDER) {
      const kit = KITS[persona];
      expect(kit).not.toHaveProperty("skin");
    }
    expect(typeof SKIN).toBe("string");
    expect(SKIN).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("preserves the 8×12 sprite structure (viewBox '0 0 8 13' with shadow row)", () => {
    const { container } = render(<PlayerSprite persona="il-regista" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe("0 0 8 13");
    expect(svg!.getAttribute("shape-rendering")).toBe("crispEdges");
  });
});
