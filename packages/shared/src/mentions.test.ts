import { describe, expect, it } from 'vitest';
import { parseMentions } from './mentions';

const members = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
  { id: 'u3', name: 'Carol' },
];

describe('parseMentions', () => {
  it('finds mentioned members (case-insensitive)', () => {
    expect(parseMentions('hey @Alice and @bob', members).sort()).toEqual(['u1', 'u2']);
  });

  it('returns empty when no mentions', () => {
    expect(parseMentions('no mentions here', members)).toEqual([]);
  });

  it('de-duplicates repeated mentions', () => {
    expect(parseMentions('@Alice @Alice', members)).toEqual(['u1']);
  });

  it('ignores names without the @ prefix', () => {
    expect(parseMentions('Alice was here', members)).toEqual([]);
  });
});
