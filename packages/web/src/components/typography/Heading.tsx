import { createElement, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type HeadingVariant = "h2" | "h3" | "h4";
export type HeadingTag = "h2" | "h3" | "h4" | "div" | "span";

interface HeadingProps extends Omit<HTMLAttributes<HTMLHeadingElement>, "children"> {
  as?: HeadingTag;
  variant?: HeadingVariant;
  children: ReactNode;
}

const VARIANT_CLASS: Record<HeadingVariant, string> = {
  h2: "text-[22px] md:text-[28px]",
  h3: "text-[18px] md:text-[22px]",
  h4: "text-[16px] md:text-[18px]",
};

const VARIANT_STYLE: Record<HeadingVariant, CSSProperties> = {
  h2: { lineHeight: 1.18, letterSpacing: "-0.56px" },
  h3: { lineHeight: 1.27, letterSpacing: "-0.44px" },
  h4: { lineHeight: 1.33, letterSpacing: "-0.36px" },
};

export function Heading({
  as,
  variant = "h2",
  className,
  style,
  children,
  ...rest
}: HeadingProps) {
  const tag = as ?? variant;
  return createElement(
    tag,
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
