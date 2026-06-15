import { describe, expect, it } from 'vitest';
import { initialPositions, positionBetween, positionsAfter } from './ordering';

describe('ordering (fractional indexing)', () => {
  it('generates a key between two neighbours', () => {
    const a = positionBetween(null, null);
    const c = positionBetween(a, null);
    const b = positionBetween(a, c);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  it('keeps order stable across repeated mid-inserts', () => {
    const lo = positionBetween(null, null);
    let hi = positionBetween(lo, null);
    const keys = [lo, hi];
    for (let i = 0; i < 50; i++) {
      const mid = positionBetween(lo, hi);
      expect(lo < mid && mid < hi).toBe(true);
      keys.push(mid);
      hi = mid;
    }
    const sorted = [...keys].sort();
    expect(new Set(sorted).size).toBe(keys.length); // all unique
  });

  it('produces N initial keys in ascending order', () => {
    const keys = initialPositions(5);
    expect(keys).toHaveLength(5);
    expect([...keys].sort()).toEqual(keys);
  });

  it('appends keys after a given position', () => {
    const start = positionBetween(null, null);
    const next = positionsAfter(start, 3);
    expect(next).toHaveLength(3);
    expect(start < next[0]!).toBe(true);
    expect([...next].sort()).toEqual(next);
  });
});
