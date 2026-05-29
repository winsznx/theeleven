import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface EyebrowChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "live" | "neutral";
}

/** §8.4.2 — small uppercase tracker chip; "LIVE NOW" + match-window labels. */
export function EyebrowChip({
  tone = "neutral",
  className,
  children,
  ...props
}: EyebrowChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-1",
        "text-[10px] font-medium uppercase tracking-[0.12em]",
        tone === "live"
          ? "border-[var(--color-action-orange)] text-[var(--color-action-orange)]"
          : "border-[var(--color-steel-gray)] text-[var(--color-slate-text)]",
        className
      )}
      {...props}
    >
      {tone === "live" && (
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-action-orange)] animate-pulse"
        />
      )}
      {children}
    </span>
  );
}
