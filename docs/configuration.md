# Configuration reference

All configuration is via environment variables (12-factor). They are validated at
boot — the server refuses to start on invalid config and tells you why. See
[`.env.example`](../.env.example) for a copy-paste template.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PUBLIC_URL` | `http://localhost:3000` | External URL (links, cookies, OAuth callbacks) |
| `PORT` | `3000` | Port the server listens on |
| `LOG_LEVEL` | `info` | `trace`…`fatal` |
| `AUTH_SECRET` | — | **Required.** Long random secret (`openssl rand -base64 32`) |
| `SIGNUP_MODE` | `open` | `open` \| `invite-only` \| `closed` |
| `DATABASE_URL` | — | **Required.** Postgres connection string |
| `AUTO_MIGRATE` | `true` | Apply migrations on boot (advisory-locked) |
| `REDIS_URL` | — | Optional; enables multi-node realtime + rate-limit store |
| `STORAGE_BACKEND` | `local` | `local` \| `s3` |
| `STORAGE_LOCAL_DIR` | `./data/uploads` | Upload directory for local storage |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | — | S3-compatible storage |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | Enable GitHub OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Enable Google OAuth |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | — | Email (M3) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |
| `RATE_LIMIT_MAX` | `300` | Max requests per window |
| `STATIC_DIR` | — | Path to the built SPA; set automatically in the Docker image |
