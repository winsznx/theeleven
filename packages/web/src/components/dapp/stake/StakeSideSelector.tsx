"use client";

import { cn } from "@/lib/cn";

export type StakeSide = "OVER" | "UNDER";

interface StakeSideSelectorProps {
  side: StakeSide;
  overCents: number;
  underCents: number;
  onChange: (next: StakeSide) => void;
  disabled?: boolean;
}

export function StakeSideSelector({
  side,
  overCents,
  underCents,
  onChange,
  disabled,
}: StakeSideSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Select side">
      {(
        [
          { id: "OVER", cents: overCents },
          { id: "UNDER", cents: underCents },
        ] as const
      ).map((opt) => {
        const selected = side === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            data-side={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-[8px] border py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-[var(--color-deep-plum)] bg-[var(--color-fog-gray)]"
                : "border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] hover:border-[var(--color-deep-plum)]/30",
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
              {opt.id}
            </span>
            <span className="font-numerals text-[24px] leading-none text-[var(--color-deep-plum)] tabular-nums">
              {opt.cents}¢
            </span>
          </button>
        );
      })}
    </div>
  );
}
