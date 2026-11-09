/**
 * Real-time traffic metrics panel.
 *
 * Displays:
 *   1. Average Speed (km/h and m/s)
 *   2. Vehicle Density (veh/km)
 *   3. Traffic Flow (veh/h via fundamental relation Q = ρ * v̄)
 *   4. Congested Vehicles (% below 30% v0)
 *   5. Elapsed Simulation Time (seconds and steps)
 *
 * All metrics are derived deterministically from the pure simulation engine state.
 */

import React from 'react';
import { TrafficMetrics } from '../engine/metrics';

export interface MetricsPanelProps {
  metrics: TrafficMetrics;
  time: number;
  stepCount: number;
  speedMultiplier: number;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  time,
  stepCount,
  speedMultiplier,
}) => {
  // Conversions for standard traffic engineering units
  const avgSpeedKmh = metrics.averageSpeed * 3.6;
  const densityPerKm = metrics.density * 1000;
  // Fundamental traffic flow equation: Q = ρ * v̄ (veh/km * km/h = veh/h)
  const flowVehPerHour = metrics.flow * 3600;
  const congestionPct = metrics.congestionFraction * 100;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        width: '100%',
      }}
    >
      {/* 1. Average Speed */}
      <MetricCard
        label="Average Speed"
        value={avgSpeedKmh.toFixed(1)}
        unit="km/h"
        subtext={`${metrics.averageSpeed.toFixed(1)} m/s`}
        accentColor="#38bdf8"
        tooltip="Mean speed of all vehicles on the circular highway"
      />

      {/* 2. Density */}
      <MetricCard
        label="Density"
        value={densityPerKm.toFixed(1)}
        unit="veh/km"
        subtext={`${metrics.density.toFixed(4)} veh/m`}
        accentColor="#818cf8"
        tooltip="Vehicle concentration per kilometer of roadway"
      />

      {/* 3. Traffic Flow */}
      <MetricCard
        label="Traffic Flow (Q)"
        value={Math.round(flowVehPerHour).toLocaleString()}
        unit="veh/h"
        subtext={`Q = ρ × v̄ (${metrics.flow.toFixed(2)} veh/s)`}
        accentColor="#34d399"
        tooltip="Fundamental relation: Q = Density × Average Speed"
      />

      {/* 4. Congested Vehicles */}
      <MetricCard
        label="Congested"
        value={congestionPct.toFixed(1)}
        unit="%"
        subtext="Vehicles < 30% v₀"
        accentColor={congestionPct > 20 ? '#ef4444' : '#fbbf24'}
        tooltip="Percentage of drivers crawling below 30% of desired speed"
      />

      {/* 5. Elapsed Simulation Time */}
      <MetricCard
        label="Simulated Time"
        value={formatTime(time)}
        unit=""
        subtext={`Step ${stepCount} · ${speedMultiplier}x speed`}
        accentColor="#a78bfa"
        tooltip="Elapsed time in the deterministic physics simulation"
      />
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  subtext: string;
  accentColor: string;
  tooltip: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  accentColor,
  tooltip,
}) => {
  return (
    <div
      title={tooltip}
      style={{
        background: '#131c2e',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: accentColor,
        }}
      />

      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#94a3b8',
          marginBottom: '6px',
        }}
      >
        {label}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
          margin: '2px 0',
        }}
      >
        <span
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#f8fafc',
            fontVariantNumeric: 'tabular-nums',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748b',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: '11px',
          color: '#64748b',
          marginTop: '4px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {subtext}
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  const paddedSecs = parseFloat(secs) < 10 ? `0${secs}` : secs;
  return `${mins}:${paddedSecs}`;
}
