import { describe, it, expect } from 'vitest';
import { wrapPosition, computeGap, sortVehicles, getLeaderIndex } from '../../src/engine/Road';
import { createVehicle } from '../../src/engine/Vehicle';

const ROAD_LENGTH = 1000;
const VEHICLE_LENGTH = 5;

describe('Road — wrapPosition', () => {
  it('leaves position in range unchanged', () => {
    expect(wrapPosition(500, ROAD_LENGTH)).toBe(500);
    expect(wrapPosition(0, ROAD_LENGTH)).toBe(0);
  });

  it('wraps position exceeding road length', () => {
    expect(wrapPosition(1000, ROAD_LENGTH)).toBe(0);
    expect(wrapPosition(1050, ROAD_LENGTH)).toBe(50);
    expect(wrapPosition(2500, ROAD_LENGTH)).toBe(500);
  });

  it('wraps negative positions', () => {
    expect(wrapPosition(-1, ROAD_LENGTH)).toBe(999);
    expect(wrapPosition(-500, ROAD_LENGTH)).toBe(500);
    expect(wrapPosition(-1000, ROAD_LENGTH)).toBe(0);
  });

  it('handles very small positive position', () => {
    expect(wrapPosition(0.001, ROAD_LENGTH)).toBeCloseTo(0.001);
  });
});

describe('Road — computeGap', () => {
  it('computes gap for adjacent vehicles (no wrapping)', () => {
    const follower = createVehicle(0, 100, 20);
    const leader = createVehicle(1, 150, 20);
    const gap = computeGap(follower, leader, ROAD_LENGTH, VEHICLE_LENGTH);
    expect(gap).toBe(45); // 150 - 100 - 5
  });

  it('computes gap with wraparound (leader just past 0)', () => {
    const follower = createVehicle(0, 990, 20);
    const leader = createVehicle(1, 10, 20);
    // Distance: (10 - 990 + 1000) % 1000 = 20, gap = 20 - 5 = 15
    const gap = computeGap(follower, leader, ROAD_LENGTH, VEHICLE_LENGTH);
    expect(gap).toBe(15);
  });

  it('computes gap when vehicles are far apart', () => {
    const follower = createVehicle(0, 0, 20);
    const leader = createVehicle(1, 999, 20);
    const gap = computeGap(follower, leader, ROAD_LENGTH, VEHICLE_LENGTH);
    expect(gap).toBe(994); // 999 - 0 - 5
  });

  it('returns zero gap when bumper-to-bumper', () => {
    const follower = createVehicle(0, 100, 0);
    const leader = createVehicle(1, 105, 0);
    const gap = computeGap(follower, leader, ROAD_LENGTH, VEHICLE_LENGTH);
    expect(gap).toBe(0);
  });

  it('returns negative gap when overlapping (collision)', () => {
    const follower = createVehicle(0, 100, 0);
    const leader = createVehicle(1, 103, 0);
    const gap = computeGap(follower, leader, ROAD_LENGTH, VEHICLE_LENGTH);
    expect(gap).toBe(-2); // Overlap of 2m
  });

  it('handles wraparound gap correctly with tight spacing', () => {
    const follower = createVehicle(0, 998, 10);
    const leader = createVehicle(1, 5, 10);
    // Center distance: (5 - 998 + 1000) % 1000 = 7
    // Gap: 7 - 5 = 2
    const gap = computeGap(follower, leader, ROAD_LENGTH, VEHICLE_LENGTH);
    expect(gap).toBe(2);
  });

  it('computes single-vehicle bumper-to-bumper gap accounting for vehicle length', () => {
    // Single vehicle case: vehicle is its own leader (follower.id === leader.id).
    // The forward distance around the loop back to its rear bumper is
    // roadLength - vehicleLength (not the unreduced road circumference).
    const single = createVehicle(0, 250, 20);
    const gap = computeGap(single, single, ROAD_LENGTH, VEHICLE_LENGTH);
    expect(gap).toBe(ROAD_LENGTH - VEHICLE_LENGTH); // 1000 - 5 = 995
    expect(gap).not.toBe(ROAD_LENGTH); // Explicitly confirms vehicle length is subtracted
  });
});

describe('Road — sortVehicles', () => {
  it('sorts vehicles by position ascending', () => {
    const v1 = createVehicle(0, 300, 10);
    const v2 = createVehicle(1, 100, 10);
    const v3 = createVehicle(2, 200, 10);
    const sorted = sortVehicles([v1, v2, v3]);
    expect(sorted.map((v) => v.position)).toEqual([100, 200, 300]);
  });

  it('does not mutate the input array', () => {
    const v1 = createVehicle(0, 300, 10);
    const v2 = createVehicle(1, 100, 10);
    const original = [v1, v2];
    sortVehicles(original);
    expect(original[0].position).toBe(300);
    expect(original[1].position).toBe(100);
  });

  it('handles empty array', () => {
    expect(sortVehicles([])).toEqual([]);
  });

  it('handles already sorted array', () => {
    const v1 = createVehicle(0, 100, 10);
    const v2 = createVehicle(1, 200, 10);
    const sorted = sortVehicles([v1, v2]);
    expect(sorted.map((v) => v.position)).toEqual([100, 200]);
  });
});

describe('Road — getLeaderIndex', () => {
  it('returns next index for middle vehicles', () => {
    expect(getLeaderIndex(0, 5)).toBe(1);
    expect(getLeaderIndex(2, 5)).toBe(3);
  });

  it('wraps around at the end (last vehicle → first vehicle)', () => {
    expect(getLeaderIndex(4, 5)).toBe(0);
    expect(getLeaderIndex(9, 10)).toBe(0);
  });
});
