/**
 * Shared enums / string-literal unions used across the DB schema, the API
 * contract, and the web client. Defined as readonly tuples so they can feed
 * both `z.enum(...)` and Drizzle's `text(...).$type<...>()`.
 */

export const WORKSPACE_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Higher number = more privilege. Used for "effective role" comparisons. */
export const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export const BOARD_VISIBILITIES = ['private', 'workspace', 'public'] as const;
export type BoardVisibility = (typeof BOARD_VISIBILITIES)[number];

export const CUSTOM_FIELD_TYPES = [
  'text',
  'number',
  'date',
  'select',
  'multiselect',
  'checkbox',
  'user',
  'url',
  'email',
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const SIGNUP_MODES = ['open', 'invite-only', 'closed'] as const;
export type SignupMode = (typeof SIGNUP_MODES)[number];

export const STORAGE_BACKENDS = ['local', 's3'] as const;
export type StorageBackend = (typeof STORAGE_BACKENDS)[number];

/**
 * Activity verbs — the single vocabulary for the audit log, which also drives
 * realtime fan-out, notifications, and webhooks.
 */
export const ACTIVITY_VERBS = [
  'board.created',
  'board.updated',
  'board.archived',
  'column.created',
  'column.updated',
  'column.deleted',
  'card.created',
  'card.updated',
  'card.moved',
  'card.archived',
  'card.deleted',
  'card.linked',
  'card.unlinked',
  'comment.added',
  'comment.updated',
  'comment.deleted',
  'label.added',
  'label.removed',
  'member.invited',
  'member.joined',
  'member.removed',
] as const;
export type ActivityVerb = (typeof ACTIVITY_VERBS)[number];

/** Realtime event types broadcast over WebSockets (invalidation signals). */
export const REALTIME_EVENTS = [
  'board.updated',
  'column.updated',
  'card.updated',
  'card.moved',
  'comment.updated',
  'presence.sync',
] as const;
export type RealtimeEventType = (typeof REALTIME_EVENTS)[number];
