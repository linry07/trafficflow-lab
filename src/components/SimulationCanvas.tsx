/**
 * Responsive HTML5 Canvas component for the circular highway traffic simulation.
 *
 * Features:
 *   - Automatic High-DPI / Retina display scaling via window.devicePixelRatio
 *   - Continuous responsive resizing via ResizeObserver
 *   - Decoupled rendering powered by RoadRenderer and VehicleRenderer
 *   - Subtle status overlays for paused state and perturbation cues
 */

import React, { useRef, useEffect } from 'react';
import { Vehicle } from '../engine/Vehicle';
import { RoadRenderer } from '../visualization/RoadRenderer';
import { VehicleRenderer } from '../visualization/VehicleRenderer';

export interface SimulationCanvasProps {
  vehicles: ReadonlyArray<Vehicle>;
  roadLength: number;
  v0: number;
  isRunning: boolean;
  highlightedVehicleId: number | null;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  vehicles,
  roadLength,
  v0,
  isRunning,
  highlightedVehicleId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render on every state update or resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive dimensions
    const rect = container.getBoundingClientRect();
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(300, Math.floor(rect.height));

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Clear background
    ctx.fillStyle = '#090d16'; // Deep slate space
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle coordinate grid dots
    drawSubtleGrid(ctx, width, height);

    // 3. Compute road geometry
    const cx = width / 2;
    const cy = height / 2;
    // Keep road comfortably within bounds with padding
    const minDim = Math.min(width, height);
    const radius = Math.max(90, minDim * 0.38);
    const laneWidth = Math.max(24, Math.min(38, radius * 0.16));

    // 4. Render circular road
    RoadRenderer.render(ctx, {
      cx,
      cy,
      radius,
      laneWidth,
      roadLength,
    });

    // 5. Render vehicles
    VehicleRenderer.renderAll(ctx, vehicles, {
      cx,
      cy,
      radius,
      laneWidth,
      roadLength,
      v0,
      highlightVehicleId: highlightedVehicleId,
    });

    // 6. Center hub overlay (displays vehicle count and road length)
    renderCenterHub(ctx, cx, cy, vehicles.length, roadLength);

    ctx.restore();
  }, [vehicles, roadLength, v0, isRunning, highlightedVehicleId]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '380px',
        overflow: 'hidden',
        borderRadius: '12px',
        background: '#090d16',
        border: '1px solid #1e293b',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Paused overlay badge */}
      {!isRunning && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#f59e0b',
            }}
          />
          Paused
        </div>
      )}

      {/* Perturbation notice badge */}
      {highlightedVehicleId !== null && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #0284c7',
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span>⚡ Perturbed Car #{highlightedVehicleId}</span>
          <span style={{ color: '#94a3b8' }}>·</span>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
            Tracking disturbance wave...
          </span>
        </div>
      )}
    </div>
  );
};

function drawSubtleGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(51, 65, 85, 0.25)';
  const step = 40;
  for (let x = step / 2; x < width; x += step) {
    for (let y = step / 2; y < height; y += step) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}

function renderCenterHub(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  vehicleCount: number,
  roadLength: number,
): void {
  ctx.save();

  // Subtle circular core
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Central readouts
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '700 16px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`${vehicleCount}`, cx, cy - 8);

  ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('VEHICLES', cx, cy + 8);

  ctx.font = '9px ui-monospace, monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(`${roadLength}m loop`, cx, cy + 22);

  ctx.restore();
}
