"use client";

import dynamic from "next/dynamic";

const Ballpit = dynamic(() => import("./Ballpit"), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background: "linear-gradient(180deg, #0a0d1f 0%, #111a4a 100%)",
      }}
    />
  ),
});

const PLUM_GRADIENT = "linear-gradient(180deg, #0a0d1f 0%, #111a4a 100%)";

/**
 * Hero backdrop: dark plum gradient with the React Bits Ballpit rendered
 * over it. Ballpit lazy-loads (Three.js ships in a separate chunk) and is
 * resilient to mount cycles via fresh-canvas-per-mount in Ballpit.tsx.
 *
 * Brand colors used: action-orange (0xec652b), ghost-white (0xfafaf7),
 * deep-plum (0x111a4a). All three are the WCStripe spine.
 */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden
      data-hero-backdrop="ballpit"
      className="absolute inset-0"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: PLUM_GRADIENT,
      }}
    >
      <Ballpit
        count={50}
        gravity={0.7}
        friction={0.85}
        wallBounce={0.95}
        followCursor={false}
        useFootballTexture
        minSize={0.6}
        maxSize={1.0}
        size0={1.0}
        lightIntensity={0}
        ambientIntensity={1.4}
        colors={[0xfafaf7, 0xfafaf7]}
      />
    </div>
  );
}
