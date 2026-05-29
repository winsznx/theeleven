import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { BallGlyph } from "@/components/wc/BallGlyph";

describe("BallGlyph", () => {
  it("renders a single-color SVG using currentColor stroke", () => {
    // #given the glyph at default size
    // #when it renders
    const { container } = render(<BallGlyph />);
    // #then the SVG inherits color via stroke="currentColor"
    const svg = container.querySelector("[data-ball-glyph]") as SVGElement | null;
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("stroke")).toBe("currentColor");
    expect(svg!.getAttribute("fill")).toBe("none");
  });
});
