import { describe, it, expect } from 'vitest';
import {
  computeAverageSpeed,
  computeDensity,
  computeFlow,
  computeSpeedVariance,
  computeCongestionFraction,
  computeAllMetrics,
} from '../../src/engine/metrics';
import { createVehicle, Vehicle } from '../../src/engine/Vehicle';

describe('metrics — computeAverageSpeed', () => {
  it('returns 0 for empty array', () => {
    expect(computeAverageSpeed([])).toBe(0);
  });

  it('returns the speed for a single vehicle', () => {
    const vehicles = [createVehicle(0, 0, 20)];
    expect(computeAverageSpeed(vehicles)).toBe(20);
  });

  it('computes the arithmetic mean', () => {
    const vehicles = [
      createVehicle(0, 0, 10),
      createVehicle(1, 100, 20),
      createVehicle(2, 200, 30),
    ];
    expect(computeAverageSpeed(vehicles)).toBeCloseTo(20);
  });
});

describe('metrics — computeDensity', () => {
  it('computes vehicles per meter', () => {
    expect(computeDensity(30, 1000)).toBeCloseTo(0.03);
  });

  it('returns 0 for no vehicles', () => {
    expect(computeDensity(0, 1000)).toBe(0);
  });
});

describe('metrics — computeFlow', () => {
  it('satisfies Q = ρ × v̄', () => {
    const density = 0.03;
    const avgSpeed = 20;
    expect(computeFlow(density, avgSpeed)).toBeCloseTo(0.6);
  });

  it('returns 0 when speed is 0', () => {
    expect(computeFlow(0.05, 0)).toBe(0);
  });
});

describe('metrics — computeSpeedVariance', () => {
  it('returns 0 for empty array', () => {
    expect(computeSpeedVariance([], 0)).toBe(0);
  });

  it('returns 0 when all vehicles have the same speed', () => {
    const vehicles = [
      createVehicle(0, 0, 20),
      createVehicle(1, 100, 20),
      createVehicle(2, 200, 20),
    ];
    expect(computeSpeedVariance(vehicles, 20)).toBeCloseTo(0);
  });

  it('computes variance correctly', () => {
    const vehicles = [
      createVehicle(0, 0, 10),
      createVehicle(1, 100, 20),
      createVehicle(2, 200, 30),
    ];
    // Mean = 20, variance = ((10-20)² + (20-20)² + (30-20)²) / 3 = 200/3
    expect(computeSpeedVariance(vehicles, 20)).toBeCloseTo(200 / 3, 5);
  });

  it('is higher for stop-and-go than uniform slow', () => {
    // Stop-and-go: some stopped, some fast
    const stopAndGo = [
      createVehicle(0, 0, 0),
      createVehicle(1, 100, 30),
      createVehicle(2, 200, 0),
      createVehicle(3, 300, 30),
    ];
    const avgSG = computeAverageSpeed(stopAndGo);
    const varSG = computeSpeedVariance(stopAndGo, avgSG);

    // Uniformly slow: everyone crawling
    const uniformSlow = [
      createVehicle(0, 0, 5),
      createVehicle(1, 100, 5),
      createVehicle(2, 200, 5),
      createVehicle(3, 300, 5),
    ];
    const avgUS = computeAverageSpeed(uniformSlow);
    const varUS = computeSpeedVariance(uniformSlow, avgUS);

    expect(varSG).toBeGreaterThan(varUS);
  });
});

describe('metrics — computeCongestionFraction', () => {
  it('returns 0 when no vehicles are congested', () => {
    const vehicles = [
      createVehicle(0, 0, 30),
      createVehicle(1, 100, 30),
    ];
    // v0 = 33.3, threshold = 0.3, congestionSpeed = 9.99
    expect(computeCongestionFraction(vehicles, 33.3)).toBe(0);
  });

  it('returns 1 when all vehicles are congested', () => {
    const vehicles = [
      createVehicle(0, 0, 1),
      createVehicle(1, 100, 2),
    ];
    // congestionSpeed = 33.3 * 0.3 = 9.99
    expect(computeCongestionFraction(vehicles, 33.3)).toBe(1);
  });

  it('returns correct fraction for mixed traffic', () => {
    const vehicles = [
      createVehicle(0, 0, 5),  // congested (< 9.99)
      createVehicle(1, 100, 25), // not congested
      createVehicle(2, 200, 3),  // congested
      createVehicle(3, 300, 30), // not congested
    ];
    expect(computeCongestionFraction(vehicles, 33.3)).toBeCloseTo(0.5);
  });

  it('returns 0 for empty array', () => {
    expect(computeCongestionFraction([], 33.3)).toBe(0);
  });

  it('respects custom threshold', () => {
    const vehicles = [
      createVehicle(0, 0, 15), // 15/33.3 = 0.45
    ];
    // threshold 0.3 → congestionSpeed = 9.99 → not congested
    expect(computeCongestionFraction(vehicles, 33.3, 0.3)).toBe(0);
    // threshold 0.5 → congestionSpeed = 16.65 → congested
    expect(computeCongestionFraction(vehicles, 33.3, 0.5)).toBe(1);
  });
});

describe('metrics — computeAllMetrics', () => {
  it('returns consistent metrics', () => {
    const vehicles = [
      createVehicle(0, 0, 20),
      createVehicle(1, 100, 25),
      createVehicle(2, 200, 30),
    ];
    const m = computeAllMetrics(vehicles, 1000, 33.3);

    expect(m.averageSpeed).toBeCloseTo(25);
    expect(m.density).toBeCloseTo(0.003);
    // Q = ρ × v̄
    expect(m.flow).toBeCloseTo(m.density * m.averageSpeed, 10);
    expect(m.speedVariance).toBeGreaterThan(0);
    expect(m.congestionFraction).toBe(0); // All above 30% of 33.3
  });
});
