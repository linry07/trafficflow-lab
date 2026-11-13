/**
 * Canvas Hit Detection for Circular Road Vehicles.
 *
 * Maps screen/CSS click coordinates to the 2D circular track and tests
 * against each vehicle's rotated bounding capsule.
 *
 * Features:
 *   - Accounts for circular track radius, vehicle position, and heading orientation
 *   - Generous, comfortable click/touch hit targets with configurable padding
 *   - Selects the closest vehicle if multiple overlapping bounding boxes match
 *   - Works consistently across standard and Retina / High-DPI screens
 */

import { Vehicle } from '../engine/Vehicle';
import { VehicleRenderer } from './VehicleRenderer';

export interface HitDetectionOptions {
  /** Center X of the circular track in CSS pixels */
  cx: number;
  /** Center Y of the circular track in CSS pixels */
  cy: number;
  /** Radius of the circular track in CSS pixels */
  radius: number;
  /** Width of the roadway in CSS pixels */
  laneWidth: number;
  /** Road length in meters (e.g. 1000m) */
  roadLength: number;
  /** Additional hit box padding in CSS pixels (defaults to 7px) */
  hitPadding?: number;
}

export interface HitDetectionResult {
  vehicle: Vehicle;
  distanceSq: number;
}

/**
 * Find the vehicle at the given canvas coordinate (in CSS pixels).
 *
 * @param clickX    Click X relative to canvas top-left in CSS pixels
 * @param clickY    Click Y relative to canvas top-left in CSS pixels
 * @param vehicles  List of vehicles currently on the road
 * @param options   Road and track geometry configuration
 * @returns         The clicked Vehicle, or null if empty space was clicked
 */
export function findVehicleAtCanvasCoord(
  clickX: number,
  clickY: number,
  vehicles: ReadonlyArray<Vehicle>,
  options: HitDetectionOptions,
): Vehicle | null {
  if (vehicles.length === 0) return null;

  const { cx, cy, radius, laneWidth, roadLength, hitPadding = 7 } = options;

  // 1. Radial boundary pre-check: clicks far outside or inside the ring can be discarded immediately
  const distFromCenter = Math.hypot(clickX - cx, clickY - cy);
  const maxRoadRadius = radius + laneWidth + hitPadding + 10;
  const minRoadRadius = Math.max(0, radius - laneWidth - hitPadding - 10);

  if (distFromCenter > maxRoadRadius || distFromCenter < minRoadRadius) {
    return null;
  }

  // Visual size of vehicles (matching VehicleRenderer.renderAll logic)
  const circumference = 2 * Math.PI * radius;
  const maxSpacingPerCar = circumference / vehicles.length;
  const carLength = Math.max(8, Math.min(18, maxSpacingPerCar * 0.65));
  const carWidth = Math.max(4.5, Math.min(8.5, laneWidth * 0.42));

  const halfL = carLength / 2 + hitPadding;
  const halfW = carWidth / 2 + hitPadding;

  let bestVehicle: Vehicle | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const { x, y, angle } = VehicleRenderer.positionToXY(
      v.position,
      roadLength,
      radius,
      cx,
      cy,
    );

    // Tangent heading angle (clockwise motion)
    const heading = angle + Math.PI / 2;

    // Vector from vehicle center to click point
    const dx = clickX - x;
    const dy = clickY - y;

    // Transform into vehicle's rotated local coordinate frame
    // (X is along vehicle length/heading, Y is lateral width)
    const cosH = Math.cos(-heading);
    const sinH = Math.sin(-heading);
    const localX = dx * cosH - dy * sinH;
    const localY = dx * sinH + dy * cosH;

    // Check if within vehicle bounding capsule + padding
    if (Math.abs(localX) <= halfL && Math.abs(localY) <= halfW) {
      // Normalized distance metric to center of vehicle
      const score = Math.pow(localX / halfL, 2) + Math.pow(localY / halfW, 2);
      if (score < bestScore) {
        bestScore = score;
        bestVehicle = v;
      }
    }
  }

  return bestVehicle;
}
