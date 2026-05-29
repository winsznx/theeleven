import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

let mockPathname: string = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { BottomTabBar } from "@/components/dapp/BottomTabBar";

describe("BottomTabBar", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  it("renders all 4 tabs", () => {
    // #given the tab bar
    // #when it renders
    const { container } = render(<BottomTabBar />);
    // #then 4 anchor tabs are present
    const links = container.querySelectorAll("a[data-tab-href]");
    expect(links).toHaveLength(4);
  });

  it("marks the Home tab active when pathname is '/'", () => {
    // #given the landing route
    mockPathname = "/";
    const { container } = render(<BottomTabBar />);
    // #then only the Home tab is active
    const home = container.querySelector('a[data-tab-href="/"]');
    const markets = container.querySelector('a[data-tab-href="/markets"]');
    expect(home?.getAttribute("data-tab-active")).toBe("true");
    expect(markets?.getAttribute("data-tab-active")).toBeNull();
    expect(home?.getAttribute("aria-current")).toBe("page");
  });

  it("marks Markets active for the /market/[address] detail route", () => {
    // #given a /market detail path
    mockPathname = "/market/0xabc";
    const { container } = render(<BottomTabBar />);
    // #then the Markets tab is active (covers both /markets and /market/*)
    const markets = container.querySelector('a[data-tab-href="/markets"]');
    expect(markets?.getAttribute("data-tab-active")).toBe("true");
  });

  it("marks Eleven active for an agent detail route", () => {
    // #given /agents/il-regista
    mockPathname = "/agents/il-regista";
    const { container } = render(<BottomTabBar />);
    // #then the Eleven tab is active
    const eleven = container.querySelector('a[data-tab-href="/agents"]');
    expect(eleven?.getAttribute("data-tab-active")).toBe("true");
  });

  it("is mobile-only — applies md:hidden visibility class on the outer nav", () => {
    // #given the tab bar
    // #when it renders
    const { container } = render(<BottomTabBar />);
    // #then the data-bottom-tab-bar nav has md:hidden in its class list
    const nav = container.querySelector("[data-bottom-tab-bar]") as HTMLElement;
    expect(nav).not.toBeNull();
    expect(nav.className).toContain("md:hidden");
  });
});
