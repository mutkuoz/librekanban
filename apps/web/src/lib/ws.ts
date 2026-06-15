import type { Presence, RealtimeEvent } from '@librekanban/shared';

interface Handlers {
  onEvent: (event: RealtimeEvent) => void;
  onPresence: (users: Presence['users']) => void;
}

/**
 * Subscribe to a board's realtime stream. Reconnects with capped exponential
 * backoff. Returns a disposer. Events are treated as invalidation signals.
 */
export function subscribeToBoard(boardId: string, handlers: Handlers): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const wsUrl = `${window.location.origin.replace(/^http/, 'ws')}/api/ws`;

  const connect = (): void => {
    socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      attempt = 0;
      socket?.send(JSON.stringify({ action: 'subscribe', boardId }));
    };
    socket.onmessage = (e) => {
      let msg: { type?: string; users?: Presence['users'] };
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === 'presence.sync') handlers.onPresence(msg.users ?? []);
      else if (msg.type && msg.type !== 'ready' && msg.type !== 'error') {
        handlers.onEvent(msg as unknown as RealtimeEvent);
      }
    };
    socket.onclose = () => {
      if (closed) return;
      attempt += 1;
      timer = setTimeout(connect, Math.min(1000 * 2 ** attempt, 15000));
    };
    socket.onerror = () => socket?.close();
  };

  connect();

  return () => {
    closed = true;
    if (timer) clearTimeout(timer);
    socket?.close();
  };
}
