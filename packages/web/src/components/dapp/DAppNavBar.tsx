"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

import { Container } from "@/components/layout/Container";
import { RegistaMark } from "@/icons/RegistaMark";
import { LiquidGlassSurface } from "@/components/glass/LiquidGlassSurface";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/markets", label: "Markets", section: "markets" },
  { href: "/agents", label: "The Eleven", section: "agents" },
  { href: "/status", label: "Status", section: "status" },
  { href: "/docs", label: "Docs", section: "docs" },
] as const;

function sectionFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  if (pathname === "/markets" || pathname.startsWith("/market")) return "markets";
  if (pathname.startsWith("/agents")) return "agents";
  if (pathname.startsWith("/status")) return "status";
  if (pathname.startsWith("/docs")) return "docs";
  return null;
}

/**
 * P22: glass-on-scroll DAppNavBar. The P21 hamburger drawer is GONE —
 * mobile nav lives in `<BottomTabBar />` now. The top bar on mobile is
 * just logo + ConnectButton; on desktop it adds horizontal nav links.
 */
export function DAppNavBar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const activeSection = sectionFromPath(pathname);

  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        rafId = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const inner = (
    <Container>
      <nav
        aria-label="Primary"
        className="flex h-[52px] items-center justify-between gap-4"
      >
        <Link
          href="/"
          className={cn(
            "group flex items-center gap-2",
            scrolled ? "text-white" : "text-[var(--color-deep-plum)]",
          )}
        >
          <RegistaMark />
          <span className="text-sm font-medium uppercase tracking-[0.18em]">
            Regista 11
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.section;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  data-active={isActive ? "true" : undefined}
                  className={cn(
                    "text-[14px] transition-colors",
                    scrolled
                      ? isActive
                        ? "font-medium text-white"
                        : "text-white/85 hover:text-white"
                      : isActive
                        ? "font-medium text-[var(--color-deep-plum)]"
                        : "text-[var(--color-charcoal-text)] hover:text-[var(--color-deep-plum)]",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <ConnectButton
            accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
            chainStatus={{ smallScreen: "icon", largeScreen: "icon" }}
            showBalance={false}
          />
        </div>
      </nav>
    </Container>
  );

  return (
    <header
      data-dapp-nav
      data-scrolled={scrolled ? "true" : "false"}
      className="sticky top-0 z-50 w-full"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {scrolled ? (
        <LiquidGlassSurface variant="top-nav" refraction={false}>
          {inner}
        </LiquidGlassSurface>
      ) : (
        <div className="border-b border-transparent bg-[var(--color-ghost-white)]">
          {inner}
        </div>
      )}
    </header>
  );
}
