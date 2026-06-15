# Contributing

Thanks for hacking on librekanban! The codebase is meant to be easy to modify.

## Workflow

```bash
corepack enable && pnpm install
docker compose -f docker/docker-compose.dev.yml up -d
pnpm db:migrate
pnpm dev
```

Before pushing, make sure these pass (CI runs the same):

```bash
pnpm lint        # Biome (format + lint)
pnpm typecheck   # tsc across the workspace
pnpm test        # Vitest unit tests
```

End-to-end (Playwright, drives a real browser against the single-container build;
needs Postgres running):

```bash
pnpm --filter @librekanban/web exec playwright install chromium   # once
pnpm --filter @librekanban/web test:e2e
```

## Conventions

- **Where code goes**: HTTP shape in `apps/server/src/routes`, business logic in
  `apps/server/src/services` (pure-ish, take `Deps`), data in `packages/db`,
  shared types/validation in `packages/shared`.
- **Contracts first**: add/extend a Zod schema in `packages/shared`, use it in the
  route (`createRoute`) and the web client — never hand-write a type that a schema
  can infer.
- **Permissions**: every mutation must call `assertBoardPermission` /
  `assertWorkspacePermission`. The client mirrors `can()` only for UI affordances.
- **Schema changes**: edit `packages/db/src/schema`, run `pnpm db:generate`, and
  commit the generated SQL in `packages/db/migrations`. Never edit an applied
  migration.
- **Ordering**: use `services/ordering.ts` (fractional indexing) — never integer
  positions.
- **Realtime**: mutations record an `activities` row and publish one invalidation
  event; don't push entity state over the socket.

## Tests

- Pure logic (ordering, permissions, importers) → unit tests next to the code.
- Services/routes → integration tests against a throwaway Postgres (M-by-M).
- Critical flows → Playwright E2E on the docker-compose stack.
