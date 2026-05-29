import Link from "next/link";

import { PersonaCard } from "@/components/landing/PersonaCard";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";
import { getPersona } from "@/lib/personas";

/**
 * The eleven personas arranged in a 4-3-3, read top-to-bottom like a
 * tactical board:
 *
 *   ATTACK   3 forwards         (3 cards, centered)
 *   MID      3 midfielders      (3 cards, centered)
 *   DEF      4 defenders        (4 cards, widest row)
 *   GK       1 keeper           (1 card, centered)
 *
 * Cards are the same `<PersonaCard>` used in the legacy grid layout —
 * only the layout changes. The Link wrappers keep each card navigable
 * to /agents/[slug].
 *
 * Sizing strategy:
 *   - Each card has a FIXED width on md+ so a 3-card row and a 4-card
 *     row use the same card size — the defense row simply takes more
 *     horizontal space. The container's max-width fits 4 cards on a
 *     desktop viewport; the 3-card rows look proportionally narrower,
 *     which matches how real tactical boards render formation lines.
 *   - On <md viewports there isn't room for 4 cards side-by-side, so
 *     rows wrap to whatever fits and the 4-card row degrades gracefully
 *     to two rows of two.
 */

const FORMATION_4_3_3_BY_LINE: readonly (readonly PersonaSlug[])[] = [
  // Attack (3) — left forward, false 9, right forward
  ["il-numero-dieci", "il-falso-nove", "il-bomber"],
  // Midfield (3) — left mid, regista, right mid
  ["il-mediano", "il-regista", "il-trequartista"],
  // Defense (4) — left back, two centre backs, right back
  ["il-capitano", "il-libero", "il-catenaccio", "l-ala"],
  // Goalkeeper (1)
  ["l-ultimo"],
];

const LINE_LABELS = ["ATT", "MID", "DEF", "GK"] as const;

interface FormationGridProps {
  /** If true (default), each card wraps in a <Link href="/agents/[slug]">.
   *  Set false on landing where the section is read-only. */
  linkToAgent?: boolean;
}

function CardWrap({
  slug,
  linkToAgent,
}: {
  slug: PersonaSlug;
  linkToAgent: boolean;
}) {
  const p = getPersona(slug);
  if (!p) return null;
  const inner = <PersonaCard {...p} />;
  // Fixed-width container on md+ so every card matches across rows. On
  // mobile the card grows to whatever the row gives it.
  const cell = (
    <div className="w-full md:w-[280px] md:flex-none">{inner}</div>
  );
  if (!linkToAgent) return cell;
  return (
    <Link
      href={`/agents/${slug}`}
      className="block focus:outline-none w-full md:w-[280px] md:flex-none"
      data-persona-link={slug}
      aria-label={`Open ${p.name}`}
    >
      {inner}
    </Link>
  );
}

export function FormationGrid({ linkToAgent = true }: FormationGridProps) {
  return (
    <div
      data-formation-grid
      className="mx-auto flex w-full flex-col items-stretch gap-5 md:gap-8"
    >
      {FORMATION_4_3_3_BY_LINE.map((line, i) => (
        <div
          key={i}
          data-formation-line={LINE_LABELS[i]}
          // Flex with wrap + center: 3-card rows naturally render
          // narrower than the 4-card defense row, but every card stays
          // the same size. Below md, cards wrap and each takes the full
          // row width, preserving the reading order ATT → MID → DEF → GK.
          className="flex flex-wrap items-stretch justify-center gap-4 md:gap-5"
        >
          {line.map((slug) => (
            <CardWrap key={slug} slug={slug} linkToAgent={linkToAgent} />
          ))}
        </div>
      ))}
    </div>
  );
}
