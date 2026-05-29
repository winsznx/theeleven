import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ArchitectureStack } from "@/components/landing/ArchitectureStack";

describe("ArchitectureStack", () => {
  it("renders the 5 main stack layers in order", () => {
    render(<ArchitectureStack />);
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("x402 facilitator")).toBeInTheDocument();
    expect(screen.getByText("PropMarketHook")).toBeInTheDocument();
    expect(screen.getByText("USDT0 (EIP-3009)")).toBeInTheDocument();
    expect(screen.getByText("X Layer (chain 196)")).toBeInTheDocument();
  });

  it("renders the Flap cross-chain resolver sidecar", () => {
    render(<ArchitectureStack />);
    expect(screen.getByText("Cross-chain resolution")).toBeInTheDocument();
    expect(screen.getByText(/flap worldcupresolver on bnb chain/i)).toBeInTheDocument();
  });

  it("badges link to the expected external sponsor URLs", () => {
    render(<ArchitectureStack />);
    expect(
      screen.getByRole("link", { name: /hook the future/i }),
    ).toHaveAttribute("href", expect.stringContaining("atrium.academy"));
    expect(screen.getByRole("link", { name: /usdt0/i })).toHaveAttribute(
      "href",
      expect.stringContaining("usdt0.to"),
    );
    expect(screen.getByRole("link", { name: /x cup/i })).toHaveAttribute(
      "href",
      expect.stringContaining("okx.com"),
    );
    expect(screen.getByRole("link", { name: /^flap/i })).toHaveAttribute(
      "href",
      expect.stringContaining("flap.sh"),
    );
  });
});
