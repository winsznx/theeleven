import type { Logger } from "pino";
import { z } from "zod";

import {
  fixtureResponseSchema,
  statisticsResponseSchema,
  eventsOnlyResponseSchema,
  type RawFixtureResponse,
  type RawStatsResponse,
  type RawEventsResponse,
} from "./schemas.js";
import {
  ApiFootballError,
  ApiFootballValidationError,
  RateLimitedError,
} from "./errors.js";
import { mergeIntoSnapshot, normalizeFixtureItem, normalizeStatistics } from "./normalize.js";
import type { MatchSnapshot } from "./types.js";

export interface ApiFootballClientOptions {
  apiKey: string;
  baseUrl?: string;
  logger?: Logger;
  /** Per-request timeout in ms. Default 10s. */
  timeoutMs?: number;
  /** Override the fetch implementation for testing. */
  fetchImpl?: typeof fetch;
  /** Override sleep for testing — receives delay in ms, returns a Promise. */
  sleepImpl?: (ms: number) => Promise<void>;
}

const DEFAULT_BASE_URL = "https://v3.football.api-sports.io";
const DEFAULT_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [500, 2_000, 5_000] as const;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class ApiFootballClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger: Logger | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleepImpl: (ms: number) => Promise<void>;

  constructor(opts: ApiFootballClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.logger = opts.logger;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleepImpl = opts.sleepImpl ?? defaultSleep;
  }

  async getFixture(id: number): Promise<RawFixtureResponse> {
    return this.get(`/fixtures?id=${id}`, fixtureResponseSchema);
  }

  async getFixtureEvents(id: number): Promise<RawEventsResponse> {
    return this.get(`/fixtures/events?fixture=${id}`, eventsOnlyResponseSchema);
  }

  async getFixtureStatistics(id: number): Promise<RawStatsResponse> {
    return this.get(`/fixtures/statistics?fixture=${id}`, statisticsResponseSchema);
  }

  async getLiveFixtures(): Promise<RawFixtureResponse> {
    return this.get(`/fixtures?live=all`, fixtureResponseSchema);
  }

  /**
   * Parallel-fetch the fixture and its statistics, normalize, and return
   * a MatchSnapshot. Throws if either upstream call fails or the fixture id
   * returns no matches.
   */
  async fetchSnapshot(id: number): Promise<MatchSnapshot> {
    const [fixtureResp, statsResp] = await Promise.all([
      this.getFixture(id),
      this.getFixtureStatistics(id),
    ]);

    const item = fixtureResp.response[0];
    if (!item) {
      throw new ApiFootballError(`fixture id=${id} not found`, {
        status: 200,
        bodyExcerpt: JSON.stringify(fixtureResp).slice(0, 500),
      });
    }
    const fetchedAt = Date.now();
    const partialFixture = normalizeFixtureItem(item, fetchedAt);
    const stats = normalizeStatistics(statsResp, partialFixture.homeTeam, partialFixture.awayTeam);
    return mergeIntoSnapshot(partialFixture, stats);
  }

  // --- internals ---

  private async get<S extends z.ZodTypeAny>(
    path: string,
    schema: S
  ): Promise<z.infer<S>> {
    const url = `${this.baseUrl}${path}`;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const raw = await this.fetchOnce(url);
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          throw new ApiFootballValidationError(
            `response schema mismatch for ${path}: ${parsed.error.message}`,
            { bodyExcerpt: JSON.stringify(raw).slice(0, 500) }
          );
        }
        const data = parsed.data as { errors?: unknown; response?: unknown };
        if (
          (Array.isArray(data.errors) && data.errors.length > 0) ||
          (data.errors && typeof data.errors === "object" && Object.keys(data.errors).length > 0)
        ) {
          throw new ApiFootballError(`api-football returned errors for ${path}`, {
            status: 200,
            bodyExcerpt: JSON.stringify(data.errors).slice(0, 500),
          });
        }
        return parsed.data;
      } catch (err) {
        lastErr = err;
        const retryable =
          (err instanceof ApiFootballError && err.status >= 500) ||
          err instanceof TypeError || // network errors surface as TypeError from fetch
          (err instanceof Error && err.name === "AbortError");
        if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw err;
        const delay = RETRY_DELAYS_MS[attempt]!;
        this.logger?.warn({ url, attempt: attempt + 1, delay }, "api-football retrying");
        await this.sleepImpl(delay);
      }
    }
    throw lastErr;
  }

  private async fetchOnce(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, {
        headers: { "x-apisports-key": this.apiKey, accept: "application/json" },
        signal: controller.signal,
      });
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const body = await safeText(res);
        throw new RateLimitedError(`rate limited at ${url}`, {
          retryAfterSeconds: retryAfter ? Number(retryAfter) : null,
          bodyExcerpt: body.slice(0, 500),
        });
      }
      if (!res.ok) {
        const body = await safeText(res);
        throw new ApiFootballError(`HTTP ${res.status} from ${url}`, {
          status: res.status,
          bodyExcerpt: body.slice(0, 500),
        });
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
