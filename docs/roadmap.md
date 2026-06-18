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
**Done:** custom fields (text/number/date/select/checkbox/url/email, typed values
on cards, admin-managed); **scoped API tokens** (`Authorization: Bearer` for the
REST API); **outbound webhooks** (HMAC-signed delivery + delivery log, managed in
Settings); **List + Calendar board views** (header switcher); **team
collaboration / admin panel** — multi-workspace switching (`X-Workspace-Id`),
member management (change role, remove, last-owner guard), and **email
invitations** (token links, accept page) in Settings, all RBAC-gated; **card
dependencies** — blocked-by / blocking links with cycle prevention, a "blocked"
chip on the board (cleared once blockers complete), and a card-modal editor;
**advanced filtering + sort** — filter cards by priority, due-date state, and
custom-field value (on top of text/label/assignee), plus sort by
priority/due/created/title, applied across board/list/calendar; **saved views**
— named, board-scoped filter+sort presets, persisted server-side and shared with
all board members (creator/admin can delete); **theming** — Light/Dark/Auto
modes + accent-color picker in Settings, persisted client-side and applied
before first paint; **SSO/OIDC login** (generic OIDC via discovery, surfaced on
the sign-in page when configured) and **TOTP 2FA** (authenticator enrollment
with backup codes, a sign-in challenge step, enable/disable in Settings);
**i18n** — full English + Turkish UI with a lightweight typed translation layer
and a language switcher in Settings (browser-default, persisted).
**Remaining:** passkeys.

### M5 — Polish & ops (in progress)
**Done:** **sidebar app-shell** (boards/admin/settings in a left rail; login
lands directly in your last board) with **column + card drag-and-drop**,
entrance/drag **animations** (reduced-motion aware), and centered columns;
importers — **Kanboard/CSV** + **Trello JSON** (upload → new board);
**export** — board to JSON or flat-cards CSV (download); **Playwright E2E**
covering sign-up → seeded board → add card → **drag-and-drop** → card modal /
labels, plus card dependencies, advanced filtering, saved views, theming, the
SSO button, 2FA enrollment, and team settings (member list + invite), running
in CI against the single-container build.
**Remaining:** backup/restore CLI, SQLite "lite mode", metrics/observability,
upgrade tooling, large-board virtualization, a11y + keyboard shortcuts,
board/card templates, security hardening.

See [`docs/architecture.md`](architecture.md) for how it's put together.
