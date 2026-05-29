import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";

import HomePage from "@/app/page";

const PHONE_WIDTH = 375;

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: PHONE_WIDTH,
  });
  window.dispatchEvent(new Event("resize"));
});

describe("Landing page at 375px", () => {
  it("renders without horizontal overflow on a 375px-wide viewport", () => {
    // #given a phone-width viewport
    // #when the homepage renders
    const { container } = render(<HomePage />);
    // #then the document body never declares an explicit width that
    // exceeds the viewport (jsdom doesn't compute layout, but we can at
    // least guarantee no element forces a width > viewport via inline
    // style — a common regression vector)
    const offenders = Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
      (el) => {
        const w = el.style.width;
        if (!w) return false;
        const m = /^(\d+)px$/.exec(w);
        if (!m) return false;
        return Number(m[1]) > PHONE_WIDTH;
      },
    );
    expect(offenders).toEqual([]);
  });
});
