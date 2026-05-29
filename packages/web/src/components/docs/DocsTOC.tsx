"use client";

import { useEffect, useState } from "react";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Right-rail "On this page" — built from the rendered <article>'s
 * h2/h3 elements at mount, then kept in sync with the viewport via
 * IntersectionObserver. Hidden under 1024 px to save horizontal space.
 *
 * No dependency on the page tree — each docs page just renders normal
 * headings, and the TOC discovers them at runtime.
 */
export function DocsTOC() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>("article[data-docs-article]");
    if (!article) return;

    const found: Heading[] = [];
    article.querySelectorAll<HTMLHeadingElement>("h2, h3").forEach((h) => {
      // ensure an id so we can anchor to it
      if (!h.id && h.textContent) {
        h.id = h.textContent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
      found.push({
        id: h.id,
        text: h.textContent ?? "",
        level: (h.tagName === "H2" ? 2 : 3) as 2 | 3,
      });
    });
    setHeadings(found);
    if (found.length > 0 && found[0]) setActiveId(found[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        // The first heading that's currently in the top quarter of the
        // viewport wins. Falls back to the topmost intersecting heading.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "0px 0px -75% 0px", threshold: 0.01 },
    );
    found.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-[220px] shrink-0 overflow-y-auto py-4 lg:block">
      <div className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
        On this page
      </div>
      <ul className="flex flex-col gap-1">
        {headings.map((h) => {
          const active = activeId === h.id;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={[
                  "block border-l-2 py-1 text-[12px] transition-colors",
                  h.level === 3 ? "pl-6" : "pl-3",
                  active
                    ? "border-[var(--color-action-orange)] font-semibold text-[var(--color-deep-plum)]"
                    : "border-transparent text-[var(--color-slate-text)] hover:border-[var(--color-steel-gray)] hover:text-[var(--color-deep-plum)]",
                ].join(" ")}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
