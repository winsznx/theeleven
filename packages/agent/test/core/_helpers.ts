import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import pino from "pino";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(HERE, "../../prisma/schema.prisma");

/**
 * Create a fresh SQLite DB in tmpdir + apply the Prisma schema via `db push`.
 * Returns a connected PrismaClient + a cleanup function.
 */
export function createTestDb(): {
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
} {
  const dir = mkdtempSync(`${tmpdir()}/regista11-agent-test-`);
  const dbPath = resolve(dir, "test.db");
  const dbUrl = `file:${dbPath}`;

  execSync(`pnpm exec prisma db push --schema=${SCHEMA_PATH} --skip-generate`, {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "ignore",
  });

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  return {
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export const silentLogger = pino({ level: "silent" });
