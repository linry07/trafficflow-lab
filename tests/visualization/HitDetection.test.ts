import { describe, it, expect } from 'vitest';
import { findVehicleAtCanvasCoord } from '../../src/visualization/HitDetection';
import { createVehicle } from '../../src/engine/Vehicle';
import { VehicleRenderer } from '../../src/visualization/VehicleRenderer';

describe('HitDetection — vehicle selection on circular track', () => {
  const roadLength = 1000;
  const radius = 180;
  const cx = 300;
  const cy = 250;
  const laneWidth = 24;

  const defaultOptions = {
    cx,
    cy,
    radius,
    laneWidth,
    roadLength,
    hitPadding: 8,
  };

  it('accurately hits vehicle at top of circular track (position 0m)', () => {
    // Position 0m is at (cx, cy - radius)
    const v0 = createVehicle(0, 0, 25);
    const v1 = createVehicle(1, 500, 25);

    const hit = findVehicleAtCanvasCoord(cx, cy - radius, [v0, v1], defaultOptions);
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe(0);
  });

  it('accurately hits vehicle at right of circular track (position 250m)', () => {
    // Position 250m is at (cx + radius, cy)
    const v = createVehicle(5, 250, 20);

    const hit = findVehicleAtCanvasCoord(cx + radius, cy, [v], defaultOptions);
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe(5);
  });

  it('accurately hits vehicle at bottom of circular track (position 500m)', () => {
    // Position 500m is at (cx, cy + radius)
    const v = createVehicle(7, 500, 15);

    const hit = findVehicleAtCanvasCoord(cx, cy + radius, [v], defaultOptions);
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe(7);
  });

  it('accurately hits vehicle at left of circular track (position 750m)', () => {
    // Position 750m is at (cx - radius, cy)
    const v = createVehicle(9, 750, 30);

    const hit = findVehicleAtCanvasCoord(cx - radius, cy, [v], defaultOptions);
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe(9);
  });

  it('handles clicks with hit padding tolerance around the vehicle body', () => {
    const v = createVehicle(2, 250, 20); // Center at (cx + radius, cy) = (480, 250)

    // Click 5px offset laterally (perpendicular to road tangent)
    const hit = findVehicleAtCanvasCoord(480 + 5, 250, [v], defaultOptions);
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe(2);
  });

  it('returns null when clicking completely outside the road boundary', () => {
    const v = createVehicle(1, 0, 25);

    // Click near canvas origin (0, 0) far outside radius
    const hit = findVehicleAtCanvasCoord(10, 10, [v], defaultOptions);
    expect(hit).toBeNull();
  });

  it('returns null when clicking inside the center hub of the circle', () => {
    const v = createVehicle(1, 0, 25);

    // Click at center (cx, cy)
    const hit = findVehicleAtCanvasCoord(cx, cy, [v], defaultOptions);
    expect(hit).toBeNull();
  });

  it('returns null when clicking empty road space between vehicles', () => {
    // Two vehicles opposite each other at 0m and 500m
    const v0 = createVehicle(0, 0, 25);
    const v1 = createVehicle(1, 500, 25);

    // Click at 250m (right side of ring) where no car is present
    const hit = findVehicleAtCanvasCoord(cx + radius, cy, [v0, v1], defaultOptions);
    expect(hit).toBeNull();
  });

  it('selects the closest vehicle when two vehicles are close together', () => {
    // Vehicles spaced 15m apart (close together)
    const vA = createVehicle(10, 200, 20);
    const vB = createVehicle(11, 215, 20);

    // Compute exact position of vB
    const posB = VehicleRenderer.positionToXY(215, roadLength, radius, cx, cy);

    const hit = findVehicleAtCanvasCoord(posB.x, posB.y, [vA, vB], defaultOptions);
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe(11);
  });

  it('handles high-DPI and scaled viewport sizes consistently', () => {
    // Scaled viewport: e.g. compact mobile 320x340
    const mobileOptions = {
      cx: 160,
      cy: 170,
      radius: 120,
      laneWidth: 20,
      roadLength: 1000,
      hitPadding: 8,
    };

    const v = createVehicle(42, 500, 10); // at cy + radius = 170 + 120 = 290
    const hit = findVehicleAtCanvasCoord(160, 290, [v], mobileOptions);
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe(42);
  });

  it('returns null if vehicle list is empty', () => {
    const hit = findVehicleAtCanvasCoord(cx, cy - radius, [], defaultOptions);
    expect(hit).toBeNull();
  });
});
