"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

interface FocusState {
  focused: PersonaSlug | null;
  setFocused: (slug: PersonaSlug | null) => void;
}

const FocusContext = createContext<FocusState>({
  focused: null,
  setFocused: () => {},
});

/** Provides the currently-hovered persona slug to the CameraDirector so it
 *  can zoom in on that player. Lives inside the R3F Canvas tree. */
export function FocusProvider({ children }: PropsWithChildren) {
  const [focused, setFocused] = useState<PersonaSlug | null>(null);
  const value = useMemo(() => ({ focused, setFocused }), [focused]);
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus(): FocusState {
  return useContext(FocusContext);
}
