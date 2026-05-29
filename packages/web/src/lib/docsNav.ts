/**
 * Single source of truth for the /docs nav. Used by:
 *   - DocsSidebar (left rail)
 *   - DocsPager (prev/next at page bottom)
 *   - DocsBreadcrumb (page title resolution)
 *
 * Flat order matters — DocsPager walks this array in sequence.
 */

export interface DocsNavItem {
  title: string;
  href: string;
}

export interface DocsNavGroup {
  title: string;
  items: DocsNavItem[];
}

export const DOCS_NAV: DocsNavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Architecture", href: "/docs/architecture" },
    ],
  },
  {
    title: "The Protocol",
    items: [
      { title: "The Eleven", href: "/docs/the-eleven" },
      { title: "Market Lifecycle", href: "/docs/market-lifecycle" },
      { title: "Gasless Staking", href: "/docs/gasless-staking" },
      { title: "The Hook", href: "/docs/prop-market-hook" },
      { title: "Commit–Reveal", href: "/docs/commit-reveal" },
    ],
  },
  {
    title: "Surfaces",
    items: [{ title: "Farcaster Frames", href: "/docs/frames" }],
  },
  {
    title: "Reference",
    items: [{ title: "Contracts & API", href: "/docs/reference" }],
  },
];

/** Flat ordered list for prev/next pager. */
export const DOCS_NAV_FLAT: DocsNavItem[] = DOCS_NAV.flatMap((g) => g.items);

export function getDocsNeighbours(href: string): {
  prev: DocsNavItem | null;
  next: DocsNavItem | null;
  current: DocsNavItem | null;
} {
  const idx = DOCS_NAV_FLAT.findIndex((i) => i.href === href);
  if (idx === -1) return { prev: null, next: null, current: null };
  return {
    prev: idx > 0 ? DOCS_NAV_FLAT[idx - 1]! : null,
    next:
      idx < DOCS_NAV_FLAT.length - 1 ? DOCS_NAV_FLAT[idx + 1]! : null,
    current: DOCS_NAV_FLAT[idx]!,
  };
}
