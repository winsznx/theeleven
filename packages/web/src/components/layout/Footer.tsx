import Image from "next/image";
import Link from "next/link";
import { Code2, MessageSquare, FileText } from "lucide-react";

import { Container } from "./Container";

/**
 * One cohesive dark footer:
 *   - Big Regista 11 wordmark at the top (next/image — AVIF/WebP variants
 *     from the 3.3 MB source, lazy-loaded as the footer scrolls in)
 *   - Three-column links / submission grid below
 *   - Hairline rule + © + URL row at the bottom
 *
 * Everything sits on the deep-plum gradient — no light-vs-dark seam
 * before the footer. The CTA section above ends on deep-plum too, so
 * the dark color continues unbroken from the trophy band into here.
 */
export function Footer() {
  return (
    <footer
      className="relative isolate overflow-hidden border-t border-white/5 text-[var(--color-ghost-white)]"
      style={{
        background:
          "linear-gradient(180deg, #05070f 0%, #0a0d1f 60%, #050710 100%)",
      }}
    >
      <Container>
        {/* Hero wordmark — proper breathing room, never crops */}
        <div className="relative mx-auto flex h-[200px] w-full max-w-[680px] items-center justify-center pt-16 md:h-[280px] md:pt-20">
          <Image
            src="/landing/regista11-logo.png"
            alt="Regista 11"
            fill
            quality={88}
            sizes="(min-width: 768px) 680px, 90vw"
            className="object-contain"
            loading="lazy"
            priority={false}
          />
        </div>

        {/* Three-column grid — inverted text colors for the dark surface */}
        <div className="grid gap-10 pt-12 pb-10 md:grid-cols-3 md:gap-12 md:pt-16 md:pb-14">
          <div className="space-y-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Protocol
            </h2>
            <p className="max-w-xs text-[14px] leading-[1.55] text-white/75">
              Live football prop markets, made by AI agents. Permissionless
              and gasless on X Layer mainnet.
            </p>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-action-orange)]/40 bg-[var(--color-action-orange)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-action-orange)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-action-orange)]" />
              Live on X Layer mainnet
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Links
            </h2>
            <ul className="space-y-2.5 text-[14px]">
              <li>
                <Link
                  className="inline-flex items-center gap-2 text-white/85 transition-colors hover:text-[var(--color-action-orange)]"
                  href="/docs"
                >
                  <FileText className="h-4 w-4" /> Docs
                </Link>
              </li>
              <li>
                <a
                  className="inline-flex items-center gap-2 text-white/85 transition-colors hover:text-[var(--color-action-orange)]"
                  href="https://github.com/winsznx/theeleven"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Code2 className="h-4 w-4" /> GitHub
                </a>
              </li>
              <li>
                <a
                  className="inline-flex items-center gap-2 text-white/85 transition-colors hover:text-[var(--color-action-orange)]"
                  href="https://x.com/regista11_"
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageSquare className="h-4 w-4" /> @regista11_
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Submission
            </h2>
            <p className="text-[14px] leading-[1.55] text-white/85">
              Built for{" "}
              <span className="text-[var(--color-action-orange)]">
                OKX X Cup
              </span>{" "}
              ×{" "}
              <span className="text-[var(--color-action-orange)]">
                Hook the Future
              </span>{" "}
              × Flap.
            </p>
            <p className="font-numerals text-[12px] text-white/55">
              @XLayerOfficial · @Uniswap · @flapdotsh · #BuildX
            </p>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-white/10">
          <div className="flex flex-col gap-2 py-6 text-[12px] text-white/55 md:flex-row md:items-center md:justify-between">
            <span>© 2026 Regista 11. MIT License.</span>
            <span>regista11.xyz</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
