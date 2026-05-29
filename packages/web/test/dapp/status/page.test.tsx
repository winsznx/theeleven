import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { StatusPayload } from "@/lib/status";

let payload: StatusPayload = {
  generatedAt: "2026-05-27T19:00:00.000Z",
  factory: null,
  network: "xlayer-mainnet",
  chainId: 196,
  deployedAtBlock: null,
  deployedAtISO: null,
  agent: { status: "not-configured" },
  lastTickAgeSeconds: null,
  activity: {
    marketsCreated: 0,
    stakesPlaced: null,
    resolutions: null,
    volumeMicros: 0n,
  },
  recentMarkets: [],
};

vi.mock("@/lib/status", () => ({
  loadStatus: async () => payload,
}));

import StatusPage from "@/app/(dapp)/status/page";

async function renderStatus() {
  const node = await StatusPage();
  return render(node as React.ReactElement);
}

describe("/status page", () => {
  beforeEach(() => {
    payload = {
      generatedAt: "2026-05-27T19:00:00.000Z",
      factory: null,
      network: "xlayer-mainnet",
      chainId: 196,
      deployedAtBlock: null,
      deployedAtISO: null,
      agent: { status: "not-configured" },
      lastTickAgeSeconds: null,
      activity: {
        marketsCreated: 0,
        stakesPlaced: null,
        resolutions: null,
        volumeMicros: 0n,
      },
      recentMarkets: [],
    };
  });

  it("renders empty states when factory is null AND agent is not configured", async () => {
    // #given the default null payload
    // #when /status renders
    await renderStatus();
    // #then the deploy-in-progress link + NOT CONFIGURED agent state both surface
    expect(screen.getByText(/deployment in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });

  it("renders the factory link when factory is present", async () => {
    // #given a payload with factory populated
    payload = {
      ...payload,
      factory: "0xabcdef1234567890abcdef1234567890abcdef12",
      deployedAtBlock: "1234567",
      deployedAtISO: "2026-05-27T19:00:00Z",
    };
    // #when /status renders
    const { container } = await renderStatus();
    // #then the factory link points at OKLink
    const a = container.querySelector("a[data-factory-link]");
    expect(a).not.toBeNull();
    expect(a!.getAttribute("href")).toContain("oklink.com");
  });

  it("reports agent ONLINE when /health returned ok", async () => {
    // #given a payload reporting online agent
    payload = {
      ...payload,
      agent: {
        status: "online",
        raw: {
          status: "ok",
          startedAt: new Date().toISOString(),
          fixtureId: 1145546,
          personasActive: 11,
          personaSlugs: [],
        },
      },
    };
    // #when /status renders
    await renderStatus();
    // #then the ONLINE pill is visible
    expect(screen.getByText(/^online$/i)).toBeInTheDocument();
    expect(screen.getByText(/11 of 11/i)).toBeInTheDocument();
  });

  it("reports agent OFFLINE with the reason when /health failed", async () => {
    // #given a payload reporting offline agent
    payload = {
      ...payload,
      agent: { status: "offline", reason: "fetch failed" },
    };
    // #when /status renders
    await renderStatus();
    // #then OFFLINE pill + reason both surface
    expect(screen.getByText(/^offline$/i)).toBeInTheDocument();
    expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
  });
});
