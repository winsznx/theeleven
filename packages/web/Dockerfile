# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────
# @regista11/web — Next.js 15 standalone production container.
#
# Multi-stage: pnpm-filtered install + build → minimal runner stage
# that copies only .next/standalone + .next/static + public.
# Health probe at GET /api/health.
# ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/web/package.json packages/web/
COPY packages/contracts/package.json packages/contracts/

RUN pnpm install --frozen-lockfile --filter @regista11/web...

COPY packages/web /app/packages/web

# packages/contracts/out and packages/contracts/deployments are NOT
# copied — ABIs are inlined in packages/web/src/abis/*.ts at sync-abis
# time, and deployment addresses are read from runtime env (FACTORY_ADDRESS).
# Adding those COPY lines back will break the build whenever those dirs
# are empty (e.g. pre-broadcast).

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @regista11/web build

# ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output bundles only the files the server needs.
# server.js is the entrypoint Next generates.
COPY --from=builder /app/packages/web/.next/standalone /app
COPY --from=builder /app/packages/web/.next/static /app/packages/web/.next/static
COPY --from=builder /app/packages/web/public /app/packages/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Standalone server lives at packages/web/server.js once Next.js writes it
# alongside the monorepo path mapping.
CMD ["node", "packages/web/server.js"]
