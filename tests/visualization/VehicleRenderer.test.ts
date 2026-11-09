import { describe, it, expect } from 'vitest';
import { VehicleRenderer } from '../../src/visualization/VehicleRenderer';

describe('VehicleRenderer — geometry calculations', () => {
  const roadLength = 1000;
  const radius = 200;
  const cx = 300;
  const cy = 300;

  it('maps position 0 to top of circle (angle -PI/2)', () => {
    const angle = VehicleRenderer.positionToAngle(0, roadLength);
    expect(angle).toBeCloseTo(-Math.PI / 2);

    const xy = VehicleRenderer.positionToXY(0, roadLength, radius, cx, cy);
    expect(xy.x).toBeCloseTo(cx);
    expect(xy.y).toBeCloseTo(cy - radius);
  });

  it('maps position 250m (quarter track) to right side (angle 0)', () => {
    const angle = VehicleRenderer.positionToAngle(250, roadLength);
    expect(angle).toBeCloseTo(0);

    const xy = VehicleRenderer.positionToXY(250, roadLength, radius, cx, cy);
    expect(xy.x).toBeCloseTo(cx + radius);
    expect(xy.y).toBeCloseTo(cy);
  });

  it('maps position 500m (half track) to bottom of circle (angle PI/2)', () => {
    const angle = VehicleRenderer.positionToAngle(500, roadLength);
    expect(angle).toBeCloseTo(Math.PI / 2);

    const xy = VehicleRenderer.positionToXY(500, roadLength, radius, cx, cy);
    expect(xy.x).toBeCloseTo(cx);
    expect(xy.y).toBeCloseTo(cy + radius);
  });

  it('maps position 750m (three-quarter track) to left side (angle PI)', () => {
    const angle = VehicleRenderer.positionToAngle(750, roadLength);
    expect(angle).toBeCloseTo(Math.PI);

    const xy = VehicleRenderer.positionToXY(750, roadLength, radius, cx, cy);
    expect(xy.x).toBeCloseTo(cx - radius);
    expect(xy.y).toBeCloseTo(cy);
  });

  it('wraps continuous position seamlessly at roadLength', () => {
    const atZero = VehicleRenderer.positionToXY(0, roadLength, radius, cx, cy);
    const atEnd = VehicleRenderer.positionToXY(roadLength, roadLength, radius, cx, cy);
    expect(atZero.x).toBeCloseTo(atEnd.x);
    expect(atZero.y).toBeCloseTo(atEnd.y);
  });
});
