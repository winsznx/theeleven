import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { StakeReceipt } from "@/components/dapp/stake/StakeReceipt";
import type { Address, Hex } from "viem";

const TX: Hex = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const MARKET = "0x1234567890123456789012345678901234567890" as Address;

describe("StakeReceipt", () => {
  it("tx hash links to the OKLink tx page", () => {
    const { container } = render(
      <StakeReceipt
        txHash={TX}
        side="OVER"
        amountMicros={10_000_000n}
        marketAddress={MARKET}
        onStakeMore={() => {}}
      />,
    );
    const a = container.querySelector("a[data-oklink-tx]");
    expect(a).not.toBeNull();
    expect(a!.getAttribute("href")).toBe(`https://www.oklink.com/x-layer/tx/${TX}`);
  });

  it("share button opens an X intent with prefilled text + market URL", () => {
    const { container } = render(
      <StakeReceipt
        txHash={TX}
        side="UNDER"
        amountMicros={4_500_000n}
        marketAddress={MARKET}
        question="Will HOME keep a clean sheet?"
        onStakeMore={() => {}}
      />,
    );
    const share = container.querySelector("a[data-stake-share]") as HTMLAnchorElement;
    expect(share).not.toBeNull();
    expect(share.href).toContain("twitter.com/intent/tweet");
    const decoded = decodeURIComponent(share.search);
    expect(decoded).toMatch(/UNDER/);
    expect(decoded).toMatch(/will home keep a clean sheet/i);
    expect(decoded).toMatch(/regista11\.xyz\/market\//);
  });

  it("'Stake more' button calls onStakeMore (reset)", () => {
    const onStakeMore = vi.fn();
    render(
      <StakeReceipt
        txHash={TX}
        side="OVER"
        amountMicros={10_000_000n}
        marketAddress={MARKET}
        onStakeMore={onStakeMore}
      />,
    );
    screen.getByRole("button", { name: /stake more/i }).click();
    expect(onStakeMore).toHaveBeenCalledTimes(1);
  });

  describe("haptic on mount", () => {
    const originalVibrate = (navigator as Navigator & { vibrate?: unknown }).vibrate;
    const originalMatchMedia = window.matchMedia;
    let vibrateSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vibrateSpy = vi.fn().mockReturnValue(true);
      Object.defineProperty(navigator, "vibrate", {
        configurable: true,
        writable: true,
        value: vibrateSpy,
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, "vibrate", {
        configurable: true,
        writable: true,
        value: originalVibrate,
      });
      window.matchMedia = originalMatchMedia;
    });

    it("calls navigator.vibrate(15) when reduced-motion is OFF", () => {
      // #given reduced motion is off
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      // #when the receipt mounts
      render(
        <StakeReceipt
          txHash={TX}
          side="OVER"
          amountMicros={10_000_000n}
          marketAddress={MARKET}
          onStakeMore={() => {}}
        />,
      );
      // #then a single 15ms pulse fires
      expect(vibrateSpy).toHaveBeenCalledTimes(1);
      expect(vibrateSpy).toHaveBeenCalledWith(15);
    });

    it("skips navigator.vibrate when reduced-motion is ON", () => {
      // #given reduced motion is on
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      // #when the receipt mounts
      render(
        <StakeReceipt
          txHash={TX}
          side="OVER"
          amountMicros={10_000_000n}
          marketAddress={MARKET}
          onStakeMore={() => {}}
        />,
      );
      // #then no haptic fires
      expect(vibrateSpy).not.toHaveBeenCalled();
    });
  });
});
