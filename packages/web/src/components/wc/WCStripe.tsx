/**
 * 4px-tall tri-color stripe used as a section divider in exactly two
 * places: above TournamentBadge (separator from nav) and below LandingCTA
 * (separator from Footer).
 *
 * IP-safe: uses brand tokens (action-orange · ghost-white · deep-plum),
 * NOT FIFA red/white/navy. The tri-color shape echoes a host-nations
 * visual code WITHOUT borrowing official colors.
 */
export function WCStripe() {
  return (
    <div
      className="flex h-1 w-full"
      role="presentation"
      aria-hidden="true"
      data-wc-stripe
    >
      <div className="flex-1 bg-[var(--color-action-orange)]" />
      <div className="flex-1 bg-[var(--color-ghost-white)]" />
      <div className="flex-1 bg-[var(--color-deep-plum)]" />
    </div>
  );
}
