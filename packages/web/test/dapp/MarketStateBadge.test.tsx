import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { MarketStateBadge } from "@/components/dapp/MarketStateBadge";

describe("MarketStateBadge", () => {
  it("STAKING_OPEN renders green success-moss dot + 'Staking open'", () => {
    const { container } = render(<MarketStateBadge state="STAKING_OPEN" />);
    expect(screen.getByText(/staking open/i)).toBeInTheDocument();
    const badge = container.querySelector('[data-market-state="STAKING_OPEN"]');
    expect(badge?.innerHTML).toContain("success-moss");
  });

  it("AWAITING_REVEAL renders action-orange dot + 'Awaiting reveal'", () => {
    const { container } = render(<MarketStateBadge state="AWAITING_REVEAL" />);
    expect(screen.getByText(/awaiting reveal/i)).toBeInTheDocument();
    const badge = container.querySelector('[data-market-state="AWAITING_REVEAL"]');
    expect(badge?.innerHTML).toContain("action-orange");
  });

  it("RESOLVED + outcome=1 renders 'Resolved · OVER won'", () => {
    const { container } = render(<MarketStateBadge state="RESOLVED" outcome={1} />);
    expect(screen.getByText(/resolved · over won/i)).toBeInTheDocument();
    const badge = container.querySelector('[data-market-state="RESOLVED"]');
    expect(badge?.innerHTML).toContain("deep-plum");
  });

  it("REFUNDED renders slate-text dot + 'Refunded'", () => {
    const { container } = render(<MarketStateBadge state="REFUNDED" />);
    expect(screen.getByText(/^refunded$/i)).toBeInTheDocument();
    const badge = container.querySelector('[data-market-state="REFUNDED"]');
    expect(badge?.innerHTML).toContain("slate-text");
  });
});
