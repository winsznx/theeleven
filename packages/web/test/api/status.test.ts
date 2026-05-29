import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Address } from "viem";
import type { WebDeployment } from "@/lib/deployment";

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
    deployedAtISO: factory ? "2026-05-27T19:00:00Z" : null,
    agentsByPersona: null,
    personaByAgent: null,
    version: "test",
  };
}

let currentDeployment: WebDeployment = makeDeployment(null);

vi.mock("@/lib/deployment", () => ({
  get WEB_DEPLOYMENT() {
    return currentDeployment;
  },
  DEPLOY_RUNBOOK_URL: "https://example.com",
}));

vi.mock("@/lib/onchain", () => ({
  getFactoryMarkets: vi.fn(async () => []),
  getPublicClient: () => ({
    getBlockNumber: async () => 1n,
  }),
}));

import { GET } from "@/app/api/status/route";
import { _clearStatusCacheForTesting } from "@/lib/status";

describe("GET /api/status", () => {
  beforeEach(() => {
    _clearStatusCacheForTesting();
    delete process.env.PUBLIC_AGENT_URL;
    currentDeployment = makeDeployment(null);
  });

  it("returns 200 application/json with the expected shape", async () => {
    // #given no factory + no agent URL configured
    // #when /api/status is hit
    const res = await GET();
    // #then the response is JSON with the expected top-level fields
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const body = await res.json();
    expect(body).toMatchObject({
      generatedAt: expect.any(String),
      factory: null,
      chainId: 196,
      agent: { status: "not-configured" },
      activity: { marketsCreated: 0, stakesPlaced: null, resolutions: null, volumeMicros: "0" },
      recentMarkets: [],
    });
  });

  it("reports factory address when deployment is populated", async () => {
    // #given a populated deployment
    currentDeployment = makeDeployment(FAKE_FACTORY);
    // #when /api/status is hit
    const res = await GET();
    const body = await res.json();
    // #then the factory address is echoed back
    expect(body.factory).toBe(FAKE_FACTORY);
    expect(body.deployedAtBlock).toBe("1000");
  });

  it("computes lastTickAgeSeconds from agent.raw.startedAt when online", async () => {
    // #given a configured agent URL that returns an 'ok' health payload with
    //       a startedAt 42 seconds in the past
    process.env.PUBLIC_AGENT_URL = "https://agent.example.com";
    const startedAt = new Date(Date.now() - 42_000).toISOString();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          startedAt,
          fixtureId: null,
          personasActive: 11,
          personaSlugs: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    try {
      // #when /api/status is hit
      const res = await GET();
      const body = await res.json();
      // #then lastTickAgeSeconds reflects the wall-clock delta in seconds
      expect(body.agent.status).toBe("online");
      expect(typeof body.lastTickAgeSeconds).toBe("number");
      expect(body.lastTickAgeSeconds).toBeGreaterThanOrEqual(41);
      expect(body.lastTickAgeSeconds).toBeLessThanOrEqual(45);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("returns lastTickAgeSeconds = null when the agent is not configured", async () => {
    // #given no PUBLIC_AGENT_URL configured
    // #when /api/status is hit
    const res = await GET();
    const body = await res.json();
    // #then the field is present and null
    expect(body.agent.status).toBe("not-configured");
    expect(body.lastTickAgeSeconds).toBeNull();
  });
});
