import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { cleanErrorMessage, isUserRejection } from "@/lib/errors";
import { HttpError } from "@/lib/http";

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleSpy.mockRestore();
});

function viemRevertWith(errorName: string) {
  return {
    name: "ContractFunctionExecutionError",
    shortMessage: "execution failed",
    cause: {
      name: "ContractFunctionRevertedError",
      shortMessage: `reverted with the following reason: ${errorName}`,
      data: { errorName },
    },
  };
}

describe("cleanErrorMessage", () => {
  it("maps a known revert reason to its user-friendly string", () => {
    const err = viemRevertWith("USDT0__InsufficientBalance");
    expect(cleanErrorMessage(err)).toBe("Insufficient USDT0 balance");
  });

  it("falls through to 'Transaction reverted: {raw}' for unknown reverts", () => {
    const err = viemRevertWith("SomeNewCustomError");
    expect(cleanErrorMessage(err)).toBe("Transaction reverted: SomeNewCustomError");
  });

  it("maps viem UserRejectedRequestError to 'Signature cancelled'", () => {
    const err = { name: "UserRejectedRequestError", message: "User rejected request" };
    expect(cleanErrorMessage(err)).toBe("Signature cancelled");
  });

  it("uses HttpError.userMessage when given an HttpError instance", () => {
    const err = new HttpError(400, "Invalid amount", "server log: amount=foo");
    expect(cleanErrorMessage(err)).toBe("Invalid amount");
  });

  it("recognises fetch network failure (TypeError 'Failed to fetch')", () => {
    const err = new TypeError("Failed to fetch");
    expect(cleanErrorMessage(err)).toBe("Couldn't reach the relayer — check connection");
  });

  it("returns the generic fallback for a string error", () => {
    expect(cleanErrorMessage("just a string")).toBe(
      "Something went wrong — try again. (See console for details)",
    );
  });

  it("returns the generic fallback for an unknown object", () => {
    expect(cleanErrorMessage({ foo: "bar" })).toBe(
      "Something went wrong — try again. (See console for details)",
    );
  });

  it("isUserRejection: true for viem reject, false for other errors", () => {
    expect(isUserRejection({ name: "UserRejectedRequestError" })).toBe(true);
    expect(isUserRejection({ code: 4001 })).toBe(true);
    expect(isUserRejection(viemRevertWith("USDT0__InsufficientBalance"))).toBe(false);
    expect(isUserRejection(new Error("boom"))).toBe(false);
    expect(isUserRejection(null)).toBe(false);
  });
});
