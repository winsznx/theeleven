import type { SVGProps } from "react";

/**
 * Placeholder brand mark — a single playmaker dot with directional vectors.
 * Final mark designed in P14. This stub locks the slot + sizing convention.
 */
export function RegistaMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="10" cy="10" r="2.5" fill="currentColor" />
      <path
        d="M10 7V3.5M10 13v3.5M7 10H3.5M13 10h3.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
