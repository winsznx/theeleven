"use client";

import { useEffect } from "react";
import { ExternalLink, Share2 } from "lucide-react";
import type { Address, Hex } from "viem";

import { HexCard } from "@/components/landing/HexCard";
import { formatUSDT0 } from "@/components/landing/MarketCard";
import { prefersReducedMotion } from "@/lib/preferences";

import { CheckIcon } from "./Icons";

interface StakeReceiptProps {
  txHash: Hex;
  side: "OVER" | "UNDER";
  amountMicros: bigint;
  marketAddress: Address;
  /** Optional human-readable market question for the share copy. */
  question?: string;
  /** Click handler for "Stake more" — typically calls flow.reset(). */
  onStakeMore: () => void;
}

function shortHash(hash: Hex): string {
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function shareUrl(args: {
  question: string | undefined;
  side: "OVER" | "UNDER";
  marketAddress: Address;
}): string {
  const text =
    `Just staked ${args.side} on "${args.question ?? "a live prop market"}" ` +
    `on Regista 11 — autonomous AI agents running football prop markets on X Layer.`;
  const url = `https://regista11.xyz/market/${args.marketAddress}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function StakeReceipt({
  txHash,
  side,
  amountMicros,
  marketAddress,
  question,
  onStakeMore,
}: StakeReceiptProps) {
  const oklinkUrl = `https://www.oklink.com/x-layer/tx/${txHash}`;

  // Haptic on mount — stake confirmed on chain is the moment to celebrate.
  // Wrapped in try/catch because the Web Vibration API is not in every
  // browser, and gated on reduced-motion preference.
  useEffect(() => {
    try {
      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator &&
        !prefersReducedMotion()
      ) {
        navigator.vibrate(15);
      }
    } catch {
      // Vibration API unavailable / blocked — silently skip.
    }
  }, []);

  return (
    <HexCard innerClassName="flex flex-col gap-4 p-5" data-stake-receipt>
      <div className="flex items-center gap-2 text-[var(--color-success-moss)]">
        <CheckIcon />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
          Stake placed
        </span>
      </div>

      <p className="text-[14px] text-[var(--color-charcoal-text)]">
        <span className="font-numerals tabular-nums font-semibold">
          {formatUSDT0(amountMicros)}
        </span>{" "}
        on{" "}
        <span className="font-medium text-[var(--color-deep-plum)]">{side}</span>
        {question ? <> · {question}</> : null}
      </p>

      <div className="flex flex-col gap-1 text-[12px] text-[var(--color-slate-text)]">
        <a
          href={oklinkUrl}
          target="_blank"
          rel="noreferrer"
          data-oklink-tx
          className="inline-flex items-center gap-1 font-mono text-[var(--color-deep-plum)] hover:underline tabular-nums"
        >
          Tx {shortHash(txHash)}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        <span className="font-mono tabular-nums">
          Stake position: visible in /portfolio (P18+)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStakeMore}
          className="rounded-[8px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] px-4 py-2 text-[13px] font-medium text-[var(--color-deep-plum)] hover:bg-[var(--color-fog-gray)]"
        >
          Stake more
        </button>
        <a
          href={shareUrl({ question, side, marketAddress })}
          target="_blank"
          rel="noreferrer"
          data-stake-share
          className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] px-4 py-2 text-[13px] font-medium text-[var(--color-charcoal-text)] hover:bg-[var(--color-fog-gray)]"
        >
          <Share2 className="h-3 w-3" aria-hidden /> Share
        </a>
      </div>
    </HexCard>
  );
}
