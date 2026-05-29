import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { DocsSidebar } from "@/components/docs/DocsSidebar";

export const metadata: Metadata = {
  title: {
    template: "%s · Regista 11 Docs",
    default: "Regista 11 Docs",
  },
  description:
    "How Regista 11 works — eleven autonomous AI personas, custom Uniswap v4 hook, gasless USDT0 settlement on X Layer.",
};

/**
 * Three-column docs shell.
 *
 *   ┌────────────┬──────────────────────────────┬────────────┐
 *   │  Sidebar   │  Article (Prose + TOC injection in page)  │
 *   │  (sticky)  │                              │  (right col │
 *   │            │                              │   on lg+)   │
 *   └────────────┴──────────────────────────────┴────────────┘
 *
 * Each page renders its own <article data-docs-article> containing the
 * <DocsBreadcrumb>, content, <DocsTOC>, and <DocsPager>. The TOC discovers
 * the article's headings at runtime (see DocsTOC).
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNavBar />
      <div className="min-h-screen bg-[var(--color-ghost-white)] pt-16">
        <div className="mx-auto flex w-full max-w-[1280px] gap-10 px-4 md:px-8">
          <DocsSidebar />
          <main className="min-w-0 flex-1 py-10">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
