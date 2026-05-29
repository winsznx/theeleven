import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { DAppNavBar } from "@/components/dapp/DAppNavBar";
import { BottomTabBar } from "@/components/dapp/BottomTabBar";
import { WrongChainBanner } from "@/components/dapp/WrongChainBanner";
import { MiniAppReadySignal } from "@/components/dapp/MiniAppReadySignal";
import { Providers } from "@/app/providers";

/**
 * Shared chrome for /markets, /market/[address], /agents, /agents/[slug],
 * /status.
 *
 * P18: <Providers> mounted here so landing skips the wallet bundle.
 * P22: <BottomTabBar /> floats above mobile content (md:hidden). <main>
 * gets `pb-24 md:pb-0` so content isn't obscured by the floating pill.
 */
export default function DAppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <MiniAppReadySignal />
      <DAppNavBar />
      <WrongChainBanner />
      <main className="min-h-[calc(100vh-4rem-1px)] pb-24 md:pb-0">
        {children}
      </main>
      <BottomTabBar />
      <Footer />
    </Providers>
  );
}
