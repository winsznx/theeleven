import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseAccount = vi.fn();
const mockUseChainId = vi.fn();
const mockSwitchChain = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => mockUseAccount(),
  useChainId: () => mockUseChainId(),
  useSwitchChain: () => ({ switchChain: mockSwitchChain, isPending: false }),
}));

// Import AFTER mocks so the component sees mocked wagmi.
import { WrongChainBanner } from "@/components/dapp/WrongChainBanner";

describe("WrongChainBanner", () => {
  beforeEach(() => {
    mockUseAccount.mockReset();
    mockUseChainId.mockReset();
    mockSwitchChain.mockReset();
  });

  it("renders nothing when wallet is not connected", () => {
    mockUseAccount.mockReturnValue({ isConnected: false });
    mockUseChainId.mockReturnValue(1);
    const { container } = render(<WrongChainBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when connected on X Layer (chain 196)", () => {
    mockUseAccount.mockReturnValue({ isConnected: true });
    mockUseChainId.mockReturnValue(196);
    const { container } = render(<WrongChainBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders banner + switch button on a non-X-Layer chain", () => {
    mockUseAccount.mockReturnValue({ isConnected: true });
    mockUseChainId.mockReturnValue(1);
    render(<WrongChainBanner />);
    expect(screen.getByText(/connected to chain 1/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /switch network/i });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 196 });
  });
});
