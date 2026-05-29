import { describe, it, expect, vi, beforeEach } from "vitest";

const mockWriteContract = vi.fn();
const mockCheckNonce = vi.fn();

vi.mock("@/app/api/facilitator/stake/relayer", () => ({
  getRelayer: () => ({
    account: { address: "0x4444444444444444444444444444444444444444" },
    chain: { id: 196 },
    writeContract: mockWriteContract,
  }),
  checkAndRecordNonce: (nonce: string) => mockCheckNonce(nonce),
}));

import { POST } from "@/app/api/facilitator/stake/route";
import { HttpError } from "@/lib/http";

function buildBody(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    market: "0x1111111111111111111111111111111111111111",
    from: "0x2222222222222222222222222222222222222222",
    side: 1,
    amount: "10000000",
    nonce: "0x" + "a".repeat(64),
    validBefore: String(now + 60),
    signature: "0x" + "a".repeat(64) + "b".repeat(64) + "1b",
    ...overrides,
  };
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/facilitator/stake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/facilitator/stake", () => {
  beforeEach(() => {
    mockWriteContract.mockReset();
    mockCheckNonce.mockReset();
    mockCheckNonce.mockImplementation(() => undefined);
  });

  it("missing field → 400 with HttpError userMessage", async () => {
    const body = buildBody();
    delete (body as Record<string, unknown>).from;
    const res = await POST(postRequest(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid from/i);
  });

  it("invalid address → 400", async () => {
    const res = await POST(postRequest(buildBody({ from: "0x1234" })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid from/i);
  });

  it("invalid amount → 400", async () => {
    const res = await POST(postRequest(buildBody({ amount: "-5" })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid amount/i);
  });

  it("duplicate nonce within window → 409", async () => {
    mockCheckNonce.mockImplementation(() => {
      throw new HttpError(409, "Duplicate submission", "Nonce reuse");
    });
    const res = await POST(postRequest(buildBody()));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Duplicate submission");
  });

  it("valid request → relayer.writeContract called with correct args", async () => {
    mockWriteContract.mockResolvedValueOnce("0xdeadbeef");
    const res = await POST(postRequest(buildBody()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.txHash).toBe("0xdeadbeef");
    expect(mockWriteContract).toHaveBeenCalledTimes(1);
    const call = mockWriteContract.mock.calls[0]![0];
    expect(call.functionName).toBe("stake");
    expect(call.args[0]).toMatch(/^0x2222/i);
    expect(call.args[1]).toBe(1); // side
    expect(call.args[2]).toBe(10_000_000n); // amount
    expect(call.args[3]).toBe(0n); // validAfter
    expect(typeof call.args[4]).toBe("bigint"); // validBefore
    expect(call.args[5]).toBe("0x" + "a".repeat(64)); // nonce
  });

  it("relayer rejection → 500 with generic message", async () => {
    mockWriteContract.mockRejectedValueOnce(new Error("RPC connection lost"));
    const res = await POST(postRequest(buildBody()));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Internal error — try again");
  });

  it("non-JSON body → 400 with Invalid JSON message", async () => {
    const res = await POST(postRequest("{ not json"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON body");
  });
});
