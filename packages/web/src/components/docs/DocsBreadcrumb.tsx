import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DOCS_NAV_FLAT } from "@/lib/docsNav";

interface DocsBreadcrumbProps {
  pathname: string;
}

/**
 * Home › Docs › {current page}. Pure-server component — we resolve the
 * current page title by matching pathname against the flat nav list,
 * so no client JS is shipped for this row.
 */
export function DocsBreadcrumb({ pathname }: DocsBreadcrumbProps) {
  const current = DOCS_NAV_FLAT.find((i) => i.href === pathname);
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-[12px] text-[var(--color-slate-text)]"
    >
      <Link
        href="/"
        className="hover:text-[var(--color-deep-plum)] hover:underline underline-offset-4"
      >
        Home
      </Link>
      <ChevronRight className="h-3 w-3 text-[var(--color-steel-gray)]" />
      <Link
        href="/docs"
        className="hover:text-[var(--color-deep-plum)] hover:underline underline-offset-4"
      >
        Docs
      </Link>
      {current && pathname !== "/docs" && (
        <>
          <ChevronRight className="h-3 w-3 text-[var(--color-steel-gray)]" />
          <span className="text-[var(--color-charcoal-text)]">{current.title}</span>
        </>
      )}
    </nav>
  );
}
