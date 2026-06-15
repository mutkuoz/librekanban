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
add/configure columns (rename, WIP limit, "done", delete), card archive, and a
per-card activity/history panel.
*Deferred to later:* multi-swimlane UI, attachments, saved views.

### M3 — Collaboration & realtime (in progress)
**Done:** in-app notifications (bell + feed, generated on assignment and on
comments to a card's assignees), RBAC surfaced in the UI (viewers are read-only:
no drag, composers, or column controls), per-card activity feed.
**Remaining:** email notifications + preferences, `@mentions`, and multi-node
readiness (Redis event bus + rate-limit store).

### M4 — Advanced & customization
Custom fields (define + filter/sort), List + Calendar views, card dependencies,
advanced filtering, OIDC/SSO + 2FA/passkeys, scoped API tokens, webhooks (HMAC),
theming/white-label, i18n, admin panel.

### M5 — Polish & ops
Importers (Kanboard, Trello, CSV/JSON) + export, backup/restore CLI, **SQLite
"lite mode"**, metrics/observability, upgrade tooling, large-board virtualization,
a11y + keyboard shortcuts, board/card templates, security hardening.

See [`docs/architecture.md`](architecture.md) for how it's put together.
