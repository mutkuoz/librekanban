# Single-image build: installs the workspace, builds the SPA, and runs the
# server (which also serves the SPA). Run via docker/docker-compose.yml.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# --- Install dependencies (cached on lockfile + manifests) ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/storage/package.json ./packages/storage/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --- Build the web SPA ---
FROM deps AS build
COPY . .
RUN pnpm --filter @librekanban/web build

# --- Runtime ---
FROM build AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=/app/apps/web/dist
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:3000/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "@librekanban/server", "start"]
