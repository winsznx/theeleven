import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/**
 * The `server-only` package throws at import time outside the Next.js
 * `react-server` condition. Vitest doesn't set that condition, so we stub
 * it to an empty module so server-only files (auth-cache, relayer, frame
 * routes) can be exercised by the test runner without exploding.
 */
vi.mock("server-only", () => ({}));

/**
 * RainbowKit's <ConnectButton> requires the WagmiProvider context, which we
 * don't initialize in the smoke test. Stub it with a labeled button so we can
 * still assert that the slot is wired.
 */
vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: () => (
    <button type="button" aria-label="Connect Wallet">
      Connect Wallet
    </button>
  ),
}));

// Framer Motion's useReducedMotion calls window.matchMedia which jsdom does
// not provide out of the box.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
