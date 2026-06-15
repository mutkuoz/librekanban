import type { IncomingMessage, Server } from 'node:http';
import { newId } from '@librekanban/db';
import type { RealtimeEvent } from '@librekanban/shared';
import { type RawData, type WebSocket, WebSocketServer } from 'ws';
import type { Deps } from './lib/context';
import { resolveBoardAccess } from './services/permissions';

interface ConnState {
  ws: WebSocket;
  connId: string;
  user: { id: string; name: string; avatarUrl: string | null } | null;
  boardId: string | null;
}

/**
 * Attach the realtime hub to the HTTP server at `/api/ws`. Clients authenticate
 * via their session cookie, then `subscribe` to one board at a time. Domain
 * events arrive via the EventBus and are forwarded to everyone in the room;
 * presence is tracked per connection and broadcast on join/leave.
 */
export function attachWebSocketServer(server: Server, deps: Deps): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/api/ws' });
  const rooms = new Map<string, Set<ConnState>>();
  const busUnsubs = new Map<string, () => void>();

  const broadcast = (boardId: string, payload: unknown): void => {
    const room = rooms.get(boardId);
    if (!room) return;
    const msg = JSON.stringify(payload);
    for (const conn of room) {
      if (conn.ws.readyState === conn.ws.OPEN) conn.ws.send(msg);
    }
  };

  const sendPresence = (boardId: string): void => {
    broadcast(boardId, { type: 'presence.sync', boardId, users: deps.presence.list(boardId) });
  };

  const leaveRoom = (conn: ConnState): void => {
    const boardId = conn.boardId;
    if (!boardId) return;
    const room = rooms.get(boardId);
    room?.delete(conn);
    deps.presence.leave(boardId, conn.connId);
    conn.boardId = null;
    if (room && room.size === 0) {
      rooms.delete(boardId);
      busUnsubs.get(boardId)?.();
      busUnsubs.delete(boardId);
    } else {
      sendPresence(boardId);
    }
  };

  const joinRoom = async (conn: ConnState, boardId: string): Promise<void> => {
    if (!conn.user) return;
    try {
      await resolveBoardAccess(deps.db, boardId, conn.user.id);
    } catch {
      conn.ws.send(JSON.stringify({ type: 'error', message: 'No access to this board' }));
      return;
    }
    if (conn.boardId) leaveRoom(conn);
    let room = rooms.get(boardId);
    if (!room) {
      room = new Set();
      rooms.set(boardId, room);
      const unsub = deps.bus.subscribe(boardId, (event: RealtimeEvent) =>
        broadcast(boardId, event),
      );
      busUnsubs.set(boardId, unsub);
    }
    room.add(conn);
    conn.boardId = boardId;
    deps.presence.join(boardId, conn.connId, conn.user);
    sendPresence(boardId);
  };

  const handleMessage = (conn: ConnState, raw: RawData): void => {
    let msg: { action?: unknown; boardId?: unknown };
    try {
      msg = JSON.parse(raw.toString()) as typeof msg;
    } catch {
      return;
    }
    if (msg.action === 'subscribe' && typeof msg.boardId === 'string') {
      void joinRoom(conn, msg.boardId);
    } else if (msg.action === 'unsubscribe') {
      leaveRoom(conn);
    }
  };

  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    const conn: ConnState = { ws, connId: newId(), user: null, boardId: null };
    const pending: RawData[] = [];

    // Attach listeners synchronously so messages sent right after `open`
    // aren't lost during the async authentication below.
    ws.on('message', (raw) => {
      if (conn.user) handleMessage(conn, raw);
      else pending.push(raw);
    });
    ws.on('close', () => leaveRoom(conn));
    ws.on('error', () => leaveRoom(conn));

    void (async () => {
      const headers = new Headers();
      if (request.headers.cookie) headers.set('cookie', request.headers.cookie);
      const session = await deps.auth.api.getSession({ headers });
      if (!session?.user) {
        ws.close(4401, 'unauthorized');
        return;
      }
      conn.user = {
        id: session.user.id,
        name: session.user.name,
        avatarUrl: session.user.image ?? null,
      };
      ws.send(JSON.stringify({ type: 'ready' }));
      for (const raw of pending) handleMessage(conn, raw);
      pending.length = 0;
    })();
  });

  return wss;
}
