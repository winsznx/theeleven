import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Address } from "viem";
import type { WebDeployment } from "@/lib/deployment";

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

vi.mock("@/lib/deployment", () => ({
  get WEB_DEPLOYMENT() {
    return currentDeployment;
  },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    currentDeployment = makeDeployment(null);
    delete process.env.RELAYER_PRIVATE_KEY;
  });

  it("returns 200 with application/json content-type", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("reports status 'ok' when both factory and relayer are configured", async () => {
    currentDeployment = makeDeployment(
      "0x1111111111111111111111111111111111111111" as Address,
    );
    process.env.RELAYER_PRIVATE_KEY = "0x" + "a".repeat(64);
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.chainId).toBe(196);
    expect(body.factory).toBe("0x1111111111111111111111111111111111111111");
    expect(body.relayer).toBe("configured");
    // Never echo the secret itself, even in a server-only response.
    expect(JSON.stringify(body)).not.toContain("a".repeat(64));
  });

  it("reports status 'partial' when factory is null", async () => {
    process.env.RELAYER_PRIVATE_KEY = "0x" + "b".repeat(64);
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("partial");
    expect(body.factory).toBeNull();
    expect(body.relayer).toBe("configured");
  });

  it("reports status 'partial' when RELAYER_PRIVATE_KEY is missing", async () => {
    currentDeployment = makeDeployment(
      "0x2222222222222222222222222222222222222222" as Address,
    );
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("partial");
    expect(body.factory).toBe("0x2222222222222222222222222222222222222222");
    expect(body.relayer).toBe("missing");
  });
});
