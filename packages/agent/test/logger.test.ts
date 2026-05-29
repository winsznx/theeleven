import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import pino from "pino";

describe("logger redaction", () => {
  let chunks: string[];
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    chunks = [];
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((c: any) => {
      chunks.push(typeof c === "string" ? c : c.toString());
      return true;
    });
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  function makeRedactingLogger() {
    // Mirror src/logger.ts redaction config so this test isolates the
    // redaction behaviour from any module-load-time stdout pollution.
    return pino({
      redact: {
        paths: [
          "mnemonic",
          "MASTER_MNEMONIC",
          "privateKey",
          "private_key",
          "pk",
          "*.mnemonic",
          "*.privateKey",
          "*.pk",
          "headers.authorization",
        ],
        censor: "[Redacted]",
      },
    });
  }

  it("redacts top-level mnemonic + privateKey + nested *.privateKey", () => {
    const log = makeRedactingLogger();
    log.info({
      mnemonic: "horse battery staple correct",
      privateKey: "0xdeadbeef",
      nested: { privateKey: "0xcafefade" },
      benign: "kept",
    });

    const joined = chunks.join("");
    expect(joined).toContain("[Redacted]");
    expect(joined).not.toContain("horse battery");
    expect(joined).not.toContain("0xdeadbeef");
    expect(joined).not.toContain("0xcafefade");
    expect(joined).toContain("kept");
  });
});
