import { ulid } from 'ulid';

/**
 * Generate a new entity ID. ULIDs are 26-char, lexicographically sortable by
 * creation time — friendlier than UUIDs and naturally ordered for "newest"
 * queries without a separate timestamp sort.
 */
export const newId = (): string => ulid();
