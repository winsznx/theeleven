#!/usr/bin/env tsx
import { loadEnv } from "../config/env.js";
import { logger } from "../logger.js";
import { runCli } from "./cli.js";

runCli(process.argv, { env: loadEnv, logger }).then(
  (code) => process.exit(code),
  (err) => {
    logger.error({ err }, "cli crashed");
    process.exit(1);
  }
);
