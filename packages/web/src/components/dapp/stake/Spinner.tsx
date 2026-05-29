"use client";

import { useReducedMotion } from "motion/react";

/**
 * 12px monochrome spinner that respects prefers-reduced-motion. When reduced,
 * shows a static 3-dot ellipsis instead of rotation — same visual weight,
 * no motion.
 */
export function Spinner() {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <svg
        aria-hidden
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        className="inline-block"
      >
        <circle cx="2" cy="6" r="1.5" />
        <circle cx="6" cy="6" r="1.5" />
        <circle cx="10" cy="6" r="1.5" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="inline-block animate-spin"
    >
      <circle
        cx="6"
        cy="6"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.25"
      />
      <path
        d="M 10.5 6 A 4.5 4.5 0 0 0 6 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
