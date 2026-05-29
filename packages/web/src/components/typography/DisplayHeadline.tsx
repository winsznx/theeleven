import { createElement, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type DisplayHeadlineVariant = "display" | "display-md" | "display-sm";
export type DisplayHeadlineTag = "h1" | "h2" | "h3";

interface DisplayHeadlineProps extends Omit<HTMLAttributes<HTMLHeadingElement>, "children"> {
  as?: DisplayHeadlineTag;
  variant?: DisplayHeadlineVariant;
  children: ReactNode;
}

const VARIANT_CLASS: Record<DisplayHeadlineVariant, string> = {
  display: "text-[32px] md:text-[48px]",
  "display-md": "text-[28px] md:text-[40px]",
  "display-sm": "text-[24px] md:text-[32px]",
};

const VARIANT_STYLE: Record<DisplayHeadlineVariant, CSSProperties> = {
  display: { lineHeight: 1.04, letterSpacing: "-1.44px" },
  "display-md": { lineHeight: 1.1, letterSpacing: "-1.2px" },
  "display-sm": { lineHeight: 1.15, letterSpacing: "-0.96px" },
};

export function DisplayHeadline({
  as = "h1",
  variant = "display",
  className,
  style,
  children,
  ...rest
}: DisplayHeadlineProps) {
  return createElement(
    as,
    {
      ...rest,
      className: cn(
        "font-display font-semibold text-[var(--color-deep-plum)]",
        VARIANT_CLASS[variant],
        className,
      ),
      style: { ...VARIANT_STYLE[variant], ...style },
    },
    children,
  );
}
