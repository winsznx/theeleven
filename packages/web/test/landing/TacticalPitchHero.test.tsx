import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { TacticalPitchHero } from "@/components/landing/TacticalPitchHero";
import {
  FORMATION_4_3_1_2,
  FORMATION_ORDER,
} from "@/components/landing/pitch/PositionGrid";

describe("TacticalPitchHero", () => {
  it("renders 11 PlayerSprite components", () => {
    const { container } = render(<TacticalPitchHero />);
    const sprites = container.querySelectorAll("[data-persona]");
    expect(sprites).toHaveLength(11);
  });

  it("renders each persona exactly once", () => {
    const { container } = render(<TacticalPitchHero />);
    const personas = Array.from(container.querySelectorAll("[data-persona]")).map(
      (el) => el.getAttribute("data-persona"),
    );
    expect(new Set(personas).size).toBe(11);
    for (const persona of FORMATION_ORDER) {
      expect(personas).toContain(persona);
    }
  });

  it("positions Il Regista on the center axis (x=50)", () => {
    const { container } = render(<TacticalPitchHero />);
    const regista = container.querySelector('[data-persona="il-regista"]');
    expect(regista).not.toBeNull();
    expect(FORMATION_4_3_1_2["il-regista"].x).toBe(50);
    const wrapper = regista!.parentElement as HTMLElement;
    expect(wrapper.style.left).toBe("50%");
  });

  it("renders the pitch SVG with descriptive aria-label", () => {
    render(<TacticalPitchHero />);
    expect(
      screen.getByLabelText(/tactical pitch with 11 ai-agent personas/i),
    ).toBeInTheDocument();
  });

  it("defaults every sprite to state='idle' when no states prop is passed", () => {
    const { container } = render(<TacticalPitchHero />);
    const sprites = container.querySelectorAll("[data-persona]");
    for (const sprite of sprites) {
      expect(sprite.getAttribute("data-state")).toBe("idle");
    }
    expect(container.querySelectorAll("[data-pulse]")).toHaveLength(0);
  });

  it("makes the hero focusable for keyboard navigation (tabIndex=0)", () => {
    const { container } = render(<TacticalPitchHero />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.tabIndex).toBe(0);
  });
});
