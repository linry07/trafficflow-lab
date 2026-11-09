import { describe, it, expect } from 'vitest';
import { computeAcceleration } from '../../src/engine/IDMModel';
import { DEFAULT_IDM_PARAMS, IDMParams } from '../../src/engine/SimulationConfig';

const params = DEFAULT_IDM_PARAMS;

describe('IDMModel — computeAcceleration', () => {
  describe('free-road behavior (large gap, no leader interaction)', () => {
    const largeGap = 10000; // 10 km — effectively no leader
    const noApproach = 0;

    it('accelerates from rest toward v₀', () => {
      const accel = computeAcceleration(0, largeGap, noApproach, params);
      expect(accel).toBeGreaterThan(0);
      // Should be close to max acceleration
      expect(accel).toBeCloseTo(params.a, 1);
    });

    it('accelerates at mid-speed', () => {
      const accel = computeAcceleration(params.v0 / 2, largeGap, noApproach, params);
      expect(accel).toBeGreaterThan(0);
    });

    it('acceleration tapers to zero near v₀', () => {
      const accel = computeAcceleration(params.v0 * 0.99, largeGap, noApproach, params);
      expect(accel).toBeGreaterThan(0);
      expect(accel).toBeLessThan(0.1); // Very small
    });

    it('decelerates when above v₀', () => {
      const accel = computeAcceleration(params.v0 * 1.1, largeGap, noApproach, params);
      expect(accel).toBeLessThan(0);
    });

    it('never exceeds maximum acceleration', () => {
      // Maximum acceleration occurs at speed=0, infinite gap
      const accel = computeAcceleration(0, largeGap, noApproach, params);
      expect(accel).toBeLessThanOrEqual(params.a + 0.001);
    });
  });

  describe('car-following behavior', () => {
    it('brakes when gap is much smaller than desired gap', () => {
      // Moving fast but very close to leader
      const accel = computeAcceleration(20, 5, 0, params);
      expect(accel).toBeLessThan(0);
    });

    it('brakes harder when closing in on leader', () => {
      const gap = 20;
      const speed = 20;
      const brakingNoApproach = computeAcceleration(speed, gap, 0, params);
      const brakingWithApproach = computeAcceleration(speed, gap, 10, params);
      // Closing in should cause harder braking
      expect(brakingWithApproach).toBeLessThan(brakingNoApproach);
    });

    it('brakes to stop behind a stationary vehicle', () => {
      // Approaching a stopped vehicle
      const accel = computeAcceleration(15, 10, 15, params);
      expect(accel).toBeLessThan(0);
    });

    it('maintains approximate equilibrium at appropriate gap', () => {
      // Equilibrium gap for speed v: s_eq ≈ s0 + v*T
      const speed = 20;
      const equilibriumGap = params.s0 + speed * params.T;
      const accel = computeAcceleration(speed, equilibriumGap, 0, params);
      // Should be close to the free-road acceleration, minus a small interaction
      // Not exactly zero because the free-road term also contributes
      expect(Math.abs(accel)).toBeLessThan(params.a); // Bounded
    });
  });

  describe('edge cases and numerical safety', () => {
    it('handles zero speed', () => {
      const accel = computeAcceleration(0, 10, 0, params);
      expect(Number.isFinite(accel)).toBe(true);
      expect(accel).toBeGreaterThan(0); // Should accelerate from rest
    });

    it('handles very small gap without NaN/Infinity', () => {
      const accel = computeAcceleration(10, 0.001, 5, params);
      expect(Number.isFinite(accel)).toBe(true);
      expect(accel).toBeLessThan(0); // Should brake hard
    });

    it('handles zero gap (clamped internally to 0.01)', () => {
      const accel = computeAcceleration(10, 0, 5, params);
      expect(Number.isFinite(accel)).toBe(true);
    });

    it('handles negative approach rate (leader moving away)', () => {
      const accel = computeAcceleration(10, 30, -10, params);
      expect(Number.isFinite(accel)).toBe(true);
    });

    it('handles very large speed', () => {
      const accel = computeAcceleration(100, 50, 0, params);
      expect(Number.isFinite(accel)).toBe(true);
      expect(accel).toBeLessThan(0); // Way over v₀, should decelerate
    });

    it('never returns NaN for any reasonable input', () => {
      const speeds = [0, 0.1, 1, 10, 30, 50, 100];
      const gaps = [0, 0.01, 0.1, 1, 5, 10, 50, 100, 1000];
      const approaches = [-20, -10, -1, 0, 1, 10, 20];

      for (const speed of speeds) {
        for (const gap of gaps) {
          for (const approach of approaches) {
            const accel = computeAcceleration(speed, gap, approach, params);
            expect(Number.isNaN(accel)).toBe(false);
            expect(Number.isFinite(accel)).toBe(true);
          }
        }
      }
    });
  });

  describe('parameter sensitivity', () => {
    it('higher v₀ leads to more acceleration at same speed', () => {
      const speed = 20;
      const gap = 1000;
      const p1: IDMParams = { ...params, v0: 30 };
      const p2: IDMParams = { ...params, v0: 40 };
      const a1 = computeAcceleration(speed, gap, 0, p1);
      const a2 = computeAcceleration(speed, gap, 0, p2);
      expect(a2).toBeGreaterThan(a1);
    });

    it('higher T (more cautious) leads to harder braking at same gap', () => {
      const speed = 20;
      const gap = 30;
      const p1: IDMParams = { ...params, T: 1.0 };
      const p2: IDMParams = { ...params, T: 2.0 };
      const a1 = computeAcceleration(speed, gap, 0, p1);
      const a2 = computeAcceleration(speed, gap, 0, p2);
      expect(a2).toBeLessThan(a1); // More cautious → harder braking
    });

    it('higher max acceleration a leads to stronger acceleration', () => {
      const p1: IDMParams = { ...params, a: 0.5 };
      const p2: IDMParams = { ...params, a: 2.0 };
      const a1 = computeAcceleration(0, 1000, 0, p1);
      const a2 = computeAcceleration(0, 1000, 0, p2);
      expect(a2).toBeGreaterThan(a1);
    });
  });
});
