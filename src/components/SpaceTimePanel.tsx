/**
 * Dedicated Space-Time Diagram (Kessel Plot) Analytics Panel.
 *
 * Renders the spatiotemporal evolution of traffic on a responsive canvas,
 * showing how stop-and-go congestion waves propagate backward against the flow of traffic.
 */

import React, { useRef, useState, useEffect } from 'react';
import { SpaceTimeSlice } from '../analytics/SpaceTimeGrid';
import { SpaceTimePlot, SpaceTimeViewMode } from '../visualization/SpaceTimePlot';
import { SPEED_PALETTE } from '../visualization/colorScale';

export interface SpaceTimePanelProps {
  slices: ReadonlyArray<SpaceTimeSlice>;
  roadLength: number;
  v0: number;
  onTimeWindowChange?: (seconds: number) => void;
  selectedWindow?: number;
}

export const SpaceTimePanel: React.FC<SpaceTimePanelProps> = ({
  slices,
  roadLength,
  v0,
  onTimeWindowChange,
  selectedWindow = 60,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<SpaceTimeViewMode>('trajectories');
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Monitor container size changes even when simulation is paused
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(260, Math.floor(rect.height));
      setDimensions(prev => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
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

  // Draw space-time plot on state updates and resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const width = dimensions.width || Math.max(300, Math.floor(rect.width));
    const height = dimensions.height || Math.max(260, Math.floor(rect.height));

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    SpaceTimePlot.render(ctx, slices, {
      width,
      height,
      roadLength,
      v0,
      mode,
    });

    ctx.restore();
  }, [slices, roadLength, v0, mode, dimensions]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      {/* Top Header & View Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '12px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🌌</span> Space-Time Diagram (Wave Propagation)
          </h2>
          <p
            style={{
              margin: '2px 0 0 0',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            Position on horizontal axis (0–1000m) vs. Simulated Time on vertical axis. Reveals emergent backward shockwaves.
          </p>
        </div>

        {/* View Controls & Time Window */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {/* Mode Selector */}
          <div
            style={{
              display: 'flex',
              background: '#131c2e',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid #334155',
            }}
          >
            <button
              onClick={() => setMode('trajectories')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                background: mode === 'trajectories' ? '#3b82f6' : 'transparent',
                color: mode === 'trajectories' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Vehicle Trajectories (Worldlines)
            </button>
            <button
              onClick={() => setMode('bins')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: 'none',
                background: mode === 'bins' ? '#3b82f6' : 'transparent',
                color: mode === 'bins' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Spatial Bins (Occupancy)
            </button>
          </div>

          {/* Time Window Buttons */}
          {onTimeWindowChange && (
            <div
              style={{
                display: 'flex',
                background: '#131c2e',
                borderRadius: '6px',
                padding: '2px',
                border: '1px solid #334155',
              }}
            >
              {[30, 60, 120].map((win) => (
                <button
                  key={win}
                  onClick={() => onTimeWindowChange(win)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: selectedWindow === win ? '#0284c7' : 'transparent',
                    color: selectedWindow === win ? '#ffffff' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {win}s
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas Plot Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '380px',
          minHeight: '280px',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#090d16',
          border: '1px solid #1e293b',
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
      </div>

      {/* Scientific Legend & Reading Guide */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
          background: '#131c2e',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '11px',
          color: '#94a3b8',
          border: '1px solid #1e293b',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            📐 How to Read Trajectory Worldlines
          </div>
          <div>
            • <strong>Forward slope (dx/dt &gt; 0):</strong> Individual vehicles moving forward along the highway.
            <br />
            • <strong>Vertical lines (dx/dt ≈ 0):</strong> Vehicles brought to a standstill in a traffic jam.
            <br />
            • <strong>Backward diagonal band (slope &lt; 0):</strong> The emergent stop-and-go wave propagating upstream against traffic (typically at ~15 km/h).
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            🎨 Speed Palette &amp; Spatial Sampling
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: SPEED_PALETTE.freeFlow }} />
              Free flow (&gt; 75% v₀)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: SPEED_PALETTE.slowing }} />
              Slowing
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: SPEED_PALETTE.congested }} />
              Congested
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#0f172a', border: '1px solid #334155' }} />
              Empty road (no vehicle)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
