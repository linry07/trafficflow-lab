import { describe, it, expect } from 'vitest';
import { SpaceTimeGrid } from '../../src/analytics/SpaceTimeGrid';
import { createVehicle } from '../../src/engine/Vehicle';

describe('SpaceTimePlot — Spatiotemporal Boundary & Coordinate Invariants', () => {
  const roadLength = 1000;

  it('correctly tracks vehicle crossing the 1000m -> 0m circular boundary', () => {
    const grid = new SpaceTimeGrid({ roadLength, sampleInterval: 0.25 });

    // Vehicle at t=0s is at position 990m traveling at 25 m/s
    grid.record(0.00, [createVehicle(1, 990, 25)]);

    // Vehicle at t=0.5s wrapped to position 2.5m (990 + 25*0.5 = 1002.5 -> 2.5m)
    grid.record(0.25, [createVehicle(1, 996.25, 25)]);
    grid.record(0.50, [createVehicle(1, 2.5, 25)]);

    const slices = grid.getSlices();
    expect(slices.length).toBe(3);

    const prevPos = slices[1].vehicles[0].position; // 996.25m
    const currPos = slices[2].vehicles[0].position; // 2.5m

    // Verify detection condition: x1 - x0 < -roadLength / 2
    const deltaX = currPos - prevPos;
    expect(deltaX).toBeLessThan(-roadLength / 2); // -993.75 < -500

    // Compute wrap point fraction
    const distToWrap = roadLength - prevPos; // 3.75m
    const distFromWrap = currPos; // 2.5m
    const totalDist = distToWrap + distFromWrap; // 6.25m
    const frac = distToWrap / totalDist; // 3.75 / 6.25 = 0.60
    expect(frac).toBeCloseTo(0.60);

    // Cross time should fall between t=0.25s and t=0.50s
    const tCross = 0.25 + (0.50 - 0.25) * frac;
    expect(tCross).toBeCloseTo(0.40);
  });

  it('keeps positions bounded in [0, roadLength) across all slices', () => {
    const grid = new SpaceTimeGrid({ roadLength });
    for (let t = 0; t < 10; t += 0.5) {
      const pos = (t * 120) % roadLength;
      grid.record(t, [createVehicle(0, pos, 30)]);
    }

    for (const slice of grid.getSlices()) {
      for (const v of slice.vehicles) {
        expect(v.position).toBeGreaterThanOrEqual(0);
        expect(v.position).toBeLessThan(roadLength);
      }
    }
  });
});
