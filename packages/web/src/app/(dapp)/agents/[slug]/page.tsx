"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { PersonaDetailView } from "@/components/dapp/PersonaDetailView";
import { isPersonaSlug } from "@/lib/personas";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

interface AgentDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { slug } = use(params);
  const valid = isPersonaSlug(slug);

  return (
    <Container>
      <section className="flex flex-col gap-6 py-10 md:py-14">
        <Link
          href="/agents"
          className="inline-flex items-center gap-1 self-start text-[13px] text-[var(--color-slate-text)] hover:text-[var(--color-deep-plum)]"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden /> The Eleven
        </Link>

        {valid ? (
          <PersonaDetailView slug={slug as PersonaSlug} />
        ) : (
          <div
            data-not-found
            className="rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-10"
          >
            <p className="text-[14px] text-[var(--color-charcoal-text)]">
              Persona not found: <span className="font-mono">{slug}</span>
            </p>
            <Link
              href="/agents"
              className="mt-2 inline-block text-[13px] font-medium text-[var(--color-deep-plum)] hover:underline"
            >
              Back to The Eleven →
            </Link>
          </div>
        )}
      </section>
    </Container>
  );
}
