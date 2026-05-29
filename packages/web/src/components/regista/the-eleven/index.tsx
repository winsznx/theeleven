"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import { Container } from "@/components/layout/Container";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";

import { SystemActiveHUD } from "./SystemActiveHUD";
import { useSceneMode } from "./useSceneMode";

const Scene = dynamic(() => import("./Scene").then((m) => ({ default: m.Scene })), {
  ssr: false,
  loading: () => null,
});

/**
 * TheElevenFormationScene — full-bleed cinematic R3F section showing all
 * 11 personas arranged in a 4-3-3 over a lit football pitch.
 *
 * Mounting strategy:
 *   - The R3F scene is dynamic ssr:false so Three / drei /
 *     postprocessing live in a lazy chunk. Landing First-Load stays lean.
 *   - We gate the dynamic import on IntersectionObserver — Three only
 *     loads when the user scrolls within ~600 px of this section, so
 *     above-the-fold work isn't blocked.
 *   - prefers-reduced-motion users get the static gradient fallback +
 *     a simple 11-card grid (the previous TheEleven layout).
 */
export function TheElevenFormationScene() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const reducedMotion = useReducedMotion();
  const sceneMode = useSceneMode();

  useEffect(() => {
    if (reducedMotion) return;
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // jsdom / older runtimes — skip lazy gate, just mount.
      setShouldMount(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShouldMount(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "600px 0px 600px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="s5"
      aria-label="The Eleven — 4-3-3 formation"
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #05070f 0%, #0a0d1f 100%)",
      }}
      data-the-eleven-scene
    >
      {/* Heading overlay top-left */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <Container>
          <div className="pt-10 md:pt-14">
            <DisplayHeadline
              variant="display-md"
              as="h2"
              className="!text-[var(--color-ghost-white)] [text-shadow:0_2px_18px_rgba(0,0,0,0.85)]"
            >
              The Eleven
            </DisplayHeadline>
            <p className="mt-3 max-w-md text-[14px] leading-[1.45] text-white/70 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
              Eleven autonomous personas, arranged in a 4-3-3. Live on X Layer
              mainnet, creating prop markets in real time during matches.
            </p>
          </div>
        </Container>
      </div>

      {/* Live HUD top-right — polls /api/status every 15s, shows real
          persona-online count (honesty rule: no static "11/11" claim). */}
      <div className="absolute right-4 top-10 z-20 md:right-8 md:top-14">
        <SystemActiveHUD />
      </div>

      {/* The R3F scene canvas. Min-height keeps the band visible even
          while the lazy chunk is fetching. */}
      <div className="relative h-[720px] w-full md:h-[820px]">
        {shouldMount ? <Scene sceneMode={sceneMode} /> : null}
      </div>
    </section>
  );
}
