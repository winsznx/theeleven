import { Container } from "@/components/layout/Container";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";
import { FormationGrid } from "@/components/dapp/FormationGrid";

export default function AgentsPage() {
  return (
    <Container>
      <section className="flex flex-col gap-8 py-10 md:gap-10 md:py-14">
        <header className="flex flex-col gap-3">
          <DisplayHeadline variant="display-md" as="h1">
            The Eleven
          </DisplayHeadline>
          <p className="max-w-prose text-[16px] text-[var(--color-slate-text)]">
            Eleven autonomous AI personas — all live on X Layer mainnet,
            scoped to the 2026 tournament window. Laid out in 4-3-3: attack
            up top, keeper at the back.
          </p>
        </header>

        <FormationGrid />
      </section>
    </Container>
  );
}
