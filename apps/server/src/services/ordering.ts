import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

/**
 * Fractional indexing for ordered lists (cards in a column, columns on a
 * board, …). A reorder becomes a SINGLE-row write: compute a key that sorts
 * between the two neighbours of the new slot. Keys are plain strings sorted
 * lexicographically; ties are broken deterministically by entity id at the
 * query layer.
 */

/** A key that sorts strictly between `prev` and `next` (null = open end). */
export function positionBetween(prev: string | null, next: string | null): string {
  return generateKeyBetween(prev, next);
}

/** `count` keys to append after `after` (null = from the start). */
export function positionsAfter(after: string | null, count: number): string[] {
  return generateNKeysBetween(after, null, count);
}

/** `count` evenly-spaced keys for an initial set (e.g. default columns). */
export function initialPositions(count: number): string[] {
  return generateNKeysBetween(null, null, count);
}
