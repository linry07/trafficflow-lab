/**
 * Canvas renderer for the circular highway.
 *
 * Renders an asphalt track with inner/outer curbs, dashed lane centerline,
 * and physical distance scale markers (0m, 250m, 500m, 750m) along the perimeter.
 */

export interface RoadRenderOptions {
  cx: number;
  cy: number;
  radius: number;
  laneWidth: number;
  roadLength: number;
}

export class RoadRenderer {
  /**
   * Draw the circular road onto the canvas.
   */
  static render(ctx: CanvasRenderingContext2D, options: RoadRenderOptions): void {
    const { cx, cy, radius, laneWidth, roadLength } = options;
    const halfWidth = laneWidth / 2;
    const innerRadius = radius - halfWidth;
    const outerRadius = radius + halfWidth;

    ctx.save();

    // 1. Subtle outer road shadow/glow
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. Asphalt road surface ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = laneWidth;
    ctx.stroke();

    // 3. Inner and outer curb borders
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Dashed centerline marking
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'; // slate-400 subtle dash
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 12]);
    ctx.stroke();
    ctx.restore();

    // 5. Distance scale markers (0m, 250m, 500m, 750m)
    this.renderDistanceMarkers(ctx, cx, cy, innerRadius - 8, roadLength);

    ctx.restore();
  }

  /**
   * Render subtle distance tick marks and labels inside the ring.
   */
  private static renderDistanceMarkers(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    labelRadius: number,
    roadLength: number,
  ): void {
    const quarters = [0, 0.25, 0.5, 0.75];

    ctx.save();
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const fraction of quarters) {
      // 0m is at angle -PI/2 (top of circle)
      const angle = fraction * Math.PI * 2 - Math.PI / 2;
      const distance = Math.round(fraction * roadLength);
      const x = cx + labelRadius * Math.cos(angle);
      const y = cy + labelRadius * Math.sin(angle);

      ctx.fillText(`${distance}m`, x, y);
    }

    ctx.restore();
  }
}
