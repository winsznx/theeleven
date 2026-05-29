import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PersonaCard } from "@/components/landing/PersonaCard";

const PROPS = {
  persona: "il-regista" as const,
  number: 1,
  name: "Il Regista",
  role: "Deep-lying playmaker",
  tacticalPosition: "Defensive midfield · Center axis",
  templates: ["Clean sheet", "Possession", "Corners"],
};

describe("PersonaCard", () => {
  it("lists every template label", () => {
    // #given an active persona with three templates
    // #when the card renders
    render(<PersonaCard {...PROPS} />);
    // #then each template appears in the DOM
    for (const template of PROPS.templates) {
      expect(screen.getByText(template)).toBeInTheDocument();
    }
  });

  it("shows the success-moss status dot — P21 every persona is active", () => {
    // #given an active persona
    // #when the card renders
    const { container } = render(<PersonaCard {...PROPS} />);
    // #then the active dot is success-moss
    const dot = container.querySelector('[data-status="active"]');
    expect(dot).not.toBeNull();
    expect(dot!.className).toMatch(/success-moss/);
  });

  it("renders the 'Active' status label (no standby branch remains)", () => {
    // #given any persona
    // #when the card renders
    render(<PersonaCard {...PROPS} />);
    // #then the label reads Active and nothing references standby
    expect(screen.getByText(/^active$/i)).toBeInTheDocument();
    expect(screen.queryByText(/standby/i)).toBeNull();
    expect(screen.queryByText(/activates wc/i)).toBeNull();
  });

  it("renders the persona number as a 2-digit string in the header", () => {
    // #given a persona with number=1
    // #when the card renders
    render(<PersonaCard {...PROPS} />);
    // #then the header shows "01"
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("wraps the sprite at 32px width (w-8 — '32×48' size token)", () => {
    // #given an active persona
    // #when the card renders
    const { container } = render(<PersonaCard {...PROPS} />);
    // #then the sprite slot is w-8 and contains the persona SVG
    const sized = container.querySelector('[data-sprite-size="32x48"]');
    expect(sized).not.toBeNull();
    expect(sized!.className).toMatch(/\bw-8\b/);
    expect(sized!.querySelector('[data-persona="il-regista"]')).not.toBeNull();
  });
});
