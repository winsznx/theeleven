import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  MarketCard,
  formatUSDT0,
  type MarketCardProps,
} from "@/components/landing/MarketCard";

const FUTURE = Math.floor(Date.now() / 1000) + 60 * 30; // 30 min ahead

const BASE: MarketCardProps = {
  question: "Will HOME keep a clean sheet in next 30'?",
  personaSlug: "il-regista",
  personaName: "Il Regista",
  overOddsBips: 6700,
  underOddsBips: 3300,
  volumeUSDT0: 147_000_000n, // $147
  resolveDeadlineUnix: FUTURE,
};

describe("MarketCard", () => {
  it("renders the question text", () => {
    render(<MarketCard {...BASE} />);
    expect(
      screen.getByText(/will home keep a clean sheet/i),
    ).toBeInTheDocument();
  });

  it("renders dual-format probability (cents AND percent) for both sides", () => {
    render(<MarketCard {...BASE} />);
    expect(screen.getByText("67¢")).toBeInTheDocument();
    expect(screen.getByText("33¢")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("renders numeric values with tabular-nums (font-numerals utility)", () => {
    render(<MarketCard {...BASE} />);
    const cents = screen.getByText("67¢");
    expect(cents.className).toMatch(/tabular-nums/);
    expect(cents.className).toMatch(/font-numerals/);
  });

  it("wraps the card in a link when marketAddress is provided, no link otherwise", () => {
    const { container: withAddr } = render(
      <MarketCard
        {...BASE}
        marketAddress="0x1234567890123456789012345678901234567890"
      />,
    );
    expect(
      withAddr.querySelector('a[href^="/market/0x1234"]'),
    ).not.toBeNull();

    const { container: noAddr } = render(<MarketCard {...BASE} />);
    expect(noAddr.querySelector('a[href^="/market/"]')).toBeNull();
  });

  it("formats volume: ≥$10 no decimals, <$10 two decimals", () => {
    expect(formatUSDT0(147_000_000n)).toBe("$147");
    expect(formatUSDT0(4_500_000n)).toBe("$4.50");
    expect(formatUSDT0(10_000_000n)).toBe("$10");
    expect(formatUSDT0(9_990_000n)).toBe("$9.99");
    expect(formatUSDT0(12_345_678_900n)).toBe("$12,345");
  });
});
