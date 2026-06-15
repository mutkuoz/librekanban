import { ROLE_RANK, type WorkspaceRole } from './enums';

/**
 * Capability-based permission model. Every protected action maps to the
 * MINIMUM workspace role required to perform it. `can()` is a pure function
 * shared by the server (the security boundary) and the web client (to hide or
 * disable UI affordances — never as the security boundary).
 */

export const ACTIONS = [
  // Workspace
  'workspace:read',
  'workspace:update',
  'workspace:delete',
  'member:invite',
  'member:remove',
  'member:setRole',
  // Boards
  'board:create',
  'board:read',
  'board:update',
  'board:delete',
  // Columns / swimlanes
  'column:manage',
  'swimlane:manage',
  // Cards
  'card:create',
  'card:read',
  'card:update',
  'card:move',
  'card:delete',
  // Card content
  'comment:create',
  'comment:moderate',
  'attachment:upload',
  'label:manage',
  // Customization & integrations
  'customField:manage',
  'webhook:manage',
  'apiToken:manage',
] as const;

export type Action = (typeof ACTIONS)[number];

/** Minimum role required for each action. */
export const PERMISSION_MATRIX: Record<Action, WorkspaceRole> = {
  'workspace:read': 'viewer',
  'workspace:update': 'admin',
  'workspace:delete': 'owner',
  'member:invite': 'admin',
  'member:remove': 'admin',
  'member:setRole': 'owner',

  'board:create': 'member',
  'board:read': 'viewer',
  'board:update': 'member',
  'board:delete': 'admin',

  'column:manage': 'member',
  'swimlane:manage': 'member',

  'card:create': 'member',
  'card:read': 'viewer',
  'card:update': 'member',
  'card:move': 'member',
  'card:delete': 'member',

  'comment:create': 'member',
  'comment:moderate': 'admin',
  'attachment:upload': 'member',
  'label:manage': 'member',

  'customField:manage': 'admin',
  'webhook:manage': 'admin',
  'apiToken:manage': 'member',
};

/** True if `role` is allowed to perform `action`. */
export function can(role: WorkspaceRole, action: Action): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[PERMISSION_MATRIX[action]];
}

/** The more-privileged of two roles (used to combine workspace + board roles). */
export function maxRole(a: WorkspaceRole, b: WorkspaceRole): WorkspaceRole {
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
}
