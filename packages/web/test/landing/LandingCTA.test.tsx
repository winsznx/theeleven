import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { LandingCTA } from "@/components/landing/LandingCTA";

describe("LandingCTA", () => {
  it("primary CTA links to /markets", () => {
    render(<LandingCTA />);
    const cta = screen.getByRole("link", { name: /view live markets/i });
    expect(cta).toHaveAttribute("href", "/markets");
  });

  it("secondary CTA renders and links to /docs", () => {
    render(<LandingCTA />);
    const cta = screen.getByRole("link", { name: /read the whitepaper/i });
    expect(cta).toHaveAttribute("href", "/docs");
  });
});
