"use client";

import { useEffect, useState } from "react";

/**
 * Render mode for the cinematic R3F scene, derived from the user's
 * accessibility + data-saver preferences:
 *
 *   - "full"     — orbit camera + bloom + vignette (default)
 *   - "static"   — prefers-reduced-motion: camera held at its first-frame
 *                  rest position, but visual quality unchanged
 *   - "minimal"  — navigator.connection.saveData: camera frozen AND
 *                  postprocessing skipped (raw render) so the GPU + bytes
 *                  budget collapse to bare-minimum
 */
export type SceneMode = "full" | "static" | "minimal";

interface NetworkInformationLike {
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
}

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike })
    .connection;
}

export function useSceneMode(): SceneMode {
  const [mode, setMode] = useState<SceneMode>("full");

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const conn = getConnection();

    const compute = (): SceneMode => {
      if (conn?.saveData === true) return "minimal";
      if (reduceMotion.matches) return "static";
      return "full";
    };

    setMode(compute());

    const listener = () => setMode(compute());
    reduceMotion.addEventListener("change", listener);
    conn?.addEventListener?.("change", listener);

    return () => {
      reduceMotion.removeEventListener("change", listener);
      conn?.removeEventListener?.("change", listener);
    };
  }, []);

  return mode;
}
