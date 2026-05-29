import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { getDocsNeighbours } from "@/lib/docsNav";

interface DocsPagerProps {
  pathname: string;
}

/** Prev/next page footer cards — server-rendered from the flat docs nav. */
export function DocsPager({ pathname }: DocsPagerProps) {
  const { prev, next } = getDocsNeighbours(pathname);
  if (!prev && !next) return null;

  return (
    <div className="mt-16 grid gap-3 border-t border-[var(--color-steel-gray)] pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col gap-1 rounded-[10px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] p-4 transition-colors hover:border-[var(--color-action-orange)]"
        >
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
            <ArrowLeft className="h-3 w-3" /> Previous
          </span>
          <span className="text-[14px] font-semibold text-[var(--color-deep-plum)] group-hover:text-[var(--color-action-orange)]">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-col items-end gap-1 rounded-[10px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] p-4 transition-colors hover:border-[var(--color-action-orange)]"
        >
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
            Next <ArrowRight className="h-3 w-3" />
          </span>
          <span className="text-[14px] font-semibold text-[var(--color-deep-plum)] group-hover:text-[var(--color-action-orange)]">
            {next.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
