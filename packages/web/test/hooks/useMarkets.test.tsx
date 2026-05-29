import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import type { Address } from "viem";
import type { WebDeployment } from "@/lib/deployment";
import type { MarketRow } from "@/types/market";

const FAKE_FACTORY = "0x4444444444444444444444444444444444444444" as Address;

function makeDeployment(factory: Address | null): WebDeployment {
  return {
    chainId: 196,
    network: "xlayer-mainnet",
    factory,
    resolver: null,
    poolManager: "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32" as Address,
    usdt0: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
    deployedAtBlock: factory ? 1n : null,
    deployedAtISO: null,
    agentsByPersona: null,
    personaByAgent: null,
    version: "test",
  };
}

let currentDeployment: WebDeployment = makeDeployment(null);
const getAllMarketRowsMock = vi.fn(async (): Promise<MarketRow[]> => []);

vi.mock("@/lib/deployment", () => ({
  get WEB_DEPLOYMENT() {
    return currentDeployment;
  },
  DEPLOY_RUNBOOK_URL: "https://github.com/x/y",
  isFactoryDeployed: () => currentDeployment.factory !== null,
}));

vi.mock("@/lib/onchain", () => ({
  getAllMarketRows: () => getAllMarketRowsMock(),
  getMarketRow: vi.fn(),
  getFactoryMarkets: vi.fn(),
  getAgentRegistrations: vi.fn(),
  getUsdt0Balance: vi.fn(),
  getPublicClient: vi.fn(),
  clearOnchainCache: vi.fn(),
}));

import { useMarkets } from "@/hooks/useMarkets";

const SAMPLE_ROW: MarketRow = {
  address: "0x5555555555555555555555555555555555555555" as Address,
  agent: "0x6666666666666666666666666666666666666666" as Address,
  agentPersona: "il-regista",
  commitHash: "0xabc",
  paymentToken: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
  marketDeadline: 1000n,
  resolveDeadline: 2000n,
  state: "STAKING_OPEN",
  outcome: 0,
  overStakeTotal: 100n,
  underStakeTotal: 200n,
  revealedTemplateId: null,
  revealedParams: null,
  humanQuestion: "test question",
  blockCreated: 1n,
};

describe("useMarkets", () => {
  beforeEach(() => {
    getAllMarketRowsMock.mockReset();
    currentDeployment = makeDeployment(null);
  });

  it("factory null → returns markets=[], loading=false, no error, no fetch", async () => {
    const { result } = renderHook(() => useMarkets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.markets).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(getAllMarketRowsMock).not.toHaveBeenCalled();
  });

  it("factory deployed → calls onchain helper and returns rows", async () => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    getAllMarketRowsMock.mockResolvedValueOnce([SAMPLE_ROW]);
    const { result } = renderHook(() => useMarkets());
    await waitFor(() => expect(result.current.markets).not.toBeNull());
    expect(result.current.markets).toEqual([SAMPLE_ROW]);
    expect(result.current.error).toBeNull();
  });

  it("error path → surfaces error string, markets stays null", async () => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    getAllMarketRowsMock.mockRejectedValueOnce(new Error("rpc down"));
    const { result } = renderHook(() => useMarkets());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toBe("rpc down");
    expect(result.current.markets).toBeNull();
  });
});
