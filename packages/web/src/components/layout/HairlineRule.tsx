import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface HairlineRuleProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function HairlineRule({
  orientation = "horizontal",
  className,
  ...props
}: HairlineRuleProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-[var(--color-steel-gray)]",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        className
      )}
      {...props}
    />
  );
}
