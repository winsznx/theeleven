import { ExternalLink } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";
import { PlayerSprite } from "@/components/landing/pitch/PlayerSprite";
import { loadStatus, type AgentHealth, type StatusPayload } from "@/lib/status";
import { DEPLOY_RUNBOOK_URL } from "@/lib/deployment";
import { WEB_DEPLOYMENT } from "@/lib/deployment";

const DAY_0_TX =
  "0xeff5521a14f976727d77f3c9378e9b1ae5dc19d6b7b91f2088ddaa2e0ec72553";

function oklinkAddress(addr: string): string {
  return `https://www.oklink.com/x-layer/address/${addr}`;
}

function oklinkTx(hash: string): string {
  return `https://www.oklink.com/x-layer/tx/${hash}`;
}

function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatusCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] p-5">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
        {label}
      </h2>
      <dl className="grid grid-cols-1 gap-2 text-[13px] text-[var(--color-charcoal-text)]">
        {children}
      </dl>
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-[var(--color-slate-text)]">{k}</dt>
      <dd className="font-mono tabular-nums text-right break-all sm:max-w-[60%]">
        {v}
      </dd>
    </div>
  );
}

function LastTickPill({ ageSeconds }: { ageSeconds: number | null }) {
  if (ageSeconds === null) {
    return <span className="text-[var(--color-slate-text)]">—</span>;
  }
  return (
    <span
      data-last-tick
      className="inline-flex items-center gap-1.5"
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success-moss)] animate-pulse motion-reduce:animate-none"
      />
      <span>{formatUptime(ageSeconds)}</span>
    </span>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function AgentRuntimeBlock({
  agent,
  lastTickAgeSeconds,
}: {
  agent: AgentHealth;
  lastTickAgeSeconds: number | null;
}) {
  if (agent.status === "online") {
    return (
      <>
        <Row
          k="Process"
          v={
            <span className="inline-flex items-center gap-1.5 text-[var(--color-success-moss)]">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full bg-[var(--color-success-moss)]"
              />
              ONLINE
            </span>
          }
        />
        {/* "Uptime" because the underlying value is seconds-since-startedAt;
            the agent doesn't surface a per-tick heartbeat yet, so labelling
            this "Last tick" overstates what the metric proves. */}
        <Row k="Uptime" v={<LastTickPill ageSeconds={lastTickAgeSeconds} />} />
        <Row k="Started" v={relativeTime(agent.raw.startedAt)} />
        <Row k="Personas active" v={`${agent.raw.personasActive} of 11`} />
        <Row k="Current fixture" v={agent.raw.fixtureId ?? "—"} />
      </>
    );
  }
  if (agent.status === "not-configured") {
    return (
      <>
        <Row
          k="Process"
          v={
            <span className="inline-flex items-center gap-1.5 text-[var(--color-slate-text)]">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full bg-[var(--color-slate-text)]"
              />
              NOT CONFIGURED
            </span>
          }
        />
        <Row
          k="Why"
          v="PUBLIC_AGENT_URL env var unset — set it after Railway deploy"
        />
      </>
    );
  }
  return (
    <>
      <Row
        k="Process"
        v={
          <span className="inline-flex items-center gap-1.5 text-[var(--color-action-orange)]">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-[var(--color-action-orange)]"
            />
            OFFLINE
          </span>
        }
      />
      <Row k="Reason" v={agent.reason} />
    </>
  );
}

function PersonaActivityFeed({ rows }: { rows: StatusPayload["recentMarkets"] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 p-6 text-[13px] text-[var(--color-charcoal-text)]">
        No recent activity · the Eleven activate when a live match enters their
        tactical window.
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-2" data-activity-feed>
      {rows.map((r) => {
        const persona = WEB_DEPLOYMENT.personaByAgent?.get(r.agent) ?? null;
        return (
          <li
            key={r.marketAddress}
            className="flex items-center gap-3 rounded-[8px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] p-3"
          >
            {persona ? (
              <span className="w-6 shrink-0">
                <PlayerSprite persona={persona} />
              </span>
            ) : (
              <span
                aria-hidden
                className="inline-block h-6 w-6 shrink-0 rounded-full bg-[var(--color-steel-gray)]"
              />
            )}
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-medium text-[var(--color-deep-plum)]">
                {persona ? personaName(persona) : "Unknown agent"}
              </span>
              <span className="block font-mono text-[11px] text-[var(--color-slate-text)] tabular-nums truncate">
                opened market {shortAddr(r.marketAddress)} · block{" "}
                {r.blockNumber.toString()}
              </span>
            </span>
            <a
              href={oklinkAddress(r.marketAddress)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[var(--color-deep-plum)] hover:opacity-80"
              aria-label="Open market on OKLink"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function personaName(slug: string): string {
  const map: Record<string, string> = {
    "il-regista": "Il Regista",
    "il-trequartista": "Il Trequartista",
    "il-mediano": "Il Mediano",
    "il-falso-nove": "Il Falso Nove",
    "il-libero": "Il Libero",
    "l-ala": "L'Ala",
    "il-bomber": "Il Bomber",
    "il-capitano": "Il Capitano",
    "il-numero-dieci": "Il Numero Dieci",
    "il-catenaccio": "Il Catenaccio",
    "l-ultimo": "L'Ultimo",
  };
  return map[slug] ?? slug;
}

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const status = await loadStatus();

  return (
    <Container>
      <section className="flex flex-col gap-8 py-10 md:py-14">
        <header className="flex flex-col gap-3">
          <DisplayHeadline variant="display-md" as="h1">
            System status
          </DisplayHeadline>
          <p className="max-w-prose text-[16px] text-[var(--color-slate-text)]">
            Live deploy state · pulled from chain and the agent runtime every
            time you reload.{" "}
            <span className="font-mono tabular-nums text-[12px]">
              ({relativeTime(status.generatedAt)})
            </span>
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatusCard label="Contracts">
            <Row
              k="Factory"
              v={
                status.factory ? (
                  <a
                    href={oklinkAddress(status.factory)}
                    target="_blank"
                    rel="noreferrer"
                    data-factory-link
                    className="inline-flex items-center gap-1 text-[var(--color-deep-plum)] hover:underline"
                  >
                    {shortAddr(status.factory)}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  <a
                    href={DEPLOY_RUNBOOK_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--color-action-orange)] hover:underline"
                  >
                    Deployment in progress ↗
                  </a>
                )
              }
            />
            <Row k="Network" v={`X Layer · chain ${status.chainId}`} />
            <Row
              k="Deployed"
              v={
                status.deployedAtBlock
                  ? `block ${status.deployedAtBlock}${
                      status.deployedAtISO ? ` · ${status.deployedAtISO}` : ""
                    }`
                  : "—"
              }
            />
          </StatusCard>

          <StatusCard label="Agent runtime">
            <AgentRuntimeBlock
              agent={status.agent}
              lastTickAgeSeconds={status.lastTickAgeSeconds}
            />
          </StatusCard>

          <StatusCard label="On-chain activity (last 24h)">
            <Row
              k="Markets created"
              v={status.activity.marketsCreated.toString()}
            />
            <Row
              k="Stakes placed"
              v={status.activity.stakesPlaced?.toString() ?? "—"}
            />
            <Row
              k="Resolutions"
              v={status.activity.resolutions?.toString() ?? "—"}
            />
          </StatusCard>

          <StatusCard label="Submission proof">
            <Row
              k="Day 0 settlement"
              v={
                <a
                  href={oklinkTx(DAY_0_TX)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--color-deep-plum)] hover:underline"
                >
                  {shortHash(DAY_0_TX)}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              }
            />
            <Row
              k="First mainnet market"
              v={
                status.recentMarkets[0] ? (
                  <a
                    href={oklinkAddress(status.recentMarkets[0].marketAddress)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--color-deep-plum)] hover:underline"
                  >
                    {shortAddr(status.recentMarkets[0].marketAddress)}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </StatusCard>
        </div>

        <section>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
            Recent agent activity
          </h2>
          <PersonaActivityFeed rows={status.recentMarkets} />
        </section>
      </section>
    </Container>
  );
}
