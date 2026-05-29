/**
 * Knockout-tree bracket lines used as a section backdrop. Very low
 * opacity, absolute-positioned, pointer-events: none — never interactive.
 *
 * Drawn as 8 first-round → 4 QF → 2 SF → 1 final lines, mirrored. Single
 * abstract shape, no team names, no logos, no FIFA marks.
 */
export function BracketBackdrop({ className }: { className?: string }) {
  const stroke = "currentColor";
  const sw = 1;

  return (
    <svg
      viewBox="0 0 800 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      data-bracket-backdrop
      className={className}
      style={{ opacity: 0.04 }}
    >
      {/* LEFT side — 4 brackets at increasing depth → centerline at x=400 */}
      <g stroke={stroke} fill="none" strokeWidth={sw}>
        {/* Round of 16 (8 lines) */}
        <line x1="0" y1="30" x2="60" y2="30" />
        <line x1="0" y1="70" x2="60" y2="70" />
        <line x1="0" y1="110" x2="60" y2="110" />
        <line x1="0" y1="150" x2="60" y2="150" />
        <line x1="0" y1="190" x2="60" y2="190" />
        <line x1="0" y1="230" x2="60" y2="230" />
        <line x1="0" y1="270" x2="60" y2="270" />
        <line x1="0" y1="290" x2="60" y2="290" />
        {/* Connectors → QF (4 pairs merge to 4 lines at x=60..130) */}
        <line x1="60" y1="30" x2="60" y2="70" />
        <line x1="60" y1="110" x2="60" y2="150" />
        <line x1="60" y1="190" x2="60" y2="230" />
        <line x1="60" y1="270" x2="60" y2="290" />
        <line x1="60" y1="50" x2="130" y2="50" />
        <line x1="60" y1="130" x2="130" y2="130" />
        <line x1="60" y1="210" x2="130" y2="210" />
        <line x1="60" y1="280" x2="130" y2="280" />
        {/* QF → SF (4 → 2) */}
        <line x1="130" y1="50" x2="130" y2="130" />
        <line x1="130" y1="210" x2="130" y2="280" />
        <line x1="130" y1="90" x2="230" y2="90" />
        <line x1="130" y1="245" x2="230" y2="245" />
        {/* SF → Final (2 → 1) */}
        <line x1="230" y1="90" x2="230" y2="245" />
        <line x1="230" y1="167" x2="380" y2="167" />
      </g>

      {/* RIGHT side — mirror of the left at x=800-x */}
      <g stroke={stroke} fill="none" strokeWidth={sw}>
        <line x1="800" y1="30" x2="740" y2="30" />
        <line x1="800" y1="70" x2="740" y2="70" />
        <line x1="800" y1="110" x2="740" y2="110" />
        <line x1="800" y1="150" x2="740" y2="150" />
        <line x1="800" y1="190" x2="740" y2="190" />
        <line x1="800" y1="230" x2="740" y2="230" />
        <line x1="800" y1="270" x2="740" y2="270" />
        <line x1="800" y1="290" x2="740" y2="290" />
        <line x1="740" y1="30" x2="740" y2="70" />
        <line x1="740" y1="110" x2="740" y2="150" />
        <line x1="740" y1="190" x2="740" y2="230" />
        <line x1="740" y1="270" x2="740" y2="290" />
        <line x1="740" y1="50" x2="670" y2="50" />
        <line x1="740" y1="130" x2="670" y2="130" />
        <line x1="740" y1="210" x2="670" y2="210" />
        <line x1="740" y1="280" x2="670" y2="280" />
        <line x1="670" y1="50" x2="670" y2="130" />
        <line x1="670" y1="210" x2="670" y2="280" />
        <line x1="670" y1="90" x2="570" y2="90" />
        <line x1="670" y1="245" x2="570" y2="245" />
        <line x1="570" y1="90" x2="570" y2="245" />
        <line x1="570" y1="167" x2="420" y2="167" />
      </g>

      {/* Final centerpiece */}
      <g stroke={stroke} fill="none" strokeWidth={sw}>
        <rect x="380" y="160" width="40" height="14" rx="2" />
      </g>
    </svg>
  );
}
