export class ApiFootballError extends Error {
  readonly status: number;
  readonly bodyExcerpt: string;
  constructor(message: string, opts: { status: number; bodyExcerpt?: string }) {
    super(message);
    this.name = "ApiFootballError";
    this.status = opts.status;
    this.bodyExcerpt = opts.bodyExcerpt ?? "";
  }
}

export class RateLimitedError extends ApiFootballError {
  readonly retryAfterSeconds: number | null;
  constructor(message: string, opts: { bodyExcerpt?: string; retryAfterSeconds?: number | null }) {
    super(message, { status: 429, bodyExcerpt: opts.bodyExcerpt });
    this.name = "RateLimitedError";
    this.retryAfterSeconds = opts.retryAfterSeconds ?? null;
  }
}

export class ApiFootballValidationError extends ApiFootballError {
  constructor(message: string, opts: { bodyExcerpt?: string }) {
    super(message, { status: 200, bodyExcerpt: opts.bodyExcerpt });
    this.name = "ApiFootballValidationError";
  }
}
