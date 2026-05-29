import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { WCStripe } from "@/components/wc/WCStripe";

describe("WCStripe", () => {
  it("renders 3 colored segments (action-orange / ghost-white / deep-plum)", () => {
    // #given the stripe
    // #when it renders
    const { container } = render(<WCStripe />);
    // #then the data marker is present with 3 child divs
    const stripe = container.querySelector("[data-wc-stripe]") as HTMLElement;
    expect(stripe).not.toBeNull();
    const segments = stripe.querySelectorAll("div");
    expect(segments).toHaveLength(3);
    expect(segments[0]!.className).toContain("bg-[var(--color-action-orange)]");
    expect(segments[1]!.className).toContain("bg-[var(--color-ghost-white)]");
    expect(segments[2]!.className).toContain("bg-[var(--color-deep-plum)]");
  });
});
