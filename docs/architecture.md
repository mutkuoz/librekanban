# Architecture

End-to-end TypeScript monorepo. One OpenAPI contract derived from Zod schemas
flows types from the database to the browser.

```
┌──────────────┐   /api (REST, cookie session)   ┌────────────────────────────┐
│  apps/web     │ ──────────────────────────────▶ │ apps/server (Hono, Node 22)│
│  React 19     │   /api/ws (WebSocket)            │  routes → services → db    │
│  TanStack     │ ◀────── invalidation events ──── │  better-auth · RBAC · bus  │
└──────────────┘                                   └─────────────┬──────────────┘
                                                                 │ Drizzle
                                                          ┌──────▼──────┐
                                                          │ PostgreSQL  │
                                                          └─────────────┘
```

### Packages
- **`packages/shared`** — Zod schemas, enums, and the capability-based permission
  matrix (`can()`). Imported by both server and web; the single source of truth.
- **`packages/db`** — Drizzle schema + migrations + client factory + ULID ids.
- **`packages/auth`** — `createAuth()` wraps better-auth; the one place auth is
  configured, so providers (OIDC/2FA) can be added without touching call sites.
- **`packages/storage`** — `StorageBackend` interface (local disk / S3).

### Server
Routes are thin (`createRoute` + handler); business logic lives in `services/*`,
which receive `Deps` (db, auth, bus, presence, storage, logger) — explicit DI keeps
everything unit-testable. The **security boundary is the server**: every mutation
calls `assertBoardPermission`/`assertWorkspacePermission`.

### Ordering
Cards/columns/swimlanes use **fractional indexing** (`services/ordering.ts`): a move
is a single-row write, conflict-tolerant under concurrent edits.

### Realtime
Every mutation records an `activities` row (audit log) and publishes one **dumb
invalidation event** on the `EventBus`. The WebSocket hub fans events to the right
board room; clients invalidate their TanStack Query cache (the REST API stays the
source of truth — no state diffs, no CRDTs). Presence is tracked per connection.
A single-node deploy needs no Redis; a `RedisBus` (M3) scales it horizontally.

### Frontend
Vite SPA. TanStack Query owns server state; Zustand is reserved for transient UI
state. Drag-and-drop is isolated in `features/board` (dnd-kit) with optimistic local
state that re-syncs from the server on settle and on realtime events.

### Deploy
Single container: the server serves the built SPA (`STATIC_DIR`) and the API on one
port. `docker compose` adds Postgres. Migrations auto-apply on boot under a Postgres
advisory lock (replica-safe).
