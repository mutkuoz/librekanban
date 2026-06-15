import { EventEmitter } from 'node:events';
import type { RealtimeEvent } from '@librekanban/shared';

/**
 * The single fan-out point for domain changes. A mutation records an
 * `activities` row, then publishes one event here; subscribers (the WebSocket
 * hub today; notifications and webhooks later) react. Events are dumb
 * invalidation signals — never state diffs.
 */
export interface EventBus {
  publish(event: RealtimeEvent): void;
  subscribe(boardId: string, handler: (event: RealtimeEvent) => void): () => void;
}

/**
 * Single-node, in-process bus (the default — no Redis required). For
 * multi-node deployments a `RedisBus` implementing the same interface fans
 * events out across instances via pub/sub.
 */
export function createInProcessBus(): EventBus {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0); // many board rooms; avoid the default-10 warning
  return {
    publish(event) {
      emitter.emit(event.boardId, event);
    },
    subscribe(boardId, handler) {
      emitter.on(boardId, handler);
      return () => emitter.off(boardId, handler);
    },
  };
}
