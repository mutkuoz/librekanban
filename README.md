# librekanban

A fast, modern, **self-hosted** open-source Kanban board — built to be a pleasant
replacement for heavier/slower tools. Clean UI, real-time collaboration, deep
customization (custom fields, swimlanes, WIP limits), and a codebase that's easy
to read, modify, and self-host.

> Status: **early development (M0/M1)** — the foundation and a working board
> vertical slice. See [`docs/roadmap.md`](docs/roadmap.md) for the milestone plan.

## Highlights

- ⚡ **Fast** — Hono + Drizzle on the backend, React 19 + Vite on the front.
- 🔒 **Batteries-included auth** — email/password + GitHub/Google OAuth (via better-auth),
  with sessions, scoped API tokens, and a clean seam to add SSO/2FA later.
- 🧩 **Customizable** — custom fields, swimlanes, WIP limits, labels, saved views.
- 🤝 **Real-time** — live board updates and presence over WebSockets.
- 🐘 **Postgres by default**, SQLite "lite mode" for the simplest possible self-host.
- 🐳 **One-command setup** — `docker compose up`.
- 🧱 **Type-safe end-to-end** — one OpenAPI contract from Zod schemas, generated client.

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19, Vite, TanStack Router + Query, Tailwind v4 + shadcn/ui, dnd-kit |
| Backend  | Hono (Node 22), `@hono/zod-openapi`, Drizzle ORM, better-auth, pino |
| Realtime | Native WebSockets + pluggable event bus (in-process / Redis) |
| Database | PostgreSQL 17 (default) · SQLite (lite mode) |
| Tooling  | pnpm + Turborepo, Biome, Vitest, Playwright |

## Quick start (Docker)

```bash
git clone <your-fork> librekanban && cd librekanban
cp .env.example .env
# edit .env: set AUTH_SECRET (openssl rand -base64 32)
docker compose -f docker/docker-compose.yml up -d
# open http://localhost:3000 — the first account you create becomes the admin
```

## Local development

```bash
corepack enable                 # ensures pnpm
pnpm install
docker compose -f docker/docker-compose.dev.yml up -d   # postgres only
cp .env.example .env            # set AUTH_SECRET
pnpm db:migrate                 # apply schema
pnpm dev                        # server (:3000) + web (:5173)
```

- Web (Vite dev server): http://localhost:5173 (proxies `/api` → server)
- API + OpenAPI docs: http://localhost:3000/api/docs

## Repository layout

```
apps/
  server/   Hono API + WebSockets + background jobs
  web/      React 19 + Vite single-page app
packages/
  shared/   Zod schemas, types, enums, permission matrix (no deps)
  db/       Drizzle schema, migrations, client, seed
  auth/     better-auth config + a thin facade (the swap seam)
  storage/  pluggable file storage (local disk / S3)
docker/     compose files + reverse-proxy example
docs/       setup, upgrade, customization, API
```

## Documentation

- [Setup & deployment](docs/setup.md)
- [Configuration reference](docs/configuration.md)
- [Architecture overview](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](docs/contributing.md)

## License

[MIT](LICENSE)
