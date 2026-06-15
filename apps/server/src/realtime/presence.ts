export interface PresenceUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Tracks who is currently viewing each board. Ephemeral and in-memory (per
 * node). Keyed by a per-connection id so the same user open in two tabs is
 * de-duplicated in `list()`. Multi-node presence would back this with Redis.
 */
export interface PresenceTracker {
  join(boardId: string, connId: string, user: PresenceUser): void;
  leave(boardId: string, connId: string): void;
  list(boardId: string): PresenceUser[];
}

export function createPresenceTracker(): PresenceTracker {
  const rooms = new Map<string, Map<string, PresenceUser>>();

  return {
    join(boardId, connId, user) {
      let room = rooms.get(boardId);
      if (!room) {
        room = new Map();
        rooms.set(boardId, room);
      }
      room.set(connId, user);
    },
    leave(boardId, connId) {
      const room = rooms.get(boardId);
      if (!room) return;
      room.delete(connId);
      if (room.size === 0) rooms.delete(boardId);
    },
    list(boardId) {
      const room = rooms.get(boardId);
      if (!room) return [];
      const byUser = new Map<string, PresenceUser>();
      for (const u of room.values()) byUser.set(u.id, u);
      return [...byUser.values()];
    },
  };
}
