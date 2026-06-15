# Setup & deployment

## Option A — Docker (recommended)

```bash
cp .env.example .env
# REQUIRED: set a strong AUTH_SECRET
#   openssl rand -base64 32
docker compose -f docker/docker-compose.yml up -d --build
```

Open <http://localhost:3000>. The **first account you create becomes the admin**
and gets a personal workspace with a sample board. Migrations run automatically on
startup.

To expose it publicly, put it behind a reverse proxy (Caddy/nginx/Traefik) that
terminates TLS, and set `PUBLIC_URL=https://your.domain` in `.env`.

## Option B — Local development

Prerequisites: Node 22+, `corepack` (ships with Node), Docker (for Postgres).

```bash
corepack enable
pnpm install
docker compose -f docker/docker-compose.dev.yml up -d   # Postgres on :5432
cp .env.example .env                                     # set AUTH_SECRET
pnpm db:migrate                                          # apply schema
pnpm dev                                                 # server :3000 + web :5173
```

- App (Vite, with API proxy + HMR): <http://localhost:5173>
- API + interactive docs: <http://localhost:3000/api/docs>

Useful scripts: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm db:generate`
(after schema changes), `pnpm db:seed` (demo data).

## Upgrading

```bash
git pull
docker compose -f docker/docker-compose.yml up -d --build
```

Back up first (`pg_dump`). Migrations are forward-only and auto-applied on boot;
set `AUTO_MIGRATE=false` to run them out-of-band with `pnpm db:migrate`.

## Troubleshooting

- **Server exits at boot with a config error** — it validates every env var and
  prints exactly what's missing/invalid. Fix `.env` and restart.
- **`/readyz` returns 503** — the database isn't reachable; check `DATABASE_URL`
  and that Postgres is healthy.
- **OAuth not showing / failing** — set the provider's client id+secret in `.env`
  and ensure the callback URL matches `PUBLIC_URL`.
