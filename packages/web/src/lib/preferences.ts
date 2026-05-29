/**
 * Browser-environment preference helpers — read once, no React state.
 * Safe to call from any code path (SSR-tolerant via typeof window check).
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function prefersSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return Boolean(nav.connection?.saveData);
}
