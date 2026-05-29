"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";

import { HexCard } from "@/components/landing/HexCard";
import { formatUSDT0 } from "@/components/landing/MarketCard";
import { LEGACY_USDT_ADDRESS, USDT0_ADDRESS } from "@/config/tokens";

interface LegacyUSDTRejectionProps {
  legacyBalance: bigint;
}

/**
 * Surfaced when the user holds the legacy USDT (0x1e4a…) but NO USDT0.
 *
 * The "Swap on OKX Web3" CTA tries the from/to query params first; if OKX
 * doesn't honor them, the user still lands on the swap surface with the
 * correct chain pre-selected via the chainId param.
 */
export function LegacyUSDTRejection({ legacyBalance }: LegacyUSDTRejectionProps) {
  const swapUrl =
    `https://web3.okx.com/swap?chainId=196` +
    `&fromToken=${LEGACY_USDT_ADDRESS}` +
    `&toToken=${USDT0_ADDRESS}`;

  return (
    <HexCard innerClassName="flex flex-col gap-4 p-5" data-legacy-rejection>
      <div className="flex items-center gap-2 text-[var(--color-action-orange)]">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
          You&apos;re holding legacy USDT
        </span>
      </div>

      <p className="text-[13px] leading-[1.5] text-[var(--color-charcoal-text)]">
        Regista 11 uses USDT0 — Tether&apos;s omnichain version on X Layer. Your
        legacy USDT can be swapped 1:1 in one step on OKX Web3 Wallet.
      </p>

      <div className="flex flex-wrap gap-2">
        <a
          href={swapUrl}
          target="_blank"
          rel="noreferrer"
          data-legacy-swap
          className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--color-action-orange)] px-4 py-2 text-[13px] font-medium text-[var(--color-ghost-white)] hover:opacity-90"
        >
          Swap on OKX Web3
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        <a
          href="https://docs.usdt0.to"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] px-4 py-2 text-[13px] font-medium text-[var(--color-charcoal-text)] hover:bg-[var(--color-fog-gray)]"
        >
          Learn more about USDT0
        </a>
      </div>

      <p className="font-numerals text-[11px] text-[var(--color-slate-text)] tabular-nums">
        Legacy balance · {formatUSDT0(legacyBalance)} USDT
      </p>
    </HexCard>
  );
}
