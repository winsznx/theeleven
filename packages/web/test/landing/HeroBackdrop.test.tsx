import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = () => null;
    Stub.displayName = "BallpitDynamicStub";
    return Stub;
  },
}));

import { HeroBackdrop } from "@/components/landing/effects/HeroBackdrop";

describe("HeroBackdrop", () => {
  it("renders the Ballpit variant wrapper as an absolutely-positioned aria-hidden region", () => {
    // #given the hero backdrop
    // #when it renders
    const { container } = render(<HeroBackdrop />);
    // #then the ballpit wrapper marker is present with hidden semantics
    const wrapper = container.querySelector('[data-hero-backdrop="ballpit"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper!.getAttribute("aria-hidden")).toBe("true");
  });
});
