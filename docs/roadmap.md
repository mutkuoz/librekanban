# Roadmap

librekanban is built in milestones. Each milestone is shippable.

### M0 — Scaffolding ✅
Monorepo (pnpm + Turborepo), Biome, strict TS. Shared Zod contracts + permission
matrix. Drizzle/Postgres schema (verified). Hono API + OpenAPI docs, better-auth,
realtime WebSocket hub, env validation, Docker + compose + CI. React 19 + Vite SPA.

### M1 — MVP ✅
Auth (email/password + GitHub) and first-run workspace provisioning. Boards,
columns, and cards CRUD. **Drag-and-drop** (reorder + move across columns) with
optimistic UI + live updates + presence. Card detail panel.

### M2 — Core card depth ✅
Multi-assignees, labels (create + attach), start/due dates, priority,
checklists/subtasks, comments, search + label/assignee filtering, per-card
relations on the board (label bars, avatars, due/checklist/comment chips),
add/configure columns (rename, WIP limit, "done", delete), card archive, a
per-card activity/history panel, and **file attachments** (upload/download/
delete, image previews, count chip; local-disk or S3).
*Deferred to later:* multi-swimlane UI, saved views.

### M3 — Collaboration & realtime ✅
In-app notifications (bell + feed, generated on assignment, comments, and
`@mentions`) with **email** delivery (instant, SMTP-optional) and a per-user
email preference. RBAC surfaced in the UI (viewers are read-only). Per-card
activity feed. **Multi-node ready:** Redis event bus (`REDIS_URL`) for realtime
fan-out across instances, and rate limiting (in-memory or Redis-backed,
`RateLimit-*` headers).
*Deferred to later:* daily-digest emails and a `@mention` autocomplete UI
(typing `@Name` already works).

### M4 — Advanced & customization (in progress)
**Done:** custom fields — define per-board fields (text / number / date /
select / checkbox / url / email), set typed values on cards, shown in the card
modal; managed by admins via the board's field manager.
**Remaining:** filter/sort by custom field, List + Calendar views, card
dependencies, advanced filtering, OIDC/SSO + 2FA/passkeys, scoped API tokens,
webhooks (HMAC), theming/white-label, i18n, admin panel.

### M5 — Polish & ops
Importers (Kanboard, Trello, CSV/JSON) + export, backup/restore CLI, **SQLite
"lite mode"**, metrics/observability, upgrade tooling, large-board virtualization,
a11y + keyboard shortcuts, board/card templates, security hardening.

See [`docs/architecture.md`](architecture.md) for how it's put together.
