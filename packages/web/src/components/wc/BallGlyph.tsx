interface BallGlyphProps {
  size?: number;
  className?: string;
}

/**
 * Generic football glyph — line art, single-color (inherits currentColor),
 * no brand marks. Suggests panel geometry without being any specific ball.
 *
 * Used in TournamentBadge, HowItWorks accents, footer mark.
 */
export function BallGlyph({ size = 16, className }: BallGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      data-ball-glyph
    >
      <circle cx="12" cy="12" r="10" />
      {/* Hexagonal panel hints — 4 diamond shards at cardinal directions */}
      <path d="M 12 2 L 8 6 L 12 9 L 16 6 Z" />
      <path d="M 12 22 L 8 18 L 12 15 L 16 18 Z" />
      <path d="M 2 12 L 6 8 L 9 12 L 6 16 Z" />
      <path d="M 22 12 L 18 8 L 15 12 L 18 16 Z" />
    </svg>
  );
}
