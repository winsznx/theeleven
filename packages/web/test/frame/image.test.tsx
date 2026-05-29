import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Address } from "viem";
import type { MarketRow } from "@/types/market";
import type { WebDeployment } from "@/lib/deployment";

const FAKE_FACTORY = "0x9999999999999999999999999999999999999999" as Address;
const MARKET_ADDR = "0xefc51a4db2c5e2a8d7e8c8c8d7e8c8c8d7e8c8c8" as Address;

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

let currentDeployment = makeDeployment(FAKE_FACTORY);
let currentMarket: MarketRow | null = null;

const imageResponseMock = vi.fn();

vi.mock("next/og", () => ({
  ImageResponse: vi.fn().mockImplementation((jsx: unknown, opts: { width?: number; height?: number; headers?: HeadersInit } = {}) => {
    imageResponseMock(jsx, opts);
    return new Response("png-bytes-mock", {
      status: 200,
      headers: {
        "content-type": "image/png",
        ...(opts.headers ?? {}),
      },
    });
  }),
}));

vi.mock("@/lib/deployment", () => ({
  get WEB_DEPLOYMENT() {
    return currentDeployment;
  },
  DEPLOY_RUNBOOK_URL: "https://example.com/runbook",
  isFactoryDeployed: () => currentDeployment.factory !== null,
}));

vi.mock("@/lib/onchain", () => ({
  getMarketRow: vi.fn(async () => currentMarket),
}));

import { GET } from "@/app/api/frame/[market]/image/route";

const SAMPLE_MARKET: MarketRow = {
  address: MARKET_ADDR,
  agent: "0x2222222222222222222222222222222222222222" as Address,
  agentPersona: "il-regista",
  commitHash: "0xabc",
  paymentToken: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
  marketDeadline: BigInt(Math.floor(Date.now() / 1000) + 1800),
  resolveDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
  state: "STAKING_OPEN",
  outcome: 0,
  overStakeTotal: 67_000_000n,
  underStakeTotal: 33_000_000n,
  revealedTemplateId: null,
  revealedParams: null,
  humanQuestion: "Will HOME keep a clean sheet in next 30'?",
  blockCreated: 1n,
};

function callImage(addr: string) {
  return GET(new Request(`http://localhost/api/frame/${addr}/image`), {
    params: Promise.resolve({ market: addr }),
  });
}

describe("GET /api/frame/[market]/image", () => {
  beforeEach(() => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    currentMarket = SAMPLE_MARKET;
    imageResponseMock.mockClear();
  });

  it("returns image/png content-type with cache headers", async () => {
    const res = await callImage(MARKET_ADDR);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/image\/png/);
    expect(res.headers.get("cache-control")).toMatch(/max-age=30/);
  });

  it("renders the 'deployment in progress' variant when factory is null", async () => {
    currentDeployment = makeDeployment(null);
    await callImage(MARKET_ADDR);
    expect(imageResponseMock).toHaveBeenCalledTimes(1);
    const calledOpts = imageResponseMock.mock.calls[0]![1] as { width: number; height: number };
    expect(calledOpts.width).toBe(1200);
    expect(calledOpts.height).toBe(800);
  });

  it("renders 1200×800 (3:2 per Mini App spec) for a valid market", async () => {
    await callImage(MARKET_ADDR);
    expect(imageResponseMock).toHaveBeenCalledTimes(1);
    const calledOpts = imageResponseMock.mock.calls[0]![1] as { width: number; height: number };
    expect(calledOpts.width).toBe(1200);
    expect(calledOpts.height).toBe(800);
  });
});
