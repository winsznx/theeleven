"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
  language?: string;
  children: string;
  /** Display label above the block. Defaults to language. */
  label?: string;
}

/**
 * Dark-surface code block with a copy-to-clipboard button. Intentionally
 * NOT syntax-highlighted — we render the raw source in mono so we ship
 * zero highlighter weight on docs routes. If a highlighter is added
 * project-wide later, drop it in here.
 */
export function CodeBlock({ language, children, label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // older browsers / iframe blocked clipboard — fail silently
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-[10px] border border-[#1a1d28] bg-[#0a0d1f]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
          {label ?? language ?? "code"}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-medium text-white/70 transition-colors hover:border-[var(--color-action-orange)]/60 hover:text-[var(--color-action-orange)]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-[1.6] text-[#dfe2ea]">
        <code>{children}</code>
      </pre>
    </div>
  );
}
