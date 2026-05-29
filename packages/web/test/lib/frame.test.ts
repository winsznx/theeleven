import { describe, it, expect } from "vitest";

import type { Address, Hex } from "viem";

import {
  bigintReplacer,
  buildFrameTxResponse,
  renderErrorFrame,
  renderFrameHtml,
  renderSuccessFrame,
} from "@/lib/frame";
import { USDT0_ADDRESS } from "@/config/tokens";
import type { MarketRow } from "@/types/market";

const MARKET: MarketRow = {
  address: "0xefc51a4db2c5e2a8d7e8c8c8d7e8c8c8d7e8c8c8" as Address,
  agent: "0x1111111111111111111111111111111111111111" as Address,
  agentPersona: "il-regista",
  commitHash: "0xabc",
  paymentToken: USDT0_ADDRESS,
  marketDeadline: BigInt(Math.floor(Date.now() / 1000) + 1800),
  resolveDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
  state: "STAKING_OPEN",
  outcome: 0,
  overStakeTotal: 6n,
  underStakeTotal: 4n,
  revealedTemplateId: null,
  revealedParams: null,
  humanQuestion: "Will HOME keep a clean sheet in next 30'?",
  blockCreated: 1n,
};

describe("renderFrameHtml", () => {
  it("emits fc:miniapp JSON embed (+ legacy fc:frame alias) per Mini App spec", () => {
    const html = renderFrameHtml({
      imageUrl: "https://example.com/img.png",
      title: "Test frame",
      fallbackUrl: "https://example.com/market/0xabc",
      buttons: [
        { label: "Tap", action: "link", target: "https://example.com/market/0xabc" },
      ],
    });

    // Both the primary `fc:miniapp` tag and the legacy `fc:frame` alias
    // carry the same stringified embed JSON.
    const miniappMatch = html.match(/<meta name="fc:miniapp" content="([^"]+)"/);
    const legacyFrameMatch = html.match(/<meta name="fc:frame" content="([^"]+)"/);
    expect(miniappMatch).not.toBeNull();
    expect(legacyFrameMatch).not.toBeNull();
    expect(miniappMatch![1]).toBe(legacyFrameMatch![1]);

    // Decode the HTML-escaped JSON and assert the spec-required shape.
    const decoded = miniappMatch![1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const embed = JSON.parse(decoded) as {
      version: string;
      imageUrl: string;
      button: {
        title: string;
        action: { type: string; name: string; url: string };
      };
    };
    expect(embed.version).toBe("1");
    expect(embed.imageUrl).toBe("https://example.com/img.png");
    expect(embed.button.title).toBe("Tap");
    expect(embed.button.action.type).toBe("launch_miniapp");
    expect(embed.button.action.url).toBe("https://example.com/market/0xabc");
  });

  it("caps button title at 32 chars per Mini App spec", () => {
    const html = renderFrameHtml({
      imageUrl: "https://example.com/img.png",
      title: "Long title",
      fallbackUrl: "https://example.com/",
      buttons: [
        {
          label: "A very long button label that exceeds the 32 char cap",
          action: "link",
          target: "https://example.com/",
        },
      ],
    });
    const match = html.match(/<meta name="fc:miniapp" content="([^"]+)"/)!;
    const embed = JSON.parse(
      match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
    ) as { button: { title: string } };
    expect(embed.button.title.length).toBeLessThanOrEqual(32);
  });
});

describe("buildFrameTxResponse", () => {
  it("returns chainId eip155:196 + signTypedData_v4 + USDT0 verifyingContract", () => {
    const out = buildFrameTxResponse({
      domain: { name: "USD₮0", version: "1", chainId: 196, verifyingContract: USDT0_ADDRESS },
      types: {},
      primaryType: "TransferWithAuthorization",
      message: {},
    });
    expect(out.chainId).toBe("eip155:196");
    expect(out.method).toBe("eth_signTypedData_v4");
    expect(out.params.to).toBe(USDT0_ADDRESS);
    expect(out.params.abi).toEqual([]);
    expect(typeof out.params.data).toBe("string");
    const parsed = JSON.parse(out.params.data) as { domain: { name: string } };
    expect(parsed.domain.name).toBe("USD₮0");
  });
});

describe("renderSuccessFrame", () => {
  it("includes the OKLink tx href for the supplied tx hash", () => {
    const tx: Hex = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    const html = renderSuccessFrame(MARKET, tx, 1, 5_000_000n);
    expect(html).toMatch(/Staked \$5 on OVER/);
    expect(html).toContain(`https://www.oklink.com/x-layer/tx/${tx}`);
  });
});

describe("renderErrorFrame", () => {
  it("escapes user-controlled error text so injected HTML cannot leak", () => {
    const html = renderErrorFrame(MARKET, '<script>alert("x")</script>');
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("bigintReplacer", () => {
  it("turns bigints into decimal strings for JSON.stringify", () => {
    const out = JSON.stringify({ value: 12345n, nested: { v: 9n } }, bigintReplacer);
    expect(out).toBe('{"value":"12345","nested":{"v":"9"}}');
  });
});
