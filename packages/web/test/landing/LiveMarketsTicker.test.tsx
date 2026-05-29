import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { LiveMarketsTicker } from "@/components/landing/LiveMarketsTicker";
import type { MarketCardProps } from "@/components/landing/MarketCard";

const FUTURE = Math.floor(Date.now() / 1000) + 60 * 30;

const SAMPLE_MARKET: MarketCardProps = {
  question: "Will HOME keep a clean sheet in next 30'?",
  personaSlug: "il-regista",
  personaName: "Il Regista",
  overOddsBips: 6700,
  underOddsBips: 3300,
  volumeUSDT0: 147_000_000n,
  resolveDeadlineUnix: FUTURE,
};

describe("LiveMarketsTicker", () => {
  it("renders the honest empty state when markets is undefined", () => {
    render(<LiveMarketsTicker />);
    expect(
      screen.getByText(/awaiting live activity · the eleven start/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/next match · —/i)).toBeInTheDocument();
  });

  it("renders the honest empty state when markets is an empty array", () => {
    render(<LiveMarketsTicker markets={[]} />);
    expect(
      screen.getByText(/awaiting live activity/i),
    ).toBeInTheDocument();
  });

  it("renders MarketCard children when markets is populated", () => {
    const { container } = render(
      <LiveMarketsTicker markets={[SAMPLE_MARKET, SAMPLE_MARKET]} />,
    );
    // Each market is rendered twice (doubled for seamless marquee loop).
    const matches = screen.getAllByText(/will home keep a clean sheet/i);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".regista-marquee")).not.toBeNull();
  });
});
