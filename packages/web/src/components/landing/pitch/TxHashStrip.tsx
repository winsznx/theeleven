import { KITS } from "./kits";
import { PERSONA_SHORT_NAME, type PersonaSlug } from "./PositionGrid";

export type TxAction = "create" | "reveal" | "resolve" | "stake" | "refund";

export interface TxEvent {
  hash: `0x${string}`;
  persona: PersonaSlug;
  action: TxAction;
  /** Unix seconds. */
  timestamp: number;
}

interface TxHashStripProps {
  events?: TxEvent[];
}

function shortHash(hash: `0x${string}`): string {
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function timeAgo(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor(now - timestamp));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Horizontal scrolling strip of recent on-chain events. Static placeholder in
 * P14 (no fake data). Wires to subgraph in P17.
 */
export function TxHashStrip({ events = [] }: TxHashStripProps) {
  if (events.length === 0) {
    return (
      <div
        role="status"
        aria-label="On-chain activity"
        className="flex h-9 items-center justify-center border-t border-[var(--color-pitch-gold)]/30 bg-[var(--color-pitch-overlay)] px-3 text-[11px] uppercase tracking-[0.06em] text-[var(--color-pitch-line)]/50 font-mono"
      >
        Awaiting live activity
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const loop = [...events, ...events];

  return (
    <div className="overflow-hidden border-t border-[var(--color-pitch-gold)]/30 bg-[var(--color-pitch-overlay)]">
      <div className="regista-marquee flex w-max items-center gap-4 py-2">
        {loop.map((event, i) => (
          <a
            key={`${event.hash}-${i}`}
            href={`https://www.oklink.com/x-layer/tx/${event.hash}`}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--color-pitch-line)] transition-opacity hover:opacity-80"
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: KITS[event.persona].jersey }}
            />
            <span>{PERSONA_SHORT_NAME[event.persona]}</span>
            <span className="text-[var(--color-pitch-gold)]">{event.action}</span>
            <span className="text-[var(--color-pitch-line)]/70">
              {shortHash(event.hash)}
            </span>
            <span className="text-[var(--color-pitch-line)]/50 tabular-nums">
              {timeAgo(event.timestamp, now)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
