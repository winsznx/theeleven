import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { Address, Hex } from "viem";
import type { StakeFlowState } from "@/hooks/useStakeFlow";

const mockUseAccount = vi.fn();
const mockUseChainId = vi.fn();
const mockSwitchChain = vi.fn();
const mockUseReadContract = vi.fn();
const mockUseUSDT0Balance = vi.fn();
const mockUseStakeFlow = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => mockUseAccount(),
  useChainId: () => mockUseChainId(),
  useSwitchChain: () => ({ switchChain: mockSwitchChain }),
  useReadContract: () => mockUseReadContract(),
  useSignTypedData: () => ({ signTypedDataAsync: vi.fn() }),
}));

vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: { Custom: ({ children }: { children: (a: { openConnectModal: () => void }) => React.ReactNode }) => children({ openConnectModal: () => {} }) },
}));

vi.mock("@/hooks/useUSDT0Balance", () => ({
  useUSDT0Balance: () => mockUseUSDT0Balance(),
}));

vi.mock("@/hooks/useStakeFlow", () => ({
  useStakeFlow: () => mockUseStakeFlow(),
}));

import { StakeWidget } from "@/components/dapp/stake/StakeWidget";

const MARKET = "0xabcdef0123456789abcdef0123456789abcdef01" as Address;

function defaultFlow(state: StakeFlowState = { kind: "idle" }) {
  return { state, submit: vi.fn(), reset: vi.fn() };
}

describe("StakeWidget — 8 state branches", () => {
  beforeEach(() => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false });
    mockUseChainId.mockReturnValue(196);
    mockSwitchChain.mockReset();
    mockUseReadContract.mockReturnValue({ data: 0n });
    mockUseUSDT0Balance.mockReturnValue({ balance: null, loading: false });
    mockUseStakeFlow.mockReturnValue(defaultFlow());
  });

  it("market closed renders the 'Staking closed' plate with no inputs", () => {
    const { container } = render(
      <StakeWidget marketAddress={MARKET} overOddsBips={5000} underOddsBips={5000} marketOpen={false} />,
    );
    expect(container.querySelector('[data-stake-branch="closed"]')).not.toBeNull();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("disconnected wallet renders Connect CTA", () => {
    const { container } = render(
      <StakeWidget marketAddress={MARKET} overOddsBips={5000} underOddsBips={5000} />,
    );
    expect(container.querySelector('[data-stake-branch="disconnected"]')).not.toBeNull();
    expect(screen.getByText(/connect wallet to stake/i)).toBeInTheDocument();
  });

  it("wrong chain renders Switch CTA", () => {
    mockUseAccount.mockReturnValue({ address: "0x1111111111111111111111111111111111111111", isConnected: true });
    mockUseChainId.mockReturnValue(1);
    const { container } = render(
      <StakeWidget marketAddress={MARKET} overOddsBips={5000} underOddsBips={5000} />,
    );
    expect(container.querySelector('[data-stake-branch="wrong-chain"]')).not.toBeNull();
    const btn = screen.getByRole("button", { name: /^switch to x layer$/i });
    expect(btn).toBeInTheDocument();
  });

  it("legacy USDT only renders LegacyUSDTRejection", () => {
    mockUseAccount.mockReturnValue({ address: "0x1111111111111111111111111111111111111111", isConnected: true });
    mockUseChainId.mockReturnValue(196);
    mockUseUSDT0Balance.mockReturnValue({ balance: 0n, loading: false });
    mockUseReadContract.mockReturnValue({ data: 50_000_000n }); // legacy > 0

    const { container } = render(
      <StakeWidget marketAddress={MARKET} overOddsBips={5000} underOddsBips={5000} />,
    );
    expect(container.querySelector("[data-legacy-rejection]")).not.toBeNull();
    expect(container.querySelector('a[data-legacy-swap]')).not.toBeNull();
  });

  it("insufficient USDT0 renders the insufficient button state", () => {
    mockUseAccount.mockReturnValue({ address: "0x1111111111111111111111111111111111111111", isConnected: true });
    mockUseChainId.mockReturnValue(196);
    mockUseUSDT0Balance.mockReturnValue({ balance: 1_000_000n, loading: false }); // $1
    mockUseReadContract.mockReturnValue({ data: 0n });

    render(<StakeWidget marketAddress={MARKET} overOddsBips={5000} underOddsBips={5000} />);
    // default amount is $10 = 10_000_000n micros which exceeds 1_000_000n balance
    const btn = screen.getByRole("button", { name: /insufficient usdt0/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("data-stake-state", "insufficient");
  });

  it("sufficient balance + idle flow renders full widget with ready button", () => {
    mockUseAccount.mockReturnValue({ address: "0x1111111111111111111111111111111111111111", isConnected: true });
    mockUseChainId.mockReturnValue(196);
    mockUseUSDT0Balance.mockReturnValue({ balance: 100_000_000n, loading: false }); // $100
    mockUseReadContract.mockReturnValue({ data: 0n });

    render(<StakeWidget marketAddress={MARKET} overOddsBips={6700} underOddsBips={3300} />);
    const btn = screen.getByRole("button", { name: /stake \$10\.00 on over/i });
    expect(btn).toHaveAttribute("data-stake-state", "ready");
  });

  it("success state renders StakeReceipt with tx hash", () => {
    mockUseAccount.mockReturnValue({ address: "0x1111111111111111111111111111111111111111", isConnected: true });
    mockUseChainId.mockReturnValue(196);
    mockUseUSDT0Balance.mockReturnValue({ balance: 100_000_000n, loading: false });
    const tx = ("0x" + "a".repeat(64)) as Hex;
    mockUseStakeFlow.mockReturnValue(defaultFlow({ kind: "success", txHash: tx }));

    const { container } = render(
      <StakeWidget marketAddress={MARKET} overOddsBips={5000} underOddsBips={5000} />,
    );
    expect(container.querySelector("[data-stake-receipt]")).not.toBeNull();
    expect(container.querySelector("[data-oklink-tx]")?.getAttribute("href")).toBe(
      `https://www.oklink.com/x-layer/tx/${tx}`,
    );
  });

  it("error state renders the retry button + clean inline message", () => {
    mockUseAccount.mockReturnValue({ address: "0x1111111111111111111111111111111111111111", isConnected: true });
    mockUseChainId.mockReturnValue(196);
    mockUseUSDT0Balance.mockReturnValue({ balance: 100_000_000n, loading: false });
    mockUseStakeFlow.mockReturnValue(
      defaultFlow({ kind: "error", message: "Signature expired — sign again" }),
    );

    const { container } = render(
      <StakeWidget marketAddress={MARKET} overOddsBips={5000} underOddsBips={5000} />,
    );
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(container.querySelector("[data-stake-error]")?.textContent).toMatch(
      /signature expired/i,
    );
  });
});
