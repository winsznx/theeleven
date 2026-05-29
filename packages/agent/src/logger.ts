import pino, { type Logger } from "pino";

const level = process.env.LOG_LEVEL ?? "info";
const isDev = process.env.NODE_ENV !== "production" && level === "debug";

const REDACT_PATHS = [
  "mnemonic",
  "MASTER_MNEMONIC",
  "privateKey",
  "private_key",
  "pk",
  "apiKey",
  "API_FOOTBALL_KEY",
  "salt",
  "revealSalt",
  "create2Salt",
  "*.mnemonic",
  "*.privateKey",
  "*.pk",
  "*.apiKey",
  "*.salt",
  "*.revealSalt",
  "*.create2Salt",
  "headers.authorization",
  'headers["x-apisports-key"]',
];

export const logger: Logger = pino({
  level,
  base: { service: "regista11-agent" },
  redact: {
    paths: REDACT_PATHS,
    censor: "[Redacted]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }
    : {}),
});

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
