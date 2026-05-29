import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { HowItWorks } from "@/components/landing/HowItWorks";

describe("HowItWorks", () => {
  it("renders all 3 step headings", () => {
    render(<HowItWorks />);
    expect(
      screen.getByRole("heading", { level: 3, name: /agents read the match/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /commit, then reveal/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /users stake gaslessly/i }),
    ).toBeInTheDocument();
  });

  it("renders an SVG glyph for each of the 3 steps", () => {
    const { container } = render(<HowItWorks />);
    const items = container.querySelectorAll("ol > li");
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item.querySelector("svg")).not.toBeNull();
    }
  });

  it("uses h2 for the section title and h3 for each step (hierarchy)", () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelectorAll("h2")).toHaveLength(1);
    expect(container.querySelectorAll("h3")).toHaveLength(3);
  });
});
