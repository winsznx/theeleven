import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ApiFootballClient } from "../../src/matches/ApiFootballClient.js";
import { ApiFootballError, RateLimitedError } from "../../src/matches/errors.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX_DIR = resolve(HERE, "../fixtures/match");

function load(name: string) {
  return JSON.parse(readFileSync(resolve(FIX_DIR, name), "utf8"));
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const noSleep = () => Promise.resolve();

describe("ApiFootballClient", () => {
  it("attaches x-apisports-key header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(load("1-mid-first-half.json").fixture));
    const client = new ApiFootballClient({
      apiKey: "secret",
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl: noSleep,
    });
    await client.getFixture(1145546);
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-apisports-key"]).toBe("secret");
  });

  it("HTTP 500 → retries 3× then throws ApiFootballError", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("server error", { status: 500 }));
    const client = new ApiFootballClient({
      apiKey: "k",
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl: noSleep,
    });
    await expect(client.getFixture(1)).rejects.toBeInstanceOf(ApiFootballError);
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 retries
  });

  it("HTTP 429 → throws RateLimitedError immediately (no retry)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("rate limited", { status: 429, headers: { "retry-after": "12" } })
      );
    const client = new ApiFootballClient({
      apiKey: "k",
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl: noSleep,
    });
    await expect(client.getFixture(1)).rejects.toBeInstanceOf(RateLimitedError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("200 with response.errors → throws ApiFootballError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ errors: ["bad token"], response: [] })
    );
    const client = new ApiFootballClient({
      apiKey: "k",
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl: noSleep,
    });
    await expect(client.getFixture(1)).rejects.toBeInstanceOf(ApiFootballError);
  });

  it("HTTP 4xx (non-429) → no retry, throws ApiFootballError", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("not found", { status: 404 }));
    const client = new ApiFootballClient({
      apiKey: "k",
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl: noSleep,
    });
    await expect(client.getFixture(1)).rejects.toBeInstanceOf(ApiFootballError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("retries on transient network error then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValue(jsonResponse(load("1-mid-first-half.json").fixture));
    const client = new ApiFootballClient({
      apiKey: "k",
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl: noSleep,
    });
    const out = await client.getFixture(1145546);
    expect(out.response).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fetchSnapshot composes fixture + statistics into MatchSnapshot", async () => {
    const pair = load("1-mid-first-half.json");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes("/fixtures/statistics?fixture=")) return jsonResponse(pair.statistics);
      if (url.includes("/fixtures?id=")) return jsonResponse(pair.fixture);
      throw new Error(`unexpected url ${url}`);
    });
    const client = new ApiFootballClient({
      apiKey: "k",
      fetchImpl: fetchMock as unknown as typeof fetch,
      sleepImpl: noSleep,
    });
    const snap = await client.fetchSnapshot(1145546);
    expect(snap.fixtureId).toBe(1145546);
    expect(snap.status).toBe("1H");
    expect(snap.statistics.home.ballPossessionPct).toBe(58);
    expect(snap.events).toHaveLength(1);
  });
});
