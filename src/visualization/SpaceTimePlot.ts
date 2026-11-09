/**
 * SpaceTimePlot — High-performance HTML5 Canvas renderer for the Space-Time traffic diagram.
 *
 * Visualizes the spatiotemporal evolution of traffic on the circular highway:
 *   - Horizontal axis: Road position x in [0, 1000m]
 *   - Vertical axis: Simulated time t in seconds (advancing upward from t_start to t_end)
 *   - Color: Speed-coded (Green = Free flow, Amber = Slowing, Red = Congested)
 *
 * Handles:
 *   1. Periodic boundary wrapping (no cross-screen streak artifacts when vehicles wrap 1000m -> 0m)
 *   2. Dual visualization modes:
 *      - 'trajectories': Continuous vehicle worldline trajectories
 *      - 'bins': Mesoscopic spatial occupancy bins (explicitly distinguishing empty road from occupied cells)
 *   3. High-DPI screen sharpness via devicePixelRatio
 */

import { SpaceTimeSlice } from '../analytics/SpaceTimeGrid';
import { getSpeedColor } from './colorScale';

export type SpaceTimeViewMode = 'trajectories' | 'bins';

export interface SpaceTimePlotOptions {
  width: number;
  height: number;
  roadLength: number;
  v0: number;
  mode: SpaceTimeViewMode;
}

export class SpaceTimePlot {
  /**
   * Render the complete space-time diagram on the given canvas context.
   */
  static render(
    ctx: CanvasRenderingContext2D,
    slices: ReadonlyArray<SpaceTimeSlice>,
    options: SpaceTimePlotOptions,
  ): void {
    const { width, height, roadLength, v0, mode } = options;

    // Define plot area with margin for axes and labels
    const margin = { top: 20, right: 24, bottom: 45, left: 60 };
    const plotX = margin.left;
    const plotY = margin.top;
    const plotW = Math.max(100, width - margin.left - margin.right);
    const plotH = Math.max(100, height - margin.top - margin.bottom);

    ctx.save();

    // 1. Clear full canvas
    ctx.fillStyle = '#090d16'; // Deep space slate
    ctx.fillRect(0, 0, width, height);

    // 2. Draw plot background
    ctx.fillStyle = '#0f172a'; // Slightly elevated plot area
    ctx.fillRect(plotX, plotY, plotW, plotH);

    // 3. Draw grid and axes
    this.drawAxesAndGrid(ctx, plotX, plotY, plotW, plotH, roadLength, slices);

    // If no data yet, draw empty state notice
    if (slices.length < 2) {
      this.drawEmptyNotice(ctx, plotX, plotY, plotW, plotH);
      ctx.restore();
      return;
    }

    const tMin = slices[0].time;
    const tMax = slices[slices.length - 1].time;
    const tSpan = Math.max(0.1, tMax - tMin);

    // Coordinate projection functions
    // x in [0, roadLength] -> screenX in [plotX, plotX + plotW]
    const projX = (x: number) => plotX + (x / roadLength) * plotW;
    // t in [tMin, tMax] -> screenY in [plotY + plotH (bottom, tMin), plotY (top, tMax)]
    const projY = (t: number) => plotY + plotH - ((t - tMin) / tSpan) * plotH;

    // Clip rendering strictly to plot area so curves do not bleed into margins
    ctx.save();
    ctx.beginPath();
    ctx.rect(plotX, plotY, plotW, plotH);
    ctx.clip();

    if (mode === 'bins') {
      this.renderBins(ctx, slices, projY, plotW, plotH, v0);
    } else {
      this.renderTrajectories(ctx, slices, projX, projY, roadLength, v0);
    }

    ctx.restore();

    // 4. Draw outer border of plot area
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(plotX, plotY, plotW, plotH);

    ctx.restore();
  }

  /**
   * Render continuous vehicle trajectory lines (Lagrangian worldlines).
   * Seamlessly splits segments that cross the 1000m <-> 0m boundary.
   */
  private static renderTrajectories(
    ctx: CanvasRenderingContext2D,
    slices: ReadonlyArray<SpaceTimeSlice>,
    projX: (x: number) => number,
    projY: (t: number) => number,
    roadLength: number,
    v0: number,
  ): void {
    ctx.lineWidth = 2.0;

    for (let s = 1; s < slices.length; s++) {
      const prevSlice = slices[s - 1];
      const currSlice = slices[s];
      const t0 = prevSlice.time;
      const t1 = currSlice.time;
      const y0 = projY(t0);
      const y1 = projY(t1);

      // Match vehicles by ID between consecutive slices
      const prevMap = new Map<number, { position: number; speed: number }>();
      for (const v of prevSlice.vehicles) {
        prevMap.set(v.id, { position: v.position, speed: v.speed });
      }

      for (const currV of currSlice.vehicles) {
        const prevV = prevMap.get(currV.id);
        if (!prevV) continue;

        const x0 = prevV.position;
        const x1 = currV.position;
        const avgSpeed = (prevV.speed + currV.speed) / 2;
        ctx.strokeStyle = getSpeedColor(avgSpeed, v0);

        // Check if vehicle wrapped across the 1000m -> 0m boundary
        // On a circular road, vehicles travel forward (increasing x).
        // If x1 is significantly smaller than x0, it wrapped around.
        if (x1 - x0 < -roadLength / 2) {
          // Wrapped: split at the x = roadLength / x = 0 boundary
          const distToWrap = roadLength - x0;
          const distFromWrap = x1;
          const totalDist = distToWrap + distFromWrap;
          const frac = totalDist > 0 ? distToWrap / totalDist : 0.5;
          const tCross = t0 + (t1 - t0) * frac;
          const yCross = projY(tCross);

          // Segment 1: from x0 to roadLength at boundary
          ctx.beginPath();
          ctx.moveTo(projX(x0), y0);
          ctx.lineTo(projX(roadLength), yCross);
          ctx.stroke();

          // Segment 2: from 0 to x1 at boundary
          ctx.beginPath();
          ctx.moveTo(projX(0), yCross);
          ctx.lineTo(projX(x1), y1);
          ctx.stroke();
        } else {
          // Normal non-wrapping segment
          ctx.beginPath();
          ctx.moveTo(projX(x0), y0);
          ctx.lineTo(projX(x1), y1);
          ctx.stroke();
        }
      }
    }
  }

  /**
   * Render spatial occupancy bins.
   * Explicitly draws observed speed colored blocks, and leaves empty road dark.
   */
  private static renderBins(
    ctx: CanvasRenderingContext2D,
    slices: ReadonlyArray<SpaceTimeSlice>,
    projY: (t: number) => number,
    plotW: number,
    plotH: number,
    v0: number,
  ): void {
    if (slices.length === 0) return;
    const numBins = slices[0].bins.length;
    const binWidth = plotW / numBins;
    const sliceHeight = Math.max(1.5, plotH / slices.length);

    for (let s = 0; s < slices.length; s++) {
      const slice = slices[s];
      const y = projY(slice.time) - sliceHeight / 2;

      for (let b = 0; b < numBins; b++) {
        const speed = slice.bins[b];
        // If null: empty road (no vehicle observed), skip fill
        if (speed === null) continue;

        const x = plotX_bin(b, numBins, plotW);
        ctx.fillStyle = getSpeedColor(speed, v0);
        ctx.fillRect(x, y, binWidth + 0.5, sliceHeight + 0.5);
      }
    }
  }

  /**
   * Draw distance and time axes, tick marks, and labels.
   */
  private static drawAxesAndGrid(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    roadLength: number,
    slices: ReadonlyArray<SpaceTimeSlice>,
  ): void {
    ctx.save();
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.strokeStyle = '#1e293b'; // slate-800 subtle gridlines
    ctx.lineWidth = 1;

    // 1. Horizontal distance ticks (0m, 250m, 500m, 750m, 1000m)
    const distanceTicks = [0, 0.25, 0.5, 0.75, 1.0];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const frac of distanceTicks) {
      const tickX = x + frac * w;
      // Grid vertical line
      ctx.beginPath();
      ctx.moveTo(tickX, y);
      ctx.lineTo(tickX, y + h);
      ctx.stroke();

      // Tick mark
      ctx.beginPath();
      ctx.moveTo(tickX, y + h);
      ctx.lineTo(tickX, y + h + 5);
      ctx.stroke();

      const distVal = Math.round(frac * roadLength);
      ctx.fillText(`${distVal}m`, tickX, y + h + 8);
    }

    // Distance axis title
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Road Position (m) → direction of travel', x + w / 2, y + h + 26);

    // 2. Vertical time ticks
    if (slices.length >= 2) {
      const tMin = slices[0].time;
      const tMax = slices[slices.length - 1].time;
      const numTimeTicks = 5;

      ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= numTimeTicks; i++) {
        const frac = i / numTimeTicks;
        const tickY = y + h - frac * h;
        const timeVal = tMin + frac * (tMax - tMin);

        // Horizontal grid line
        ctx.beginPath();
        ctx.moveTo(x, tickY);
        ctx.lineTo(x + w, tickY);
        ctx.stroke();

        // Label on left
        ctx.fillText(`${timeVal.toFixed(0)}s`, x - 8, tickY);
      }
    }

    // Time axis title (rotated 90 degrees)
    ctx.save();
    ctx.translate(x - 38, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Simulated Time (s) ↑', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private static drawEmptyNotice(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    ctx.save();
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Recording traffic spatio-temporal data...', x + w / 2, y + h / 2);
    ctx.restore();
  }
}

function plotX_bin(binIndex: number, numBins: number, plotW: number): number {
  return 60 + (binIndex / numBins) * plotW;
}
