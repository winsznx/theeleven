import type { SVGAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Top-down tactical pitch SVG. Goals at top and bottom; sidelines at left and
 * right. 16:10 viewBox locked so the pitch stays landscape on mobile (per
 * PRD §8.7 no-portrait-rotation rule).
 *
 * Dark palette is scoped to the pitch only via the `--color-pitch-*` tokens.
 * All markings are 1px white with non-scaling-stroke so they stay crisp at
 * any container size.
 */

type PitchBoardProps = Omit<SVGAttributes<SVGSVGElement>, "viewBox"> & {
  className?: string;
};

const W = 800;
const H = 500;
const PAD = 16;
const INNER = { x: PAD, y: PAD, w: W - 2 * PAD, h: H - 2 * PAD };
const CX = W / 2;
const CY = H / 2;

const PEN_AREA = { w: 240, h: 80 };
const SIX_YARD = { w: 120, h: 40 };
const PEN_SPOT_INSET = 60;
const PEN_ARC_R = 25;
const CORNER_R = 8;
const CENTER_R = 40;

export function PitchBoard({ className, ...rest }: PitchBoardProps) {
  const penTop = { x: CX - PEN_AREA.w / 2, y: PAD, w: PEN_AREA.w, h: PEN_AREA.h };
  const penBot = { x: CX - PEN_AREA.w / 2, y: H - PAD - PEN_AREA.h, w: PEN_AREA.w, h: PEN_AREA.h };
  const sixTop = { x: CX - SIX_YARD.w / 2, y: PAD, w: SIX_YARD.w, h: SIX_YARD.h };
  const sixBot = { x: CX - SIX_YARD.w / 2, y: H - PAD - SIX_YARD.h, w: SIX_YARD.w, h: SIX_YARD.h };
  const penSpotTopY = PAD + PEN_SPOT_INSET;
  const penSpotBotY = H - PAD - PEN_SPOT_INSET;
  const penArcDx = Math.sqrt(PEN_ARC_R ** 2 - (penTop.y + penTop.h - penSpotTopY) ** 2);

  const stroke = {
    stroke: "var(--color-pitch-line)",
    strokeWidth: 1,
    fill: "none",
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg
      role="img"
      aria-label="Tactical pitch with 11 AI-agent personas in 4-3-1-2 formation"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-full w-full", className)}
      {...rest}
    >
      <rect x={0} y={0} width={W} height={H} fill="var(--color-pitch-bg)" />
      <rect
        x={INNER.x}
        y={INNER.y}
        width={INNER.w}
        height={INNER.h}
        fill="var(--color-pitch-fill)"
      />

      <rect x={INNER.x} y={INNER.y} width={INNER.w} height={INNER.h} {...stroke} />

      <line x1={INNER.x} y1={CY} x2={INNER.x + INNER.w} y2={CY} {...stroke} />

      <circle cx={CX} cy={CY} r={CENTER_R} {...stroke} />
      <circle cx={CX} cy={CY} r={2} fill="var(--color-pitch-line)" />

      <rect x={penTop.x} y={penTop.y} width={penTop.w} height={penTop.h} {...stroke} />
      <rect x={penBot.x} y={penBot.y} width={penBot.w} height={penBot.h} {...stroke} />

      <rect x={sixTop.x} y={sixTop.y} width={sixTop.w} height={sixTop.h} {...stroke} />
      <rect x={sixBot.x} y={sixBot.y} width={sixBot.w} height={sixBot.h} {...stroke} />

      <circle cx={CX} cy={penSpotTopY} r={2} fill="var(--color-pitch-line)" />
      <circle cx={CX} cy={penSpotBotY} r={2} fill="var(--color-pitch-line)" />

      <path
        d={`M ${CX - penArcDx} ${penTop.y + penTop.h} A ${PEN_ARC_R} ${PEN_ARC_R} 0 0 0 ${
          CX + penArcDx
        } ${penTop.y + penTop.h}`}
        {...stroke}
      />
      <path
        d={`M ${CX - penArcDx} ${penBot.y} A ${PEN_ARC_R} ${PEN_ARC_R} 0 0 1 ${
          CX + penArcDx
        } ${penBot.y}`}
        {...stroke}
      />

      <path
        d={`M ${INNER.x + CORNER_R} ${INNER.y} A ${CORNER_R} ${CORNER_R} 0 0 1 ${INNER.x} ${
          INNER.y + CORNER_R
        }`}
        {...stroke}
      />
      <path
        d={`M ${INNER.x + INNER.w - CORNER_R} ${INNER.y} A ${CORNER_R} ${CORNER_R} 0 0 0 ${
          INNER.x + INNER.w
        } ${INNER.y + CORNER_R}`}
        {...stroke}
      />
      <path
        d={`M ${INNER.x} ${INNER.y + INNER.h - CORNER_R} A ${CORNER_R} ${CORNER_R} 0 0 1 ${
          INNER.x + CORNER_R
        } ${INNER.y + INNER.h}`}
        {...stroke}
      />
      <path
        d={`M ${INNER.x + INNER.w - CORNER_R} ${INNER.y + INNER.h} A ${CORNER_R} ${CORNER_R} 0 0 0 ${
          INNER.x + INNER.w
        } ${INNER.y + INNER.h - CORNER_R}`}
        {...stroke}
      />
    </svg>
  );
}
