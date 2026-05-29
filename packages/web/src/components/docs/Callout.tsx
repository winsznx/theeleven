import { AlertTriangle, Info, Lightbulb, StickyNote } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "info" | "tip" | "warning" | "note";

interface CalloutProps {
  variant?: Variant;
  title?: string;
  children: ReactNode;
}

const STYLE: Record<
  Variant,
  { border: string; bg: string; icon: string; iconColor: string }
> = {
  info: {
    border: "border-l-[var(--color-deep-plum)]",
    bg: "bg-[var(--color-deep-plum)]/[0.04]",
    icon: "Info",
    iconColor: "text-[var(--color-deep-plum)]",
  },
  tip: {
    border: "border-l-[var(--color-success-moss)]",
    bg: "bg-[var(--color-success-moss)]/[0.06]",
    icon: "Lightbulb",
    iconColor: "text-[var(--color-success-moss)]",
  },
  warning: {
    border: "border-l-[var(--color-action-orange)]",
    bg: "bg-[var(--color-action-orange)]/[0.06]",
    icon: "AlertTriangle",
    iconColor: "text-[var(--color-action-orange)]",
  },
  note: {
    border: "border-l-[var(--color-slate-text)]",
    bg: "bg-[var(--color-fog-gray)]",
    icon: "StickyNote",
    iconColor: "text-[var(--color-slate-text)]",
  },
};

export function Callout({ variant = "info", title, children }: CalloutProps) {
  const s = STYLE[variant];
  const Icon =
    s.icon === "Info"
      ? Info
      : s.icon === "Lightbulb"
        ? Lightbulb
        : s.icon === "AlertTriangle"
          ? AlertTriangle
          : StickyNote;
  return (
    <aside
      role="note"
      className={`my-6 flex gap-3 rounded-[10px] border-l-4 ${s.border} ${s.bg} p-4`}
    >
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${s.iconColor}`} aria-hidden />
      <div className="flex-1 text-[14px] leading-[1.6] text-[var(--color-charcoal-text)]">
        {title && (
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-charcoal-text)]">
            {title}
          </div>
        )}
        <div className="[&>p:not(:last-child)]:mb-2">{children}</div>
      </div>
    </aside>
  );
}
