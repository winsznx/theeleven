"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Users, Activity } from "lucide-react";

import { LiquidGlassSurface } from "@/components/glass/LiquidGlassSurface";
import { cn } from "@/lib/cn";

interface Tab {
  href: string;
  label: string;
  icon: typeof Home;
  matchOn: readonly string[];
}

const TABS: readonly Tab[] = [
  { href: "/", label: "Home", icon: Home, matchOn: ["/"] },
  {
    href: "/markets",
    label: "Markets",
    icon: BarChart3,
    matchOn: ["/markets", "/market"],
  },
  { href: "/agents", label: "Eleven", icon: Users, matchOn: ["/agents"] },
  { href: "/status", label: "Status", icon: Activity, matchOn: ["/status"] },
];

function matches(pathname: string | null, prefixes: readonly string[]): boolean {
  if (!pathname) return false;
  return prefixes.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * iOS-26 floating pill — mobile dApp nav. Mounted in `(dapp)/layout.tsx`,
 * hidden at md+ where the DAppNavBar shows horizontal nav links.
 *
 * Pinned 12px from the bottom with safe-area inset for the iOS home bar.
 * Active state is a bright icon + an above-icon orange dot — never a
 * filled background pill (Grok's "don't fight the glass" rule).
 */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      data-bottom-tab-bar
      className="fixed inset-x-3 z-[50] md:hidden"
      style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <LiquidGlassSurface
        variant="tab-bar"
        className="grid h-14 grid-cols-4 px-2"
      >
        {TABS.map(({ href, label, icon: Icon, matchOn }) => {
          const isActive = matches(pathname, matchOn);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              data-tab-href={href}
              data-tab-active={isActive ? "true" : undefined}
              className="relative flex flex-col items-center justify-center gap-0.5 text-white/80 hover:text-white"
            >
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute top-1 h-1 w-1 rounded-full bg-[var(--color-action-orange)]"
                />
              ) : null}
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                className={cn(
                  "transition-colors",
                  isActive ? "text-white" : "text-white/70",
                )}
              />
              <span className="text-[10px] font-medium uppercase tracking-wider">
                {label}
              </span>
            </Link>
          );
        })}
      </LiquidGlassSurface>
    </nav>
  );
}
