import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { LiquidGlassSurface } from "@/components/glass/LiquidGlassSurface";

// useReducedMotion needs matchMedia which the test setup mocks. Override
// per-test via vi.mock when we need the reduced-motion branch.
vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: () => mockReducedMotion,
  };
});

let mockReducedMotion = false;

describe("LiquidGlassSurface", () => {
  it("renders the tab-bar variant with the pill border + shadow classes", () => {
    // #given the tab-bar variant
    // #when it renders
    mockReducedMotion = false;
    const { container } = render(
      <LiquidGlassSurface variant="tab-bar">x</LiquidGlassSurface>,
    );
    // #then the variant data attribute is set and the rounded pill class is applied
    const el = container.querySelector('[data-glass-variant="tab-bar"]');
    expect(el).not.toBeNull();
    expect(el!.className).toContain("rounded-[28px]");
  });

  it("renders the top-nav variant with the bottom hairline class", () => {
    // #given the top-nav variant
    mockReducedMotion = false;
    const { container } = render(
      <LiquidGlassSurface variant="top-nav">x</LiquidGlassSurface>,
    );
    // #then the bottom border + saturate utilities are present
    const el = container.querySelector('[data-glass-variant="top-nav"]');
    expect(el).not.toBeNull();
    expect(el!.className).toContain("border-b");
    expect(el!.className).toMatch(/saturate\(160%\)/);
  });

  it("applies the refraction filter by default (refraction ON)", () => {
    // #given default refraction + no reduced motion
    mockReducedMotion = false;
    const { container } = render(
      <LiquidGlassSurface variant="tab-bar">x</LiquidGlassSurface>,
    );
    // #then the filter style references the global SVG def
    const el = container.querySelector('[data-glass-variant="tab-bar"]') as HTMLElement;
    expect(el.getAttribute("data-glass-refraction")).toBe("on");
    expect(el.style.filter).toContain("liquid-refract");
  });

  it("DISABLES refraction when prefers-reduced-motion is set", () => {
    // #given reduced motion is on
    mockReducedMotion = true;
    const { container } = render(
      <LiquidGlassSurface variant="sheet">x</LiquidGlassSurface>,
    );
    // #then refraction is off; the filter is not applied
    const el = container.querySelector('[data-glass-variant="sheet"]') as HTMLElement;
    expect(el.getAttribute("data-glass-refraction")).toBe("off");
    expect(el.style.filter).toBe("");
  });
});
