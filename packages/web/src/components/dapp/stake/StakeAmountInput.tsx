"use client";

import { useId } from "react";

import { formatUSDT0 } from "@/components/landing/MarketCard";

interface StakeAmountInputProps {
  value: string;
  onChange: (next: string) => void;
  /** USDT0 balance in 6-decimal micros — used to render "Balance: $X.XX". */
  balance: bigint | null;
  disabled?: boolean;
}

export function StakeAmountInput({ value, onChange, balance, disabled }: StakeAmountInputProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
          Amount (USDT0)
        </span>
        {balance !== null ? (
          <span
            data-balance
            className="font-numerals text-[11px] text-[var(--color-slate-text)] tabular-nums"
          >
            Balance · {formatUSDT0(balance)}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 rounded-[8px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] px-3 py-2 focus-within:border-[var(--color-deep-plum)]">
        <span className="font-mono text-[14px] text-[var(--color-slate-text)]">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent font-numerals text-[16px] tabular-nums text-[var(--color-charcoal-text)] outline-none disabled:opacity-60"
          aria-label="Stake amount in USDT0"
        />
      </div>
    </label>
  );
}
