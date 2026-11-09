import { describe, it, expect } from 'vitest';
import { createVehicle } from '../../src/engine/Vehicle';

describe('Vehicle', () => {
  it('creates a vehicle with given properties', () => {
    const v = createVehicle(0, 100, 20);
    expect(v.id).toBe(0);
    expect(v.position).toBe(100);
    expect(v.speed).toBe(20);
    expect(v.acceleration).toBe(0);
  });

  it('clamps negative speed to zero', () => {
    const v = createVehicle(1, 50, -10);
    expect(v.speed).toBe(0);
  });

  it('allows zero speed', () => {
    const v = createVehicle(2, 0, 0);
    expect(v.speed).toBe(0);
  });
});
