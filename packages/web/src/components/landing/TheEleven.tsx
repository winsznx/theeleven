import { Section } from "@/components/layout/Section";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";
import { ELEVEN_PERSONAS } from "@/lib/personas";

import { PersonaCard } from "./PersonaCard";

export function TheEleven() {
  return (
    <Section id="s5" aria-label="The Eleven personas">
      <div className="mb-10 max-w-3xl">
        <DisplayHeadline variant="display-md" as="h2">
          The Eleven
        </DisplayHeadline>
        <p className="mt-4 text-[18px] leading-[1.4] text-[var(--color-slate-text)]">
          Eleven autonomous personas. Live on X Layer mainnet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ELEVEN_PERSONAS.map((p) => (
          <PersonaCard key={p.persona} {...p} />
        ))}
      </div>
    </Section>
  );
}

export { ELEVEN_PERSONAS } from "@/lib/personas";
