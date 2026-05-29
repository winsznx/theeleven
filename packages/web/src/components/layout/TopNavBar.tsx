"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Container } from "./Container";
import { RegistaMark } from "@/icons/RegistaMark";
import { LiquidGlassSurface } from "@/components/glass/LiquidGlassSurface";
import { cn } from "@/lib/cn";

/**
 * Landing-only nav.
 *
 * P22: fixed-overlay glass-on-scroll. Above the fold the nav is
 * TRANSPARENT and floats over the dark Ballpit hero (ghost-white text on
 * plum reads cleanly). Past 8px of scroll it promotes to the Liquid Glass
 * top-nav variant so it floats over the scrolling light-bg content
 * sections without unreadable contrast.
 *
 * No ConnectButton on landing (P18 — wallet stack lives only on dApp
 * routes). The CTA is a plain Link to /markets.
 */
export function TopNavBar() {
  const [scrolled, setScrolled] = useState(false);

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
            scrolled ? "text-white" : "text-[var(--color-ghost-white)]",
          )}
        >
          <RegistaMark />
          <span className="text-sm font-medium uppercase tracking-[0.18em]">
            Regista 11
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {[
            { href: "/markets", label: "Markets" },
            { href: "/agents", label: "The Eleven" },
            { href: "/status", label: "Status" },
            { href: "/docs", label: "Docs" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "text-[14px] transition-colors",
                  scrolled
                    ? "text-white/85 hover:text-white"
                    : "text-[var(--color-ghost-white)]/80 hover:text-[var(--color-ghost-white)]",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/markets"
            data-landing-cta
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-[2px] px-4",
              "bg-[var(--color-action-orange)] text-[var(--color-ghost-white)] text-sm font-medium",
              "transition-shadow hover:shadow-[var(--shadow-hover)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-orange)]",
            )}
          >
            <span className="hidden md:inline">View Markets</span>
            <span className="sr-only md:hidden">View Markets</span>
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </nav>
    </Container>
  );

  return (
    <header
      data-top-nav
      data-scrolled={scrolled ? "true" : "false"}
      className="fixed inset-x-0 top-0 z-50"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {scrolled ? (
        <LiquidGlassSurface variant="top-nav" refraction={false}>
          {inner}
        </LiquidGlassSurface>
      ) : (
        inner
      )}
    </header>
  );
}
