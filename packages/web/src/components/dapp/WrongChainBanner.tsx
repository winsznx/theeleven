"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { xLayer } from "wagmi/chains";

import { Container } from "@/components/layout/Container";

/**
 * Sticky banner shown when the wallet is connected on a non-X-Layer chain.
 * Returns null when disconnected OR connected on chain 196 (X Layer). The
 * "Switch network" button triggers wagmi's switchChain — wallets that
 * don't have X Layer added will prompt the user to add it.
 */
export function WrongChainBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return null;
  if (chainId === xLayer.id) return null;

  return (
    <div
      role="alert"
      data-banner="wrong-chain"
      className="sticky top-16 z-40 w-full border-b border-[var(--color-action-orange)] bg-[var(--color-action-orange)]/10"
    >
      <Container>
        <div className="flex flex-col gap-2 py-3 text-[13px] text-[var(--color-charcoal-text)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            You&apos;re connected to chain {chainId}. Switch to X Layer to view live markets.
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => switchChain({ chainId: xLayer.id })}
            className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--color-action-orange)] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.06em] text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Switching…" : "Switch network →"}
          </button>
        </div>
      </Container>
    </div>
  );
}
