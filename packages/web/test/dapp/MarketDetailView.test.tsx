import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { Address } from "viem";
import type { MarketRow } from "@/types/market";

// Avoid wagmi leaking through StakeWidget during render.
vi.mock("@/components/dapp/stake/StakeWidget", () => ({
  StakeWidget: () => <div data-testid="stake-widget-mock">stake widget</div>,
}));

import { MarketDetailView } from "@/components/dapp/MarketDetailView";

const BASE: MarketRow = {
  address: "0xabcdef0123456789abcdef0123456789abcdef01" as Address,
  agent: "0x1111111111111111111111111111111111111111" as Address,
  agentPersona: "il-regista",
  commitHash: "0xdeadbeef",
  paymentToken: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
  marketDeadline: BigInt(Math.floor(Date.now() / 1000) + 600),
  resolveDeadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
  state: "STAKING_OPEN",
  outcome: 0,
  overStakeTotal: 67_000_000n,
  underStakeTotal: 33_000_000n,
  revealedTemplateId: null,
  revealedParams: null,
  humanQuestion: "Will HOME keep a clean sheet in next 30'?",
  blockCreated: 1234n,
};

describe("MarketDetailView", () => {
  it("renders persona attribution as a link to /agents/[slug]", () => {
    render(<MarketDetailView market={BASE} />);
    const link = screen.getByRole("link", { name: /il regista/i });
    expect(link).toHaveAttribute("href", "/agents/il-regista");
  });

  it("renders the market address as an OKLink external link", () => {
    const { container } = render(<MarketDetailView market={BASE} />);
    const a = container.querySelector("a[data-oklink-market]");
    expect(a).not.toBeNull();
    expect(a!.getAttribute("href")).toBe(
      `https://www.oklink.com/x-layer/address/${BASE.address}`,
    );
  });

  it("STAKING_OPEN renders the StakeWidget", () => {
    render(<MarketDetailView market={BASE} />);
    expect(screen.getByTestId("stake-widget-mock")).toBeInTheDocument();
  });

  it("RESOLVED hides the stake widget and shows the winning side", () => {
    render(
      <MarketDetailView
        market={{ ...BASE, state: "RESOLVED", outcome: 1 }}
      />,
    );
    expect(screen.queryByTestId("stake-widget-mock")).toBeNull();
    expect(screen.getByText(/over side won the pool/i)).toBeInTheDocument();
    expect(screen.getByText(/resolved · over won/i)).toBeInTheDocument();
  });

  it("REFUNDED shows the refund message", () => {
    render(<MarketDetailView market={{ ...BASE, state: "REFUNDED", outcome: 3 }} />);
    expect(screen.queryByTestId("stake-widget-mock")).toBeNull();
    expect(screen.getByText(/refunded — winning pool was empty/i)).toBeInTheDocument();
  });
});
