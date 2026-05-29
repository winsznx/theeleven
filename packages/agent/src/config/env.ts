import { z } from "zod";
import "dotenv/config";

const mnemonicSchema = z
  .string()
  .min(1)
  .refine(
    (v) => {
      const words = v.trim().split(/\s+/);
      return words.length === 12 || words.length === 24;
    },
    { message: "MASTER_MNEMONIC must be 12 or 24 words" }
  );

const envSchema = z.object({
  MASTER_MNEMONIC: mnemonicSchema,
  XLAYER_RPC: z.string().url().default("https://rpc.xlayer.tech"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  API_FOOTBALL_KEY: z.string().min(1),
  API_FOOTBALL_BASE_URL: z.string().url().default("https://v3.football.api-sports.io"),
  MATCH_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
