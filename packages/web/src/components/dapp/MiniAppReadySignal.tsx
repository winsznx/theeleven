"use client";

import { useEffect } from "react";

/**
 * When the dApp loads INSIDE a Farcaster Mini App context (the user
 * tapped the embed button in a cast), the host shows a splash screen
 * until the app calls `sdk.actions.ready()`. Without this call the
 * splash sits there forever and the Embed Tool flags "Ready not called."
 *
 * Outside a Mini App host the SDK's ready() resolves to a no-op, so it's
 * safe to fire on every dApp page load.
 */
export function MiniAppReadySignal() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        if (cancelled) return;
        await sdk.actions.ready();
      } catch {
        // SDK isn't reachable outside a Mini App host — silent on
        // purpose; this is best-effort wiring, not a critical path.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
