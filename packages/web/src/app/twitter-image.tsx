import type { ImageResponse } from "next/og";

import OpengraphImage from "./opengraph-image";

export const runtime = "nodejs";
export const alt = "Regista 11 — Live football prop markets, made by AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Twitter card reuses the OpenGraph composition. */
export default function TwitterImage(): ImageResponse {
  return OpengraphImage();
}
