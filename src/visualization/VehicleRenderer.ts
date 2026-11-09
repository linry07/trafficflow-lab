/**
 * Canvas renderer for simulation vehicles.
 *
 * Maps 1D road positions onto the 2D circular track with proper heading alignment,
 * speed-dependent color coding, headlights/taillights, and perturbation highlights.
 */

import { Vehicle } from '../engine/Vehicle';
import { getSpeedColor } from './colorScale';

export interface VehicleRenderOptions {
  cx: number;
  cy: number;
  radius: number;
  laneWidth: number;
  roadLength: number;
  v0: number;
  highlightVehicleId?: number | null;
}

export class VehicleRenderer {
  /**
   * Convert a 1D road position (meters) into an angle (radians) on the circular track.
   * Position 0 is at the top (-PI/2) and travel proceeds clockwise.
   */
  static positionToAngle(position: number, roadLength: number): number {
    return (position / roadLength) * Math.PI * 2 - Math.PI / 2;
  }

  /**
   * Convert position to 2D Cartesian coordinates on the canvas.
   */
  static positionToXY(
    position: number,
    roadLength: number,
    radius: number,
    cx: number,
    cy: number,
  ): { x: number; y: number; angle: number } {
    const angle = this.positionToAngle(position, roadLength);
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      angle,
    };
  }

  /**
   * Render all vehicles in the simulation.
   */
  static renderAll(
    ctx: CanvasRenderingContext2D,
    vehicles: ReadonlyArray<Vehicle>,
    options: VehicleRenderOptions,
  ): void {
    if (vehicles.length === 0) return;

    const { cx, cy, radius, laneWidth, roadLength, v0, highlightVehicleId } =
      options;

    // Dynamically size vehicles based on vehicle density and radius
    const circumference = 2 * Math.PI * radius;
    const maxSpacingPerCar = circumference / vehicles.length;

    // Length scales to fit comfortably without overlapping at normal densities
    const carLength = Math.max(8, Math.min(18, maxSpacingPerCar * 0.65));
    const carWidth = Math.max(4.5, Math.min(8.5, laneWidth * 0.42));

    ctx.save();

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const { x, y, angle } = this.positionToXY(
        v.position,
        roadLength,
        radius,
        cx,
        cy,
      );

      // Tangent heading angle (clockwise motion)
      const heading = angle + Math.PI / 2;
      const isHighlighted = highlightVehicleId === v.id;
      const color = getSpeedColor(v.speed, v0);

      this.renderVehicle(
        ctx,
        x,
        y,
        heading,
        carLength,
        carWidth,
        color,
        v.speed,
        v0,
        isHighlighted,
      );
    }

    ctx.restore();
  }

  /**
   * Render a single vehicle capsule with orientation and lighting cues.
   */
  private static renderVehicle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    heading: number,
    length: number,
    width: number,
    color: string,
    speed: number,
    v0: number,
    isHighlighted: boolean,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);

    const halfL = length / 2;
    const halfW = width / 2;
    const cornerR = Math.min(halfW, 3.5);

    // 1. Highlight halo for perturbed vehicle
    if (isHighlighted) {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(length, width) + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Vehicle body shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.roundRect(ctx, -halfL + 1, -halfW + 1, length, width, cornerR);
    ctx.fill();

    // 3. Vehicle body
    ctx.fillStyle = color;
    this.roundRect(ctx, -halfL, -halfW, length, width, cornerR);
    ctx.fill();

    // 4. Subtle vehicle body border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 5. Headlights (facing forward, +X direction in rotated space)
    ctx.fillStyle = '#fef08a'; // yellow-200
    ctx.fillRect(halfL - 1.5, -halfW + 0.8, 1.5, 1.5);
    ctx.fillRect(halfL - 1.5, halfW - 2.3, 1.5, 1.5);

    // 6. Taillights (facing backward, -X direction in rotated space)
    const isBraking = speed < v0 * 0.5;
    ctx.fillStyle = isBraking ? '#ff0000' : '#b91c1c';
    ctx.fillRect(-halfL, -halfW + 0.8, 1.5, 1.5);
    ctx.fillRect(-halfL, halfW - 2.3, 1.5, 1.5);

    ctx.restore();
  }

  /**
   * Helper to draw a rounded rectangle.
   */
  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }
}
