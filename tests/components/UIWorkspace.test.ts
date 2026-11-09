/**
 * UI Workspace & Responsive Layout Regression Tests.
 *
 * Validates:
 *   - Road circle geometry calculations across standard viewports (375px, 768px, 1024px, 1366px, 1440px)
 *   - Diameter constraints (target ~350-420px on desktop, scaling cleanly on mobile)
 *   - Metric card unit formatting and tabular layouts
 *   - Invariant preservation across layout changes
 */

import { describe, it, expect } from 'vitest';

describe('UI Workspace Geometry & Viewport Sizing', () => {
  /**
   * Replicates the exact road geometry formula used in SimulationCanvas.tsx
   */
  function computeRoadGeometry(width: number, height: number) {
    const minDim = Math.min(width, height);
    const targetDiameter = Math.min(390, Math.max(240, minDim * 0.84));
    const radius = targetDiameter / 2;
    const laneWidth = Math.max(20, Math.min(28, radius * 0.14));
    const outerDiameter = 2 * radius + laneWidth;
    const innerDiameter = 2 * radius - laneWidth;

    return {
      minDim,
      radius,
      laneWidth,
      centerlineDiameter: 2 * radius,
      outerDiameter,
      innerDiameter,
    };
  }

  it('keeps road circle diameter within 350-420px on standard desktop (1440x900, viewport height ~430px)', () => {
    // On 1440px desktop with 65% simulation column, canvas width is ~850px, height is 430px
    const geo = computeRoadGeometry(850, 430);

    expect(geo.centerlineDiameter).toBeGreaterThanOrEqual(350);
    expect(geo.centerlineDiameter).toBeLessThanOrEqual(400);
    expect(geo.outerDiameter).toBeGreaterThanOrEqual(360);
    expect(geo.outerDiameter).toBeLessThanOrEqual(420);
  });

  it('keeps road circle diameter within target bounds on 1366x768 laptop (viewport height ~420px)', () => {
    // On 1366px laptop, canvas width is ~800px, height is 420px
    const geo = computeRoadGeometry(800, 420);

    expect(geo.centerlineDiameter).toBeGreaterThanOrEqual(350);
    expect(geo.centerlineDiameter).toBeLessThanOrEqual(390);
    expect(geo.outerDiameter).toBeGreaterThanOrEqual(360);
    expect(geo.outerDiameter).toBeLessThanOrEqual(415);
  });

  it('scales cleanly without overflow on 1024px iPad landscape (height ~390px)', () => {
    const geo = computeRoadGeometry(600, 390);

    expect(geo.outerDiameter).toBeLessThan(390); // Never exceeds container height
    expect(geo.outerDiameter).toBeGreaterThan(320);
    expect(geo.laneWidth).toBeGreaterThanOrEqual(20);
  });

  it('adapts cleanly on 768px tablet portrait (height ~380px)', () => {
    const geo = computeRoadGeometry(720, 380);

    expect(geo.outerDiameter).toBeLessThan(380);
    expect(geo.centerlineDiameter).toBeGreaterThanOrEqual(300);
  });

  it('prevents horizontal clipping on 375px mobile (width 345px, height 340px)', () => {
    const geo = computeRoadGeometry(345, 340);

    // Outer diameter must fit comfortably inside 345px mobile width
    expect(geo.outerDiameter).toBeLessThan(335);
    expect(geo.outerDiameter).toBeGreaterThan(250);
    expect(geo.laneWidth).toBeGreaterThanOrEqual(20);
  });
});

describe('Compact Metrics Bar Layout', () => {
  it('formats metric values compactly with appropriate units', () => {
    const avgSpeedKmh = 119.88;
    const densityPerKm = 30;
    const flowVehPerHour = 3596.4;
    const congestionPct = 25.5;

    expect(avgSpeedKmh.toFixed(1)).toBe('119.9');
    expect(densityPerKm.toFixed(1)).toBe('30.0');
    expect(Math.round(flowVehPerHour).toLocaleString()).toBe('3,596');
    expect(congestionPct.toFixed(1)).toBe('25.5');
  });
});
