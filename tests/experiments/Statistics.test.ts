import { describe, it, expect } from 'vitest';
import {
  computeWilsonInterval,
  computeMeanAndStdDev,
} from '../../src/experiments/Statistics';

describe('Statistics — computeWilsonInterval', () => {
  it('computes 95% Wilson interval for 50% probability (5/10 successes)', () => {
    const ci = computeWilsonInterval(5, 10, 0.95);
    expect(ci.estimate).toBe(0.5);
    // For n=10, k=5, 95% Wilson interval is approximately [0.237, 0.763]
    expect(ci.lower).toBeCloseTo(0.237, 2);
    expect(ci.upper).toBeCloseTo(0.763, 2);
    expect(ci.lower).toBeGreaterThan(0);
    expect(ci.upper).toBeLessThan(1);
  });

  it('handles 0 successes safely without returning a zero-width interval', () => {
    const ci = computeWilsonInterval(0, 10, 0.95);
    expect(ci.estimate).toBe(0);
    expect(ci.lower).toBe(0);
    // Upper bound should be > 0 (for n=10, k=0, upper ≈ 0.283)
    expect(ci.upper).toBeGreaterThan(0.2);
    expect(ci.upper).toBeLessThan(0.35);
  });

  it('handles 100% successes safely without returning a zero-width interval', () => {
    const ci = computeWilsonInterval(10, 10, 0.95);
    expect(ci.estimate).toBe(1.0);
    expect(ci.upper).toBe(1.0);
    // Lower bound should be < 1.0 (for n=10, k=10, lower ≈ 0.717)
    expect(ci.lower).toBeGreaterThan(0.65);
    expect(ci.lower).toBeLessThan(0.8);
  });

  it('interval narrows as sample size n increases', () => {
    const ciSmall = computeWilsonInterval(5, 10, 0.95); // n = 10, width ≈ 0.526
    const ciLarge = computeWilsonInterval(50, 100, 0.95); // n = 100, width ≈ 0.194

    const widthSmall = ciSmall.upper - ciSmall.lower;
    const widthLarge = ciLarge.upper - ciLarge.lower;

    expect(widthLarge).toBeLessThan(widthSmall / 2);
  });

  it('handles zero trials safely', () => {
    const ci = computeWilsonInterval(0, 0, 0.95);
    expect(ci.estimate).toBe(0);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(0);
  });
});

describe('Statistics — computeMeanAndStdDev', () => {
  it('computes sample statistics for array of values', () => {
    const values = [10, 20, 30, 40, 50];
    const stats = computeMeanAndStdDev(values);

    expect(stats.mean).toBe(30);
    // Sample variance (n-1 denominator) = 1000 / 4 = 250
    expect(stats.variance).toBe(250);
    expect(stats.stdDev).toBeCloseTo(Math.sqrt(250), 2);
    expect(stats.standardError).toBeCloseTo(Math.sqrt(250) / Math.sqrt(5), 2);
  });

  it('handles single value array', () => {
    const stats = computeMeanAndStdDev([42]);
    expect(stats.mean).toBe(42);
    expect(stats.variance).toBe(0);
    expect(stats.stdDev).toBe(0);
  });

  it('handles empty array', () => {
    const stats = computeMeanAndStdDev([]);
    expect(stats.mean).toBe(0);
    expect(stats.variance).toBe(0);
  });
});
