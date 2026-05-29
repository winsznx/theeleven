import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface HexCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Inner padding token — defaults to p-5. */
  innerClassName?: string;
}

/**
 * PRD §8.1.5 hex-corner card — 6px notches at top-right and bottom-left,
 * 1px steel-gray border, ghost-white fill, subtle elevation that lifts
 * on hover. Two-div structure so the clipped polygon naturally produces a
 * 1px border at every edge including the diagonal cuts.
 */
export function HexCard({
  children,
  className,
  innerClassName,
  ...rest
}: HexCardProps) {
  return (
    <div
      className={cn(
        "hex-card relative bg-[var(--color-steel-gray)] p-px shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)]",
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          "hex-card h-full bg-[var(--color-ghost-white)] p-5",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
