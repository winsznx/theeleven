"use client";

import { useReducedMotion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

/**
 * iOS-26 Liquid Glass surface — shared chrome for the BottomTabBar +
 * the glass-on-scroll TopNavBar/DAppNavBar.
 *
 * Rules (locked by Grok research):
 *   - Never stack glass on glass.
 *   - Never apply to content surfaces (cards, market rows).
 *   - Never let translucent nav sit over a light hero unreadable.
 *   - feDisplacementMap NOT on long scroll lists.
 *
 * Refraction is opt-in via filter: url(#liquid-refract) — auto-disabled
 * under prefers-reduced-motion. The SVG filter id is injected in the
 * root layout's <body>.
 */

export type LiquidGlassVariant = "tab-bar" | "top-nav" | "sheet";

const VARIANT_CLASSES: Record<LiquidGlassVariant, string> = {
  "tab-bar":
    // Floating pill — bottom nav. Dark default; data-dense screens have
    // light content beneath that contrasts well.
    "rounded-[28px] border border-white/[0.12] " +
      "shadow-[0_8px_32px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] " +
      "bg-[rgba(20,22,26,0.55)] " +
      "supports-[not_(backdrop-filter:_blur(0))]:bg-[rgba(20,22,26,0.92)] " +
      "[backdrop-filter:blur(24px)_saturate(180%)] " +
      "[-webkit-backdrop-filter:blur(24px)_saturate(180%)]",
  "top-nav":
    "border-b border-white/[0.08] " +
      "bg-[rgba(20,22,26,0.55)] " +
      "supports-[not_(backdrop-filter:_blur(0))]:bg-[rgba(20,22,26,0.92)] " +
      "[backdrop-filter:blur(20px)_saturate(160%)] " +
      "[-webkit-backdrop-filter:blur(20px)_saturate(160%)]",
  "sheet":
    "rounded-t-[24px] border border-white/[0.12] " +
      "bg-[rgba(20,22,26,0.65)] " +
      "supports-[not_(backdrop-filter:_blur(0))]:bg-[rgba(20,22,26,0.92)] " +
      "[backdrop-filter:blur(32px)_saturate(180%)] " +
      "[-webkit-backdrop-filter:blur(32px)_saturate(180%)]",
};

interface LiquidGlassSurfaceProps extends ComponentPropsWithoutRef<"div"> {
  variant: LiquidGlassVariant;
  /** Defaults true; auto-disabled under prefers-reduced-motion. */
  refraction?: boolean;
}

export function LiquidGlassSurface({
  variant,
  refraction = true,
  className,
  style,
  children,
  ...rest
}: LiquidGlassSurfaceProps) {
  const reducedMotion = useReducedMotion();
  const applyRefraction = refraction && !reducedMotion;

  return (
    <div
      data-glass-variant={variant}
      data-glass-refraction={applyRefraction ? "on" : "off"}
      className={cn(VARIANT_CLASSES[variant], className)}
      style={{
        ...style,
        filter: applyRefraction ? "url(#liquid-refract)" : undefined,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Inline SVG defs that any LiquidGlassSurface refers to via
 * filter: url(#liquid-refract). Mount once at the bottom of <body> in
 * the root layout so the id is available to every surface on every route.
 */
export function LiquidGlassFilterDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id="liquid-refract">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves="2"
            seed="3"
          />
          <feDisplacementMap in="SourceGraphic" scale="12" />
        </filter>
      </defs>
    </svg>
  );
}
