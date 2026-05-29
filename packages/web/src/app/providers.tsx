"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { useState, type ReactNode } from "react";

import { wagmiConfig } from "@/lib/wagmi";

/**
 * Column-themed RainbowKit modal: Action Orange primary, Deep Plum brand,
 * Ghost White surface. CSS variable bridging so the modal inherits the
 * same tokens as the rest of the app.
 */
const COLUMN_RK_THEME = lightTheme({
  accentColor: "#ec652b",
  accentColorForeground: "#ffffff",
  borderRadius: "small",
  fontStack: "system",
  overlayBlur: "small",
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={COLUMN_RK_THEME}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
