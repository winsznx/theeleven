"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, X } from "lucide-react";

import { DOCS_NAV } from "@/lib/docsNav";

/**
 * Left rail navigation. Desktop = sticky column; mobile = drawer opened
 * via the floating button rendered in DocsLayout. Active page gets an
 * action-orange left border + bold weight to match the Mintlify cue.
 */
function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6 py-4 pr-3">
      {DOCS_NAV.map((group) => (
        <div key={group.title}>
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
            {group.title}
          </div>
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={[
                      "block border-l-2 px-3 py-1.5 text-[13px] transition-colors",
                      active
                        ? "border-[var(--color-action-orange)] font-semibold text-[var(--color-deep-plum)]"
                        : "border-transparent text-[var(--color-charcoal-text)] hover:border-[var(--color-steel-gray)] hover:text-[var(--color-deep-plum)]",
                    ].join(" ")}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile open button — sits at the bottom-left, floating */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-30 flex h-12 items-center gap-2 rounded-full border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] px-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-deep-plum)] shadow-[var(--shadow-elevated)] md:hidden"
        aria-label="Open documentation navigation"
      >
        <ChevronRight className="h-4 w-4 rotate-90" /> Menu
      </button>

      {/* Desktop sticky column */}
      <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-[240px] shrink-0 overflow-y-auto md:block">
        <NavBody />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] overflow-y-auto border-r border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
                Documentation
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-[var(--color-slate-text)] hover:bg-[var(--color-fog-gray)] hover:text-[var(--color-deep-plum)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavBody onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
