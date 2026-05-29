import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

import type { Address, Hex } from "viem";
import type { MarketRow } from "@/types/market";
import type { WebDeployment } from "@/lib/deployment";

const FAKE_FACTORY = "0x9999999999999999999999999999999999999999" as Address;
const MARKET_ADDR = "0xefc51a4db2c5e2a8d7e8c8c8d7e8c8c8d7e8c8c8" as Address;
const USER = "0x1111111111111111111111111111111111111111" as Address;
const SIGNATURE = ("0x" + "a".repeat(64) + "b".repeat(64) + "1b") as Hex;
const TX_HASH = ("0x" + "d".repeat(64)) as Hex;

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

import { POST } from "@/app/api/frame/[market]/submit/route";
import {
  _clearAuthCacheForTesting,
  makeAuthCacheKey,
  storePendingAuth,
} from "@/app/api/frame/[market]/auth-cache";

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

function callSubmit(body: unknown, side = "1") {
  return POST(
    new Request(`http://localhost/api/frame/${MARKET_ADDR}/submit?side=${side}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ market: MARKET_ADDR }) },
  );
}

function primeAuthCache(side: 1 | 2, amountMicros: bigint) {
  storePendingAuth(makeAuthCacheKey(USER, MARKET_ADDR, side, amountMicros), {
    nonce: ("0x" + "c".repeat(64)) as Hex,
    validBefore: BigInt(Math.floor(Date.now() / 1000) + 300),
  });
}

describe("POST /api/frame/[market]/submit", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    currentMarket = SAMPLE_MARKET;
    _clearAuthCacheForTesting();
    global.fetch = vi.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("missing signature → 400 + error frame HTML", async () => {
    primeAuthCache(1, 5_000_000n);
    const res = await callSubmit({
      address: USER,
      untrustedData: { address: USER, inputText: "5" },
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const html = await res.text();
    expect(html).toMatch(/<meta name="fc:miniapp" content="/);
  });

  it("missing cached auth → 409 error frame ('Authorization expired…')", async () => {
    const res = await callSubmit({
      address: USER,
      transactionId: SIGNATURE,
      untrustedData: { address: USER, inputText: "5" },
    });
    expect(res.status).toBe(409);
    const html = await res.text();
    expect(html).toMatch(/Authorization expired/i);
  });

  it("facilitator non-2xx → error frame surfaces facilitator userMessage", async () => {
    primeAuthCache(1, 5_000_000n);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Insufficient USDT0 balance" }),
    });
    const res = await callSubmit({
      address: USER,
      transactionId: SIGNATURE,
      untrustedData: { address: USER, inputText: "5" },
    });
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toMatch(/Insufficient USDT0 balance/);
  });

  it("valid request → forwards to facilitator and returns success frame", async () => {
    primeAuthCache(1, 5_000_000n);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txHash: TX_HASH }),
    });
    const res = await callSubmit({
      address: USER,
      transactionId: SIGNATURE,
      untrustedData: { address: USER, inputText: "5" },
    });
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [callUrl, callInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(callUrl)).toMatch(/\/api\/facilitator\/stake$/);
    expect((callInit as { method: string }).method).toBe("POST");
  });

  it("success frame contains txHash + OKLink href + the staked amount", async () => {
    primeAuthCache(1, 5_000_000n);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txHash: TX_HASH }),
    });
    const res = await callSubmit({
      address: USER,
      transactionId: SIGNATURE,
      untrustedData: { address: USER, inputText: "5" },
    });
    const html = await res.text();
    expect(html).toContain(`https://www.oklink.com/x-layer/tx/${TX_HASH}`);
    expect(html).toMatch(/Staked \$5 on OVER/);
  });
});
