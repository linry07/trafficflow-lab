import { describe, it, expect } from 'vitest';
import { SpaceTimeGrid } from '../../src/analytics/SpaceTimeGrid';
import { createVehicle } from '../../src/engine/Vehicle';

describe('SpaceTimeGrid', () => {
  const roadLength = 1000;
  const numBins = 100; // 10m per bin

  it('initializes spatial bins with null for empty road segments', () => {
    const grid = new SpaceTimeGrid({ roadLength, numBins, sampleInterval: 0.25 });
    // Only two vehicles on the road: at position 100m (bin 10) and 500m (bin 50)
    const vehicles = [
      createVehicle(0, 100, 25),
      createVehicle(1, 500, 30),
    ];

    grid.record(0, vehicles);
    expect(grid.count).toBe(1);

    const slice = grid.getSlices()[0];
    expect(slice.bins.length).toBe(numBins);

    // Bins with vehicles should contain their speed
    expect(slice.bins[10]).toBeCloseTo(25);
    expect(slice.bins[50]).toBeCloseTo(30);

    // Empty road bins MUST be null, explicitly distinguishing absence of measurement
    expect(slice.bins[0]).toBeNull();
    expect(slice.bins[1]).toBeNull();
    expect(slice.bins[25]).toBeNull();
    expect(slice.bins[99]).toBeNull();
  });

  it('records microscopic vehicle snapshots for worldlines', () => {
    const grid = new SpaceTimeGrid({ roadLength, sampleInterval: 0.25 });
    const vehicles = [
      createVehicle(10, 150, 20),
      createVehicle(20, 350, 15),
    ];

    grid.record(0, vehicles);
    const slice = grid.getSlices()[0];

    expect(slice.vehicles.length).toBe(2);
    expect(slice.vehicles[0].id).toBe(10);
    expect(slice.vehicles[0].position).toBe(150);
    expect(slice.vehicles[0].speed).toBe(20);
  });

  it('samples strictly on simulated time intervals', () => {
    const grid = new SpaceTimeGrid({ sampleInterval: 0.25 });
    const vehicles = [createVehicle(0, 100, 20)];

    expect(grid.record(0.00, vehicles)).toBe(true);
    expect(grid.record(0.05, vehicles)).toBe(false);
    expect(grid.record(0.10, vehicles)).toBe(false);
    expect(grid.record(0.20, vehicles)).toBe(false);
    expect(grid.count).toBe(1);

    expect(grid.record(0.25, vehicles)).toBe(true);
    expect(grid.count).toBe(2);
  });

  it('enforces bounded sliding window duration retention', () => {
    const maxDuration = 5; // retain 5 seconds
    const grid = new SpaceTimeGrid({ sampleInterval: 0.5, maxDuration });
    const vehicles = [createVehicle(0, 100, 20)];

    for (let t = 0; t <= 10; t += 0.5) {
      grid.record(t, vehicles);
    }

    const { start, end, duration } = grid.timeRange;
    expect(start).toBeGreaterThanOrEqual(5);
    expect(end).toBe(10);
    expect(duration).toBeLessThanOrEqual(maxDuration + 0.1);
  });

  it('averages speed when multiple vehicles occupy the same spatial bin', () => {
    const grid = new SpaceTimeGrid({ roadLength: 1000, numBins: 100 }); // 10m/bin
    // Two vehicles in bin 5 (positions 52m and 58m)
    const vehicles = [
      createVehicle(0, 52, 20),
      createVehicle(1, 58, 30),
    ];

    grid.record(0, vehicles);
    const slice = grid.getSlices()[0];
    expect(slice.bins[5]).toBeCloseTo(25); // (20 + 30) / 2
  });

  it('clears all slices on reset', () => {
    const grid = new SpaceTimeGrid();
    grid.record(0, [createVehicle(0, 0, 20)]);
    grid.record(0.5, [createVehicle(0, 10, 20)]);
    expect(grid.count).toBe(2);

    grid.clear();
    expect(grid.count).toBe(0);
    expect(grid.timeRange.duration).toBe(0);
  });
});
