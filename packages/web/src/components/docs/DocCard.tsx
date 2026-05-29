import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface DocCardProps {
  title: string;
  blurb: string;
  href: string;
}

/** Clickable overview card — used on the Introduction page grid. */
export function DocCard({ title, blurb, href }: DocCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-[10px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--color-action-orange)] hover:shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between">
        <span className="text-[15px] font-semibold text-[var(--color-deep-plum)] group-hover:text-[var(--color-action-orange)]">
          {title}
        </span>
        <ArrowRight className="h-4 w-4 text-[var(--color-slate-text)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-action-orange)]" />
      </div>
      <p className="text-[13px] leading-[1.55] text-[var(--color-slate-text)]">
        {blurb}
      </p>
    </Link>
  );
}
