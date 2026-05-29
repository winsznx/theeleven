"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { USDT0_DECIMALS } from "@/config/tokens";
import { MarketStateBadge } from "@/components/dapp/MarketStateBadge";
import type { MarketOutcome, MarketState } from "@/types/market";

import { HexCard } from "./HexCard";
import { KITS } from "./pitch/kits";
import type { PersonaSlug } from "./pitch/PositionGrid";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface MarketCardProps {
  question: string;
  personaSlug: PersonaSlug;
  personaName: string;
  /** Probability in basis points (0–10000). */
  overOddsBips: number;
  underOddsBips: number;
  /** Volume in USDT0 micros (6 decimals). */
  volumeUSDT0: bigint;
  /** Unix seconds. */
  resolveDeadlineUnix: number;
  /** When present, the entire card links to /market/{address}. */
  marketAddress?: `0x${string}`;
  /** P16 retrofit: when set, the top-right corner shows a MarketStateBadge
   *  instead of the ⌛ minutes-to-resolve label. Pre-P16 callers omit it. */
  state?: MarketState;
  outcome?: MarketOutcome;
}

export function formatUSDT0(micros: bigint): string {
  const wholeBig = micros / 10n ** BigInt(USDT0_DECIMALS);
  const fractionBig = micros % 10n ** BigInt(USDT0_DECIMALS);
  const wholeNum = Number(wholeBig);
  const fractionNum = Number(fractionBig) / 10 ** USDT0_DECIMALS;
  const value = wholeNum + fractionNum;

  if (value >= 10) {
    return `$${Math.floor(value).toLocaleString("en-US")}`;
  }
  return `$${value.toFixed(2)}`;
}

function formatMinutesLeft(deadlineUnix: number, nowSeconds: number): string {
  const seconds = deadlineUnix - nowSeconds;
  if (seconds <= 0) return "0'";
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}'`;
}

interface ProbabilityValueProps {
  bips: number;
  label: string;
}

/**
 * P22-verified: 250ms cubic ease-out matches the 2026 Robinhood /
 * Polymarket probability-tween standard (200–300ms range, ease-out).
 * Exported so tests can lock the value.
 */
export const PROBABILITY_TWEEN_DURATION_MS = 250;
const TWEEN_DURATION_MS = PROBABILITY_TWEEN_DURATION_MS;

function ProbabilityValue({ bips, label }: ProbabilityValueProps) {
  const [displayBips, setDisplayBips] = useState(bips);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayBips(bips);
      return;
    }
    let raf = 0;
    let start = 0;
    let from = displayBips;
    const delta = bips - from;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / TWEEN_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayBips(from + delta * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bips]);

  const cents = Math.round(displayBips / 100);
  const percent = Math.round(displayBips / 100);

  return (
    <div className="flex flex-col items-center gap-1 rounded-[8px] border border-[var(--color-steel-gray)] py-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
        {label}
      </span>
      <span
        aria-label={`${label} probability ${percent} percent`}
        className="font-numerals text-[28px] leading-none text-[var(--color-deep-plum)] tabular-nums"
      >
        {cents}¢
      </span>
      <span className="font-numerals text-[12px] text-[var(--color-slate-text)] tabular-nums">
        {percent}%
      </span>
    </div>
  );
}

export function MarketCard({
  question,
  personaSlug,
  personaName,
  overOddsBips,
  underOddsBips,
  volumeUSDT0,
  resolveDeadlineUnix,
  marketAddress,
  state,
  outcome,
}: MarketCardProps) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const minutesLeft = formatMinutesLeft(resolveDeadlineUnix, nowSeconds);
  const jersey = KITS[personaSlug].jersey;

  const card = (
    <HexCard innerClassName="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: jersey }}
          />
          <span className="text-[var(--color-charcoal-text)]">{personaName}</span>
        </div>
        {state ? (
          <MarketStateBadge state={state} outcome={outcome} />
        ) : (
          <span className="font-mono text-[var(--color-slate-text)] tabular-nums">
            ⌛ {minutesLeft}
          </span>
        )}
      </div>

      <h3 className="text-[16px] font-medium leading-[1.3] text-[var(--color-deep-plum)]">
        {question}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <ProbabilityValue bips={overOddsBips} label="Over" />
        <ProbabilityValue bips={underOddsBips} label="Under" />
      </div>

      <div className="mt-auto text-[11px] text-[var(--color-slate-text)] tabular-nums font-numerals">
        {formatUSDT0(volumeUSDT0)} staked · X Layer
      </div>
    </HexCard>
  );

  if (marketAddress) {
    return (
      <Link
        href={`/market/${marketAddress}`}
        className="block focus:outline-none"
        aria-label={`Open market: ${question}`}
      >
        {card}
      </Link>
    );
  }

  return card;
}
