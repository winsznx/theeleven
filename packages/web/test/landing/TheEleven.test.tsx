import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { TheEleven, ELEVEN_PERSONAS } from "@/components/landing/TheEleven";

const EXPECTED_ORDER = [
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
];

describe("TheEleven", () => {
  it("renders all 11 PersonaCard children (one sprite per card)", () => {
    // #given the landing section
    // #when it renders
    const { container } = render(<TheEleven />);
    // #then 11 sprites are mounted
    const sprites = container.querySelectorAll("[data-persona]");
    expect(sprites).toHaveLength(11);
  });

  it("ships eleven active personas — P21 retires the standby state", () => {
    // #given the landing section
    // #when it renders
    const { container } = render(<TheEleven />);
    // #then all 11 status dots read 'active' and zero read 'standby'
    const activeDots = container.querySelectorAll('[data-status="active"]');
    const standbyDots = container.querySelectorAll('[data-status="standby"]');
    expect(activeDots).toHaveLength(11);
    expect(standbyDots).toHaveLength(0);
  });

  it("renders persona cards in formation reading order (back → front)", () => {
    // #given the landing section
    // #when it renders
    const { container } = render(<TheEleven />);
    // #then the data-persona attributes appear in formation order
    const slugs = Array.from(container.querySelectorAll("[data-persona]")).map(
      (el) => el.getAttribute("data-persona"),
    );
    expect(slugs).toEqual(EXPECTED_ORDER);
  });

  it("every persona slug appears exactly once in the registry", () => {
    // #given the registry
    // #when slugs are extracted
    const slugs = ELEVEN_PERSONAS.map((p) => p.persona);
    // #then there are no duplicates
    expect(new Set(slugs).size).toBe(11);
  });
});
