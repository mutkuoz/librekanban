import type { boards, cards, columns } from '@librekanban/db';
import type { Board, Card, Column } from '@librekanban/shared';

/** ISO string or null — DB returns Date objects, the API contract uses strings. */
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function toBoardDTO(b: typeof boards.$inferSelect): Board {
  return {
    id: b.id,
    workspaceId: b.workspaceId,
    name: b.name,
    slug: b.slug,
    description: b.description,
    visibility: b.visibility,
    color: b.color,
    isArchived: b.isArchived,
    position: b.position,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function toColumnDTO(c: typeof columns.$inferSelect): Column {
  return {
    id: c.id,
    boardId: c.boardId,
    name: c.name,
    wipLimit: c.wipLimit,
    color: c.color,
    isDoneColumn: c.isDoneColumn,
    position: c.position,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function toCardDTO(c: typeof cards.$inferSelect): Card {
  return {
    id: c.id,
    boardId: c.boardId,
    columnId: c.columnId,
    swimlaneId: c.swimlaneId,
    number: c.number,
    title: c.title,
    description: c.description,
    priority: c.priority,
    dueAt: iso(c.dueAt),
    startAt: iso(c.startAt),
    position: c.position,
    isArchived: c.isArchived,
    completedAt: iso(c.completedAt),
    version: c.version,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
