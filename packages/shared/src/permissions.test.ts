import { describe, expect, it } from 'vitest';
import { can, maxRole } from './permissions';

describe('permissions', () => {
  it('grants owners every action', () => {
    expect(can('owner', 'workspace:delete')).toBe(true);
    expect(can('owner', 'member:setRole')).toBe(true);
  });

  it('lets members create and move cards but not delete the workspace', () => {
    expect(can('member', 'card:create')).toBe(true);
    expect(can('member', 'card:move')).toBe(true);
    expect(can('member', 'workspace:delete')).toBe(false);
    expect(can('member', 'member:invite')).toBe(false);
  });

  it('restricts viewers to read-only', () => {
    expect(can('viewer', 'board:read')).toBe(true);
    expect(can('viewer', 'card:read')).toBe(true);
    expect(can('viewer', 'card:create')).toBe(false);
    expect(can('viewer', 'comment:create')).toBe(false);
  });

  it('combines roles by privilege', () => {
    expect(maxRole('viewer', 'admin')).toBe('admin');
    expect(maxRole('member', 'viewer')).toBe('member');
    expect(maxRole('owner', 'admin')).toBe('owner');
  });
});
