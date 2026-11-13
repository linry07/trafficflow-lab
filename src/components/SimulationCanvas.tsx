/**
 * Responsive HTML5 Canvas component for the circular highway traffic simulation.
 *
 * Features:
 *   - Interactive vehicle inspection with hit detection on click/hover
 *   - High-DPI / Retina display scaling via window.devicePixelRatio
 *   - Continuous responsive resizing via ResizeObserver
 *   - Visual relationship highlights (selected car, leader, gap arc)
 *   - Compact, responsive VehicleInspector overlay & drawer
 *   - Keyboard navigation (Escape to deselect)
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Vehicle } from '../engine/Vehicle';
import { RoadRenderer } from '../visualization/RoadRenderer';
import { VehicleRenderer } from '../visualization/VehicleRenderer';
import { findVehicleAtCanvasCoord } from '../visualization/HitDetection';
import { VehicleDiagnostics } from '../engine/VehicleDiagnostics';
import { VehicleActivityEvent } from '../engine/VehicleActivityTracker';
import { VehicleInspector } from './VehicleInspector';

export interface SimulationCanvasProps {
  vehicles: ReadonlyArray<Vehicle>;
  roadLength: number;
  v0: number;
  isRunning: boolean;
  highlightedVehicleId: number | null;
  selectedVehicleId: number | null;
  onSelectVehicle: (id: number | null) => void;
  selectedVehicleDiagnostics: VehicleDiagnostics | null;
  selectedVehicleActivity: ReadonlyArray<VehicleActivityEvent>;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  vehicles,
  roadLength,
  v0,
  isRunning,
  highlightedVehicleId,
  selectedVehicleId,
  onSelectVehicle,
  selectedVehicleDiagnostics,
  selectedVehicleActivity,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [isHoveringVehicle, setIsHoveringVehicle] = useState<boolean>(false);

  // Monitor container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(300, Math.floor(rect.height));
      setDimensions((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h },
      );
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(container);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  // Keyboard shortcut: Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelectVehicle(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectVehicle]);

  // Compute road geometry parameters
  const getRoadGeometry = useCallback(() => {
    const container = containerRef.current;
    const rect = container ? container.getBoundingClientRect() : null;
    const width = dimensions.width || (rect ? Math.max(300, Math.floor(rect.width)) : 400);
    const height = dimensions.height || (rect ? Math.max(300, Math.floor(rect.height)) : 430);

    const cx = width / 2;
    const cy = height / 2;
    const minDim = Math.min(width, height);
    const targetDiameter = Math.min(390, Math.max(240, minDim * 0.84));
    const radius = targetDiameter / 2;
    const laneWidth = Math.max(20, Math.min(28, radius * 0.14));

    return { width, height, cx, cy, radius, laneWidth };
  }, [dimensions]);

  // Canvas click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { cx, cy, radius, laneWidth } = getRoadGeometry();

    const hitVehicle = findVehicleAtCanvasCoord(clickX, clickY, vehicles, {
      cx,
      cy,
      radius,
      laneWidth,
      roadLength,
      hitPadding: 8,
    });

    if (hitVehicle) {
      onSelectVehicle(hitVehicle.id);
    } else {
      // Clicking empty space deselects
      onSelectVehicle(null);
    }
  };

  // Canvas mouse move handler for hover indication
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { cx, cy, radius, laneWidth } = getRoadGeometry();

    const hitVehicle = findVehicleAtCanvasCoord(clickX, clickY, vehicles, {
      cx,
      cy,
      radius,
      laneWidth,
      roadLength,
      hitPadding: 6,
    });

    setIsHoveringVehicle(hitVehicle !== null);
  };

  const handleCanvasMouseLeave = () => {
    setIsHoveringVehicle(false);
  };

  // Render on every state update or resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, cx, cy, radius, laneWidth } = getRoadGeometry();

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

    // 3. Render circular road
    RoadRenderer.render(ctx, {
      cx,
      cy,
      radius,
      laneWidth,
      roadLength,
    });

    // 4. Render vehicles and relationship highlights
    const leaderId =
      selectedVehicleDiagnostics && !selectedVehicleDiagnostics.isSingleVehicle
        ? selectedVehicleDiagnostics.leaderId
        : null;
    const followingGap = selectedVehicleDiagnostics
      ? selectedVehicleDiagnostics.gap
      : null;

    VehicleRenderer.renderAll(ctx, vehicles, {
      cx,
      cy,
      radius,
      laneWidth,
      roadLength,
      v0,
      highlightVehicleId: highlightedVehicleId,
      selectedVehicleId,
      leaderVehicleId: leaderId,
      followingGap,
    });

    // 5. Center hub overlay (displays vehicle count and road length)
    renderCenterHub(ctx, cx, cy, vehicles.length, roadLength);

    ctx.restore();
  }, [
    vehicles,
    roadLength,
    v0,
    isRunning,
    highlightedVehicleId,
    selectedVehicleId,
    selectedVehicleDiagnostics,
    getRoadGeometry,
  ]);

  return (
    <div ref={containerRef} className="simulation-viewport">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: isHoveringVehicle ? 'pointer' : 'default',
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
            zIndex: 10,
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
            zIndex: 10,
          }}
        >
          <span>⚡ Perturbed Car #{highlightedVehicleId}</span>
          <span style={{ color: '#94a3b8' }}>·</span>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
            Tracking disturbance wave...
          </span>
        </div>
      )}

      {/* Subtle selection prompt when no vehicle is selected */}
      {selectedVehicleId === null && highlightedVehicleId === null && (
        <div className="inspector-hint-badge">
          <span className="hint-icon">🔍</span>
          <span>Click any vehicle to inspect its behavior &amp; decisions</span>
        </div>
      )}

      {/* Vehicle Inspector Overlay Drawer */}
      {selectedVehicleId !== null && selectedVehicleDiagnostics && (
        <VehicleInspector
          diagnostics={selectedVehicleDiagnostics}
          activityHistory={selectedVehicleActivity}
          onClose={() => onSelectVehicle(null)}
          isRunning={isRunning}
        />
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
