import type { RealtimeEvent } from '@librekanban/shared';
import Redis from 'ioredis';
import type { EventBus } from './event-bus';

const channel = (boardId: string) => `board:${boardId}`;

/**
 * Multi-node EventBus backed by Redis pub/sub. Same interface as the in-process
 * bus, so an event published on any node reaches WS clients on every node. Uses
 * two connections (a subscriber connection can't issue normal commands).
 */
export function createRedisBus(url: string): EventBus {
  const pub = new Redis(url, { maxRetriesPerRequest: null });
  const sub = new Redis(url, { maxRetriesPerRequest: null });
  const handlers = new Map<string, Set<(event: RealtimeEvent) => void>>();

  sub.on('message', (ch, message) => {
    const set = handlers.get(ch);
    if (!set) return;
    let event: RealtimeEvent;
    try {
      event = JSON.parse(message);
    } catch {
      return;
    }
    for (const h of set) h(event);
  });

  return {
    publish(event) {
      void pub.publish(channel(event.boardId), JSON.stringify(event));
    },
    subscribe(boardId, handler) {
      const ch = channel(boardId);
      let set = handlers.get(ch);
      if (!set) {
        set = new Set();
        handlers.set(ch, set);
        void sub.subscribe(ch);
      }
      set.add(handler);
      return () => {
        set.delete(handler);
        if (set.size === 0) {
          handlers.delete(ch);
          void sub.unsubscribe(ch);
        }
      };
    },
  };
}
