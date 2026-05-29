import type { ReactNode } from "react";

/**
 * Container that applies the docs typography scale. Each page's main
 * <article> wraps content in <Prose>; that keeps the styling uniform
 * across pages without depending on `@tailwindcss/typography`.
 */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        "max-w-none text-[15px] leading-[1.7] text-[var(--color-charcoal-text)]",
        // Headings
        "[&_h1]:font-display [&_h1]:text-[36px] [&_h1]:font-semibold [&_h1]:tracking-[-0.01em] [&_h1]:text-[var(--color-deep-plum)] [&_h1]:leading-[1.15] [&_h1]:mb-3",
        "[&_h2]:scroll-mt-24 [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:tracking-[-0.005em] [&_h2]:text-[var(--color-deep-plum)] [&_h2]:border-b [&_h2]:border-[var(--color-steel-gray)] [&_h2]:pb-2",
        "[&_h3]:scroll-mt-24 [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-[var(--color-deep-plum)]",
        // Body
        "[&_p]:my-4 [&_p]:text-[15px]",
        "[&_a]:font-medium [&_a]:text-[var(--color-action-orange)] [&_a]:underline-offset-2 hover:[&_a]:underline",
        "[&_strong]:font-semibold [&_strong]:text-[var(--color-deep-plum)]",
        "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6",
        "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_li]:my-1.5",
        "[&_code]:rounded [&_code]:bg-[var(--color-fog-gray)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-[var(--color-deep-plum)]",
        // The CodeBlock component renders its own pre; don't double-style.
        "[&_pre]:m-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
        "[&_table]:my-6 [&_table]:w-full [&_table]:text-[13px]",
        "[&_th]:border-b [&_th]:border-[var(--color-steel-gray)] [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:font-semibold [&_th]:text-[var(--color-slate-text)]",
        "[&_td]:border-b [&_td]:border-[var(--color-steel-gray)]/60 [&_td]:py-2 [&_td]:pr-4",
        "[&_hr]:my-10 [&_hr]:border-[var(--color-steel-gray)]",
        "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-steel-gray)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--color-slate-text)]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
