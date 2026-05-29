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

vi.mock("@/lib/deployment", () => ({
  get WEB_DEPLOYMENT() {
    return currentDeployment;
  },
  DEPLOY_RUNBOOK_URL: "https://github.com/winsznx/theeleven/blob/main/packages/contracts/DEPLOYMENT.md",
  isFactoryDeployed: () => currentDeployment.factory !== null,
}));

vi.mock("@/lib/onchain", () => ({
  getMarketRow: vi.fn(async () => currentMarket),
}));

import { GET } from "@/app/frame/[market]/route";

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

function callGet(addr: string) {
  return GET(new Request(`http://localhost/frame/${addr}`), {
    params: Promise.resolve({ market: addr }),
  });
}

describe("GET /frame/[market] — initial frame", () => {
  beforeEach(() => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    currentMarket = SAMPLE_MARKET;
  });

  it("returns 200 with text/html content-type for a valid open market", async () => {
    const res = await callGet(MARKET_ADDR);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
  });

  it("HTML contains fc:miniapp meta tag with v=1 embed JSON", async () => {
    const res = await callGet(MARKET_ADDR);
    const html = await res.text();
    const match = html.match(/<meta name="fc:miniapp" content="([^"]+)"/);
    expect(match).not.toBeNull();
    const embed = JSON.parse(
      match![1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
    ) as { version: string; button: { action: { type: string } } };
    expect(embed.version).toBe("1");
    expect(embed.button.action.type).toBe("launch_miniapp");
  });

  it("embed button launches the dApp market page (Mini App spec — single button)", async () => {
    const res = await callGet(MARKET_ADDR);
    const html = await res.text();
    const match = html.match(/<meta name="fc:miniapp" content="([^"]+)"/)!;
    const embed = JSON.parse(
      match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
    ) as { button: { title: string; action: { url: string } } };
    expect(embed.button.title).toMatch(/Stake/);
    expect(embed.button.action.url).toContain(`/market/${MARKET_ADDR}`);
  });
});
