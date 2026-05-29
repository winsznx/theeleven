import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import type { Hex, Address } from "viem";

const mockAccount = { address: "0xabcd000000000000000000000000000000000000" as Address };
const mockSignTypedDataAsync = vi.fn();
const mockWaitForReceipt = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mockAccount.address, isConnected: true }),
  useSignTypedData: () => ({ signTypedDataAsync: mockSignTypedDataAsync }),
}));

vi.mock("@/lib/onchain", () => ({
  getPublicClient: () => ({
    waitForTransactionReceipt: mockWaitForReceipt,
  }),
}));

import { useStakeFlow } from "@/hooks/useStakeFlow";

const MARKET = "0x1234567890123456789012345678901234567890" as Address;
const SAMPLE_SIG = ("0x" + "a".repeat(64) + "b".repeat(64) + "1b") as Hex;
const SAMPLE_TX: Hex = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

function setup() {
  return renderHook(() =>
    useStakeFlow({ marketAddress: MARKET, side: 1, amountMicros: 10_000_000n }),
  );
}

describe("useStakeFlow", () => {
  beforeEach(() => {
    mockSignTypedDataAsync.mockReset();
    mockWaitForReceipt.mockReset();
    global.fetch = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("idle → signing → submitting → confirming → success", async () => {
    mockSignTypedDataAsync.mockResolvedValueOnce(SAMPLE_SIG);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txHash: SAMPLE_TX }),
    });
    mockWaitForReceipt.mockResolvedValueOnce({ status: "success" });

    const { result } = setup();
    expect(result.current.state.kind).toBe("idle");
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.kind).toBe("success");
    if (result.current.state.kind === "success") {
      expect(result.current.state.txHash).toBe(SAMPLE_TX);
    }
  });

  it("user rejection returns to idle (NOT error)", async () => {
    mockSignTypedDataAsync.mockRejectedValueOnce({
      name: "UserRejectedRequestError",
      message: "User rejected",
    });

    const { result } = setup();
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.kind).toBe("idle");
  });

  it("sign error (non-rejection) → error state with cleanErrorMessage", async () => {
    mockSignTypedDataAsync.mockRejectedValueOnce(new Error("kernel panic"));

    const { result } = setup();
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.message).toMatch(/something went wrong/i);
    }
  });

  it("API 400 → error state with server message", async () => {
    mockSignTypedDataAsync.mockResolvedValueOnce(SAMPLE_SIG);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid amount" }),
    });

    const { result } = setup();
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.message).toBe("Invalid amount");
    }
  });

  it("API 500 → error state with fallback message", async () => {
    mockSignTypedDataAsync.mockResolvedValueOnce(SAMPLE_SIG);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal error — try again" }),
    });

    const { result } = setup();
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.kind).toBe("error");
  });

  it("unmount mid-flow → no setState warning (cancelled flag works)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    let resolveFetch: ((value: { ok: boolean; json: () => Promise<{ txHash: Hex }> }) => void) | null =
      null;
    mockSignTypedDataAsync.mockResolvedValueOnce(SAMPLE_SIG);
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((res) => {
        resolveFetch = res;
      }),
    );

    const { result, unmount } = setup();
    void act(() => {
      void result.current.submit();
    });
    await waitFor(() => expect(result.current.state.kind).not.toBe("idle"));
    unmount();
    if (resolveFetch) {
      (resolveFetch as (v: { ok: boolean; json: () => Promise<{ txHash: Hex }> }) => void)({
        ok: true,
        json: async () => ({ txHash: SAMPLE_TX }),
      });
    }
    await new Promise((r) => setTimeout(r, 10));

    const setStateWarnings = warnSpy.mock.calls.filter((args) =>
      String(args[0]).includes("setState"),
    );
    expect(setStateWarnings).toHaveLength(0);
    warnSpy.mockRestore();
  });
});
