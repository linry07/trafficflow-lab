/**
 * Canvas renderer for simulation vehicles.
 *
 * Maps 1D road positions onto the 2D circular track with proper heading alignment,
 * speed-dependent color coding, headlights/taillights, perturbation highlights,
 * and interactive inspector highlights (selected vehicle, leader, following gap arc).
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
  selectedVehicleId?: number | null;
  leaderVehicleId?: number | null;
  followingGap?: number | null;
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

    const {
      cx,
      cy,
      radius,
      laneWidth,
      roadLength,
      v0,
      highlightVehicleId,
      selectedVehicleId,
      leaderVehicleId,
      followingGap,
    } = options;

    // Dynamically size vehicles based on vehicle density and radius
    const circumference = 2 * Math.PI * radius;
    const maxSpacingPerCar = circumference / vehicles.length;

    // Length scales to fit comfortably without overlapping at normal densities
    const carLength = Math.max(8, Math.min(18, maxSpacingPerCar * 0.65));
    const carWidth = Math.max(4.5, Math.min(8.5, laneWidth * 0.42));

    ctx.save();

    // 1. Render relationship arc between selected car and leader if selected
    if (
      selectedVehicleId !== null &&
      selectedVehicleId !== undefined &&
      leaderVehicleId !== null &&
      leaderVehicleId !== undefined &&
      selectedVehicleId !== leaderVehicleId
    ) {
      this.renderRelationshipArc(
        ctx,
        vehicles,
        selectedVehicleId,
        leaderVehicleId,
        followingGap,
        cx,
        cy,
        radius,
        laneWidth,
        roadLength,
      );
    }

    // 2. Render all vehicles
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
      const isPerturbed = highlightVehicleId === v.id;
      const isSelected = selectedVehicleId === v.id;
      const isLeader =
        leaderVehicleId === v.id &&
        selectedVehicleId !== null &&
        selectedVehicleId !== v.id;
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
        isPerturbed,
        isSelected,
        isLeader,
      );
    }

    ctx.restore();
  }

  /**
   * Render subtle luminous connection arc along the road between selected vehicle and leader.
   */
  private static renderRelationshipArc(
    ctx: CanvasRenderingContext2D,
    vehicles: ReadonlyArray<Vehicle>,
    selectedId: number,
    leaderId: number,
    followingGap: number | null | undefined,
    cx: number,
    cy: number,
    radius: number,
    laneWidth: number,
    roadLength: number,
  ): void {
    const follower = vehicles.find((v) => v.id === selectedId);
    const leader = vehicles.find((v) => v.id === leaderId);
    if (!follower || !leader) return;

    const startAngle = this.positionToAngle(follower.position, roadLength);
    let endAngle = this.positionToAngle(leader.position, roadLength);

    // Ensure startAngle < endAngle clockwise in [0, 2pi) range
    while (endAngle <= startAngle) {
      endAngle += Math.PI * 2;
    }

    // Arc along the circular track
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle, false);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = Math.max(2, laneWidth * 0.18);
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();

    // If following gap is available, render a compact gap tag at the midpoint of the arc
    if (followingGap !== null && followingGap !== undefined && followingGap > 0) {
      const midAngle = startAngle + (endAngle - startAngle) / 2;
      const labelRadius = radius + laneWidth * 0.85;
      const labelX = cx + labelRadius * Math.cos(midAngle);
      const labelY = cy + labelRadius * Math.sin(midAngle);

      ctx.save();
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = `${followingGap.toFixed(1)}m gap`;
      const textWidth = ctx.measureText(text).width;

      // Small background badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1;
      this.roundRect(
        ctx,
        labelX - textWidth / 2 - 4,
        labelY - 7,
        textWidth + 8,
        14,
        3,
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(text, labelX, labelY);
      ctx.restore();
    }
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
    isPerturbed: boolean,
    isSelected: boolean,
    isLeader: boolean,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);

    const halfL = length / 2;
    const halfW = width / 2;
    const cornerR = Math.min(halfW, 3.5);

    // 1a. Highlight halo for perturbed vehicle
    if (isPerturbed) {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(length, width) + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 1b. Selected vehicle prominent highlight (luminous cyan glow ring)
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(length, width) + 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, Math.max(length, width) + 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 1c. Immediate leader distinct highlight (amber dashed halo)
    if (isLeader) {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(length, width) + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#f59e0b'; // amber-500
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

    // 4. Vehicle body border
    ctx.strokeStyle = isSelected
      ? '#ffffff'
      : isLeader
        ? '#fbbf24'
        : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = isSelected ? 1.5 : 1;
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
