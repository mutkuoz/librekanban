import type { BoardCard } from '@librekanban/shared';

export interface BoardFilter {
  text: string;
  labelId: string | null;
  assigneeId: string | null;
}

export function matchesFilter(card: BoardCard, filter: BoardFilter): boolean {
  if (filter.labelId && !card.labelIds.includes(filter.labelId)) return false;
  if (filter.assigneeId && !card.assigneeIds.includes(filter.assigneeId)) return false;
  if (filter.text) {
    const q = filter.text.toLowerCase();
    if (!card.title.toLowerCase().includes(q) && !`#${card.number}`.includes(q)) return false;
  }
  return true;
}

/** Lexicographic position comparator used to order columns/cards. */
export const byPosition = <T extends { position: string }>(a: T, b: T) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
