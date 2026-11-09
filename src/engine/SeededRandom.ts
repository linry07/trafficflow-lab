/**
 * Deterministic pseudo-random number generator using the Mulberry32 algorithm.
 *
 * Mulberry32 is a simple, fast 32-bit PRNG with good statistical properties.
 * It passes BigCrush and is suitable for simulation use (not cryptographic).
 *
 * Using a seedable PRNG ensures that identical seeds produce identical
 * simulation trajectories, enabling reproducible experiments.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Ensure the seed is a 32-bit integer
    this.state = seed | 0;
  }

  /**
   * Returns the next pseudo-random number in [0, 1).
   */
  next(): number {
    // Mulberry32 algorithm
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random number uniformly distributed in [min, max).
   */
  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns a pseudo-random integer in [min, max] (inclusive).
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max + 1));
  }

  /**
   * Returns the current internal state (useful for saving/restoring).
   */
  getState(): number {
    return this.state;
  }
}
