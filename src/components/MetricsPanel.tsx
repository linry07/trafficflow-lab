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
    <div className="metrics-row">
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
    <div className="metric-card-compact" title={tooltip}>
      {/* Top accent bar */}
      <div
        className="metric-card-accent-bar"
        style={{ background: accentColor }}
      />

      <div className="metric-card-header">
        <span>{label}</span>
      </div>

      <div className="metric-card-value-group">
        <span className="metric-card-value">{value}</span>
        {unit && <span className="metric-card-unit">{unit}</span>}
      </div>

      <div className="metric-card-footer">{subtext}</div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  const paddedSecs = parseFloat(secs) < 10 ? `0${secs}` : secs;
  return `${mins}:${paddedSecs}`;
}
