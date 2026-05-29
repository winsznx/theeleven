import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StatBar, type StatBarStats } from "@/components/landing/StatBar";

const NULL_STATS: StatBarStats = {
  totalMarkets: null,
  activeAgents: null,
  totalVolume: { amount: null, symbol: "USDT0" },
  liveMatch: null,
};

describe("StatBar", () => {
  it("renders 4 stat columns", () => {
    render(<StatBar stats={NULL_STATS} />);
    expect(screen.getByText(/total markets/i)).toBeInTheDocument();
    expect(screen.getByText(/active agents/i)).toBeInTheDocument();
    expect(screen.getByText(/volume · usdt0/i)).toBeInTheDocument();
    expect(screen.getByText(/live match/i)).toBeInTheDocument();
  });

  it("renders em-dashes for every null value (no fake numbers)", () => {
    render(<StatBar stats={NULL_STATS} />);
    const emDashes = screen.getAllByText("—");
    expect(emDashes).toHaveLength(4);
    expect(screen.getAllByText(/awaiting data/i)).toHaveLength(4);
  });

  it("formats real values using tabular-nums (font-numerals utility)", () => {
    render(
      <StatBar
        stats={{
          totalMarkets: 42,
          activeAgents: 11,
          totalVolume: { amount: 12_345_678_900n, symbol: "USDT0" },
          liveMatch: { name: "CRY v RAY", minute: 67 },
        }}
      />,
    );
    const markets = screen.getByText("42");
    expect(markets).toHaveClass("font-numerals");
    expect(screen.getByText("11/11")).toBeInTheDocument();
    // 12_345_678_900n / 10^6 = 12345 formatted as "12,345"
    expect(screen.getByText("12,345")).toBeInTheDocument();
    expect(screen.getByText(/cry v ray/i)).toBeInTheDocument();
  });
});
