import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { TournamentBadge } from "@/components/wc/TournamentBadge";

describe("TournamentBadge", () => {
  it("renders the date range 'Jun 11 – Jul 9'", () => {
    // #given the tournament badge
    // #when it renders
    render(<TournamentBadge />);
    // #then the date range is visible (em dash + month abbreviations)
    expect(screen.getByText(/Jun 11/)).toBeInTheDocument();
    expect(screen.getByText(/Jul 9/)).toBeInTheDocument();
  });

  it("renders 3 country flag chips loading from flagcdn.com", () => {
    // #given the tournament badge
    // #when it renders
    const { container } = render(<TournamentBadge />);
    // #then USA, CAN, MEX chips are present with flagcdn img urls
    expect(container.querySelector('[data-country-chip="USA"]')).not.toBeNull();
    expect(container.querySelector('[data-country-chip="CAN"]')).not.toBeNull();
    expect(container.querySelector('[data-country-chip="MEX"]')).not.toBeNull();
    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(3);
    for (const img of imgs) {
      expect(img.getAttribute("src")).toContain("flagcdn.com");
    }
  });

  it("renders a BallGlyph icon as the lead element", () => {
    // #given the tournament badge
    // #when it renders
    const { container } = render(<TournamentBadge />);
    // #then the ball glyph svg is present
    expect(container.querySelector("[data-ball-glyph]")).not.toBeNull();
  });
});
