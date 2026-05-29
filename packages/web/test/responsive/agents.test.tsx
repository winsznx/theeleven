import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";

import AgentsPage from "@/app/(dapp)/agents/page";

const PHONE_WIDTH = 375;

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: PHONE_WIDTH,
  });
  window.dispatchEvent(new Event("resize"));
});

describe("/agents at 375px", () => {
  it("renders the persona grid without inline-width overflows", () => {
    // #given a phone-width viewport
    // #when the /agents page renders
    const { container } = render(<AgentsPage />);
    // #then no element pins an inline pixel width above the viewport
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
