# Roadmap

librekanban is built in milestones. Each milestone is shippable.

### M0 — Scaffolding ✅
Monorepo (pnpm + Turborepo), Biome, strict TS. Shared Zod contracts + permission
matrix. Drizzle/Postgres schema (verified). Hono API + OpenAPI docs, better-auth,
realtime WebSocket hub, env validation, Docker + compose + CI. React 19 + Vite SPA.

### M1 — MVP (in progress)
Auth (email/password + GitHub) and first-run workspace provisioning. Boards,
columns, and cards CRUD. **Drag-and-drop** (reorder + move across columns) with
optimistic UI. Card detail (title/description/priority). Live updates + presence.

### M2 — Core card depth
Multi-assignees, labels, due/start dates, priority chips, checklists/subtasks,
comments (+ @mentions), attachments, per-card activity history, swimlanes, WIP
limits (enforced), search + filtering, saved Kanban views.

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
