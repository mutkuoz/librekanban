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

### M2 — Core card depth (mostly done)
**Done:** multi-assignees, labels (create + attach), due dates, priority,
checklists/subtasks, comments, search + label/assignee filtering, and per-card
relations surfaced on the board (label bars, avatars, due/checklist/comment
chips). The backend records a full `activities` audit log.
**Remaining:** WIP-limit enforcement + a column-settings UI, multi-swimlane UI, a
per-card activity/history panel, archive UI, start dates, attachments, saved
views, and `@mentions`.

### M3 — Collaboration & realtime
In-app + email notifications, notification preferences, full RBAC surfacing in the
UI, board/workspace activity feed, multi-node readiness (Redis event bus + rate-limit
store).

### M4 — Advanced & customization
Custom fields (define + filter/sort), List + Calendar views, card dependencies,
advanced filtering, OIDC/SSO + 2FA/passkeys, scoped API tokens, webhooks (HMAC),
theming/white-label, i18n, admin panel.

### M5 — Polish & ops
Importers (Kanboard, Trello, CSV/JSON) + export, backup/restore CLI, **SQLite
"lite mode"**, metrics/observability, upgrade tooling, large-board virtualization,
a11y + keyboard shortcuts, board/card templates, security hardening.

See [`docs/architecture.md`](architecture.md) for how it's put together.
