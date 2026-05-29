import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { Address } from "viem";
import type { MarketRow } from "@/types/market";
import type { WebDeployment } from "@/lib/deployment";

// --- mocks (must be at module top before component import) -----------------

const FAKE_FACTORY = "0x1111111111111111111111111111111111111111" as Address;

function makeDeployment(factory: Address | null): WebDeployment {
  return {
    chainId: 196,
    network: "xlayer-mainnet",
    factory,
    resolver: null,
    poolManager: "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32" as Address,
    usdt0: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
    deployedAtBlock: factory ? 1000n : null,
    deployedAtISO: null,
    agentsByPersona: null,
    personaByAgent: null,
    version: "test",
  };
}

let currentDeployment: WebDeployment = makeDeployment(null);
let currentMarkets: { markets: MarketRow[] | null; loading: boolean; error: string | null } = {
  markets: [],
  loading: false,
  error: null,
};

vi.mock("@/hooks/useFactoryDeployment", () => ({
  useFactoryDeployment: () => currentDeployment,
}));
vi.mock("@/hooks/useMarkets", () => ({
  useMarkets: () => ({ ...currentMarkets, refetch: vi.fn() }),
}));

import { MarketsListView } from "@/components/dapp/MarketsListView";

const SAMPLE_ROW: MarketRow = {
  address: "0x2222222222222222222222222222222222222222" as Address,
  agent: "0x3333333333333333333333333333333333333333" as Address,
  agentPersona: "il-regista",
  commitHash: "0xabc",
  paymentToken: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
  marketDeadline: BigInt(Math.floor(Date.now() / 1000) + 600),
  resolveDeadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
  state: "STAKING_OPEN",
  outcome: 0,
  overStakeTotal: 70_000_000n,
  underStakeTotal: 30_000_000n,
  revealedTemplateId: null,
  revealedParams: null,
  humanQuestion: "Will HOME keep a clean sheet in next 30'?",
  blockCreated: 1234n,
};

describe("MarketsListView", () => {
  beforeEach(() => {
    currentDeployment = makeDeployment(null);
    currentMarkets = { markets: [], loading: false, error: null };
  });

  it("factory null → 'Mainnet deployment in progress' empty state with runbook link", () => {
    render(<MarketsListView status="all" persona="all" onClearFilters={() => {}} />);
    expect(screen.getByText(/mainnet deployment in progress/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /deploy runbook/i }),
    ).toHaveAttribute("href", expect.stringContaining("github.com"));
  });

  it("factory deployed but markets empty → 'No markets currently open' empty state", () => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    currentMarkets = { markets: [], loading: false, error: null };
    render(<MarketsListView status="all" persona="all" onClearFilters={() => {}} />);
    expect(screen.getByText(/no markets currently open/i)).toBeInTheDocument();
  });

  it("filters active but no results → 'No markets match these filters'", () => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    currentMarkets = { markets: [], loading: false, error: null };
    const clear = vi.fn();
    render(
      <MarketsListView status="STAKING_OPEN" persona="il-regista" onClearFilters={clear} />,
    );
    expect(screen.getByText(/no markets match these filters/i)).toBeInTheDocument();
    const clearLink = screen.getByRole("button", { name: /clear filters/i });
    clearLink.click();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("populated → renders MarketCard children", () => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    currentMarkets = { markets: [SAMPLE_ROW], loading: false, error: null };
    const { container } = render(
      <MarketsListView status="all" persona="all" onClearFilters={() => {}} />,
    );
    expect(container.querySelector("[data-markets-grid]")).not.toBeNull();
    expect(screen.getByText(/will home keep a clean sheet/i)).toBeInTheDocument();
  });
});
