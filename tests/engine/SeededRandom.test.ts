import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../../src/engine/SeededRandom';

describe('SeededRandom', () => {
  it('produces values in [0, 1)', () => {
    const rng = new SeededRandom(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed produces same sequence', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);
    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new SeededRandom(1);
    const rng2 = new SeededRandom(2);
    // With overwhelming probability, the first value differs
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('nextRange returns values in [min, max)', () => {
    const rng = new SeededRandom(99);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextRange(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });

  it('nextInt returns integers in [min, max]', () => {
    const rng = new SeededRandom(77);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextInt(0, 5);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(5);
      seen.add(val);
    }
    // With 1000 trials and 6 possible values, all should appear
    expect(seen.size).toBe(6);
  });

  it('handles seed of 0', () => {
    const rng = new SeededRandom(0);
    // Should still produce valid output, not NaN or stuck
    const val = rng.next();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
    // Should advance (not stuck at 0)
    const val2 = rng.next();
    expect(val2).not.toBe(val);
  });

  it('handles negative seeds', () => {
    const rng = new SeededRandom(-42);
    const val = rng.next();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });
});
