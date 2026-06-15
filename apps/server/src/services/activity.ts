import { type Database, activities, newId } from '@librekanban/db';
import type { ActivityVerb, RealtimeEvent } from '@librekanban/shared';
import type { Deps } from '../lib/context';

interface ActivityInput {
  workspaceId: string;
  boardId?: string | null;
  cardId?: string | null;
  actorId?: string | null;
  verb: ActivityVerb;
  data?: Record<string, unknown>;
}

/**
 * Append an audit-log row. Call inside the same transaction as the change so
 * the log can never disagree with the data. `db` may be a transaction handle.
 */
export async function recordActivity(db: Database, input: ActivityInput): Promise<void> {
  await db.insert(activities).values({
    id: newId(),
    workspaceId: input.workspaceId,
    boardId: input.boardId ?? null,
    cardId: input.cardId ?? null,
    actorId: input.actorId ?? null,
    verb: input.verb,
    data: input.data ?? {},
  });
}

/**
 * Broadcast a realtime invalidation event (call AFTER the transaction commits,
 * so subscribers never observe a change that later rolls back).
 */
export function emitRealtime(deps: Deps, event: RealtimeEvent): void {
  deps.bus.publish(event);
}
