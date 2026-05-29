import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Address } from "viem";
import type { MarketRow } from "@/types/market";
import type { WebDeployment } from "@/lib/deployment";

const FAKE_FACTORY = "0x9999999999999999999999999999999999999999" as Address;
const MARKET_ADDR = "0xefc51a4db2c5e2a8d7e8c8c8d7e8c8c8d7e8c8c8" as Address;
const USER = "0x1111111111111111111111111111111111111111" as Address;

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

import { POST } from "@/app/api/frame/[market]/sign/route";
import { _clearAuthCacheForTesting } from "@/app/api/frame/[market]/auth-cache";

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

function callSign(body: unknown, side = "1") {
  return POST(
    new Request(`http://localhost/api/frame/${MARKET_ADDR}/sign?side=${side}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ market: MARKET_ADDR }) },
  );
}

describe("POST /api/frame/[market]/sign", () => {
  beforeEach(() => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    currentMarket = SAMPLE_MARKET;
    _clearAuthCacheForTesting();
  });

  it("missing inputText → 400", async () => {
    const res = await callSign({ untrustedData: { address: USER } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid amount/i);
  });

  it("invalid amount (e.g. 'abc') → 400", async () => {
    const res = await callSign({ untrustedData: { address: USER, inputText: "abc" } });
    expect(res.status).toBe(400);
  });

  it("missing user address → 400", async () => {
    const res = await callSign({ untrustedData: { inputText: "5" } });
    expect(res.status).toBe(400);
  });

  it("valid request → returns FrameTxResponse with chainId eip155:196 + sign method", async () => {
    const res = await callSign({ untrustedData: { address: USER, inputText: "5" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.chainId).toBe("eip155:196");
    expect(json.method).toBe("eth_signTypedData_v4");
    expect(json.params.abi).toEqual([]);
    expect(json.params.to).toMatch(/^0x779Ded0c9e1022225f8E0630b35a9b54bE713736$/i);
    expect(typeof json.params.data).toBe("string");
  });

  it("typed-data domain.name is exactly 'USD₮0' with the U+20AE TUGRIK glyph", async () => {
    const res = await callSign({ untrustedData: { address: USER, inputText: "5" } });
    const json = await res.json();
    const typedData = JSON.parse(json.params.data) as { domain: { name: string } };
    expect(typedData.domain.name).toBe("USD₮0");
    // Belt-and-suspenders: assert the codepoint, not just the visual.
    expect(typedData.domain.name.codePointAt(3)).toBe(0x20ae);
  });
});
