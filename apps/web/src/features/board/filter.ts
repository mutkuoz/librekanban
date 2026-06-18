import type { BoardCard, BoardFilter, CustomField, DueState, SortKey } from '@librekanban/shared';
import { PRIORITIES } from '@librekanban/shared';

export type { BoardFilter } from '@librekanban/shared';

/** The empty filter — nothing constrained, manual ordering. */
export const EMPTY_FILTER: BoardFilter = {
  text: '',
  labelId: null,
  assigneeId: null,
  priorities: [],
  due: 'any',
  customField: null,
};

/** Which due-date bucket a card falls into (relative to now). */
export function dueState(card: BoardCard, now = new Date()): Exclude<DueState, 'any'> {
  if (!card.dueAt) return 'none';
  const due = new Date(card.dueAt);
  if (!card.completedAt && due.getTime() < now.getTime()) return 'overdue';
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  if (due.getTime() <= endOfToday.getTime()) return 'today';
  const weekOut = now.getTime() + 7 * 86_400_000;
  if (due.getTime() <= weekOut) return 'week';
  return 'none';
}

function matchesCustomField(card: BoardCard, filter: BoardFilter, fields: CustomField[]): boolean {
  if (!filter.customField) return true;
  const { fieldId, value } = filter.customField;
  const field = fields.find((f) => f.id === fieldId);
  if (!field) return true; // field removed; ignore the stale filter
  const raw = card.customFieldValues[fieldId];
  switch (field.type) {
    case 'checkbox':
      return String(Boolean(raw)) === value;
    case 'select':
    case 'user':
      return raw === value;
    case 'multiselect':
      return Array.isArray(raw) && raw.map(String).includes(value);
    case 'number':
      return raw != null && String(raw) === value;
    case 'date':
      return typeof raw === 'string' && raw.startsWith(value);
    default: // text, url, email
      return typeof raw === 'string' && raw.toLowerCase().includes(value.toLowerCase());
  }
}

export function matchesFilter(
  card: BoardCard,
  filter: BoardFilter,
  customFields: CustomField[] = [],
): boolean {
  if (filter.labelId && !card.labelIds.includes(filter.labelId)) return false;
  if (filter.assigneeId && !card.assigneeIds.includes(filter.assigneeId)) return false;
  if (filter.priorities.length > 0 && !filter.priorities.includes(card.priority)) return false;
  if (filter.due !== 'any' && dueState(card) !== filter.due) return false;
  if (!matchesCustomField(card, filter, customFields)) return false;
  if (filter.text) {
    const q = filter.text.toLowerCase();
    if (!card.title.toLowerCase().includes(q) && !`#${card.number}`.includes(q)) return false;
  }
  return true;
}

/** Count of active constraints beyond free-text search (drives the filter badge). */
export function activeFilterCount(filter: BoardFilter): number {
  return (
    (filter.labelId ? 1 : 0) +
    (filter.assigneeId ? 1 : 0) +
    (filter.priorities.length > 0 ? 1 : 0) +
    (filter.due !== 'any' ? 1 : 0) +
    (filter.customField ? 1 : 0)
  );
}

/** Lexicographic position comparator used to order columns/cards. */
export const byPosition = <T extends { position: string }>(a: T, b: T) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;

const priorityRank = (p: BoardCard['priority']) => PRIORITIES.indexOf(p);

/** Comparator for the chosen sort key. `manual` preserves fractional position. */
export function comparatorFor(sort: SortKey): (a: BoardCard, b: BoardCard) => number {
  switch (sort) {
    case 'priority':
      return (a, b) => priorityRank(b.priority) - priorityRank(a.priority) || byPosition(a, b);
    case 'due':
      return (a, b) => {
        const av = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
        const bv = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
        return av - bv || byPosition(a, b);
      };
    case 'created':
      return (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || byPosition(a, b);
    case 'title':
      return (a, b) => a.title.localeCompare(b.title) || byPosition(a, b);
    default:
      return byPosition;
  }
}
