import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

import type { Address } from "viem";
import type { MarketRow } from "@/types/market";

vi.mock("@/components/dapp/stake/StakeWidget", () => ({
  StakeWidget: () => <div data-testid="stake-widget-mock">stake widget</div>,
}));

import { MarketDetailView } from "@/components/dapp/MarketDetailView";

const PHONE_WIDTH = 375;

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: PHONE_WIDTH,
  });
  window.dispatchEvent(new Event("resize"));
});

const SAMPLE: MarketRow = {
  address: "0xefc51a4db2c5e2a8d7e8c8c8d7e8c8c8d7e8c8c8" as Address,
  agent: "0x1111111111111111111111111111111111111111" as Address,
  agentPersona: "il-regista",
  commitHash: "0xdeadbeef",
  paymentToken: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
  marketDeadline: BigInt(Math.floor(Date.now() / 1000) + 600),
  resolveDeadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
  state: "STAKING_OPEN",
  outcome: 0,
  overStakeTotal: 67_000_000n,
  underStakeTotal: 33_000_000n,
  revealedTemplateId: null,
  revealedParams: null,
  humanQuestion: "Will HOME keep a clean sheet in next 30'?",
  blockCreated: 1n,
};

describe("MarketDetailView at 375px", () => {
  it("renders without inline-width overflows on a phone-width viewport", () => {
    // #given a phone-width viewport
    // #when the market detail view renders
    const { container } = render(<MarketDetailView market={SAMPLE} />);
    // #then no element pins an inline pixel width above the viewport
    const offenders = Array.from(container.querySelectorAll<HTMLElement>("*")).filter(
      (el) => {
        const w = el.style.width;
        if (!w) return false;
        const m = /^(\d+)px$/.exec(w);
        if (!m) return false;
        return Number(m[1]) > PHONE_WIDTH;
      },
    );
    expect(offenders).toEqual([]);
  });
});
