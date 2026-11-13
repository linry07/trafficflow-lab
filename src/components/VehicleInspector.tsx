/**
 * Interactive Vehicle Inspector Panel.
 *
 * Displays live physical telemetry and deterministic IDM decision explanations
 * for a user-selected vehicle on the circular highway, plus recent driving activity history.
 */

import React, { useState } from 'react';
import { VehicleDiagnostics, DrivingState } from '../engine/VehicleDiagnostics';
import { VehicleActivityEvent } from '../engine/VehicleActivityTracker';

export interface VehicleInspectorProps {
  diagnostics: VehicleDiagnostics;
  activityHistory: ReadonlyArray<VehicleActivityEvent>;
  onClose: () => void;
  isRunning: boolean;
}

export const VehicleInspector: React.FC<VehicleInspectorProps> = ({
  diagnostics,
  activityHistory,
  onClose,
  isRunning,
}) => {
  // "Freeze History" toggle allows users to examine past activity without pausing physics
  const [isHistoryFrozen, setIsHistoryFrozen] = useState<boolean>(false);
  const [frozenHistorySnapshot, setFrozenHistorySnapshot] = useState<
    ReadonlyArray<VehicleActivityEvent>
  >(activityHistory);

  const toggleFreezeHistory = () => {
    if (!isHistoryFrozen) {
      setFrozenHistorySnapshot([...activityHistory]);
      setIsHistoryFrozen(true);
    } else {
      setIsHistoryFrozen(false);
    }
  };

  // Determine which activity list to show
  const displayedHistory = isHistoryFrozen
    ? frozenHistorySnapshot
    : activityHistory;

  const stateBadgeColor = getStateColor(diagnostics.drivingState);

  return (
    <div className="vehicle-inspector-card">
      {/* 1. Header: Vehicle ID, Driving State, and Close Button */}
      <div className="inspector-header">
        <div className="inspector-title-group">
          <span className="inspector-car-icon">🚗</span>
          <span className="inspector-car-title">
            Vehicle #{diagnostics.vehicleId}
          </span>
          <span
            className="inspector-state-pill"
            style={{
              backgroundColor: stateBadgeColor.bg,
              color: stateBadgeColor.text,
              borderColor: stateBadgeColor.border,
            }}
          >
            {diagnostics.drivingState}
          </span>
        </div>
        <button
          onClick={onClose}
          className="inspector-close-btn"
          aria-label="Close inspector"
          title="Deselect vehicle (Esc or click empty road)"
        >
          ✕
        </button>
      </div>

      {/* 2. Live Telemetry Metrics Grid */}
      <div className="inspector-grid">
        <div className="inspector-metric-item">
          <span className="inspector-metric-label">Current Speed</span>
          <span className="inspector-metric-val">
            {diagnostics.speedKmh.toFixed(1)}{' '}
            <small className="inspector-unit">km/h</small>
          </span>
          <span className="inspector-metric-sub">
            {(diagnostics.speedMs).toFixed(1)} m/s
          </span>
        </div>

        <div className="inspector-metric-item">
          <span className="inspector-metric-label">Desired Speed (v₀)</span>
          <span className="inspector-metric-val">
            {diagnostics.desiredSpeedKmh.toFixed(0)}{' '}
            <small className="inspector-unit">km/h</small>
          </span>
          <span className="inspector-metric-sub">
            Target speed on open road
          </span>
        </div>

        <div className="inspector-metric-item">
          <span className="inspector-metric-label">Acceleration</span>
          <span
            className="inspector-metric-val"
            style={{
              color:
                diagnostics.acceleration > 0.05
                  ? '#4ade80'
                  : diagnostics.acceleration < -0.05
                    ? '#f87171'
                    : '#cbd5e1',
            }}
          >
            {diagnostics.acceleration >= 0 ? '+' : ''}
            {diagnostics.acceleration.toFixed(2)}{' '}
            <small className="inspector-unit">m/s²</small>
          </span>
          <span className="inspector-metric-sub">
            Net IDM: {diagnostics.idmAcceleration.toFixed(2)} m/s²
          </span>
        </div>

        <div className="inspector-metric-item">
          <span className="inspector-metric-label">Following Gap</span>
          <span className="inspector-metric-val">
            {diagnostics.isSingleVehicle
              ? 'Open loop'
              : `${diagnostics.gap.toFixed(1)} `}
            {!diagnostics.isSingleVehicle && (
              <small className="inspector-unit">m</small>
            )}
          </span>
          <span className="inspector-metric-sub">
            {diagnostics.isSingleVehicle
              ? 'No vehicle ahead'
              : `To Car #${diagnostics.leaderId} (bumper-to-bumper)`}
          </span>
        </div>

        <div className="inspector-metric-item">
          <span className="inspector-metric-label">Desired Gap (s*)</span>
          <span className="inspector-metric-val">
            {diagnostics.desiredGap.toFixed(1)}{' '}
            <small className="inspector-unit">m</small>
          </span>
          <span className="inspector-metric-sub">
            Safe distance required by IDM
          </span>
        </div>

        <div className="inspector-metric-item">
          <span className="inspector-metric-label">Relative Speed (Δv)</span>
          <span
            className="inspector-metric-val"
            style={{
              color:
                diagnostics.relativeSpeedKmh > 1.0
                  ? '#f87171'
                  : diagnostics.relativeSpeedKmh < -1.0
                    ? '#38bdf8'
                    : '#cbd5e1',
            }}
          >
            {diagnostics.isSingleVehicle
              ? '—'
              : `${diagnostics.relativeSpeedKmh >= 0 ? '+' : ''}${diagnostics.relativeSpeedKmh.toFixed(1)} `}
            {!diagnostics.isSingleVehicle && (
              <small className="inspector-unit">km/h</small>
            )}
          </span>
          <span className="inspector-metric-sub">
            {diagnostics.isSingleVehicle
              ? 'Single vehicle'
              : diagnostics.relativeSpeedKmh > 0.5
                ? 'Closing in on leader'
                : diagnostics.relativeSpeedKmh < -0.5
                  ? 'Leader pulling away'
                  : 'Speed matched'}
          </span>
        </div>
      </div>

      {/* 3. Physical Force Decomposition (Free-Road vs Interaction Deceleration) */}
      <div className="inspector-force-breakdown">
        <div className="force-breakdown-header">
          <span>Physical IDM Acceleration Components:</span>
        </div>
        <div className="force-breakdown-row">
          <div className="force-component free-road">
            <span className="force-name">Free-road drive:</span>
            <span className="force-num">
              +{Math.max(0, diagnostics.freeRoadTerm).toFixed(2)} m/s²
            </span>
          </div>
          <div className="force-component interaction">
            <span className="force-name">Interaction brake:</span>
            <span className="force-num">
              -{diagnostics.interactionTerm.toFixed(2)} m/s²
            </span>
          </div>
        </div>
      </div>

      {/* 4. Grounded Driver Decision Explanation */}
      <div className="inspector-decision-box">
        <div className="decision-box-title">
          <span>⚡ Driving Decision Explanation</span>
          {!isRunning && <span className="decision-paused-tag">(Paused)</span>}
        </div>
        <p className="decision-explanation-text">{diagnostics.explanation}</p>
      </div>

      {/* 5. Recent Driving Activity History */}
      <div className="inspector-activity-section">
        <div className="activity-header-row">
          <span className="activity-header-title">
            Recent Activity ({displayedHistory.length})
          </span>
          <button
            onClick={toggleFreezeHistory}
            className={`btn-freeze-history ${isHistoryFrozen ? 'frozen' : ''}`}
            title={
              isHistoryFrozen
                ? 'Unfreeze to resume live event tracking'
                : 'Freeze history list so you can inspect past events while simulation continues'
            }
          >
            {isHistoryFrozen ? '❄ History Frozen' : 'Live Tracking'}
          </button>
        </div>

        <div className="activity-event-list">
          {displayedHistory.length === 0 ? (
            <div className="activity-empty-state">
              No state transitions recorded yet.
            </div>
          ) : (
            displayedHistory.map((ev) => {
              const evColors = getStateColor(ev.state);
              return (
                <div key={ev.id} className="activity-event-item">
                  <div className="activity-event-top">
                    <span className="activity-timestamp">
                      t = {ev.timestamp.toFixed(1)}s
                    </span>
                    <span
                      className="activity-state-chip"
                      style={{
                        backgroundColor: evColors.bg,
                        color: evColors.text,
                        borderColor: evColors.border,
                      }}
                    >
                      {ev.eventType === 'hard_braking'
                        ? 'Hard Braking'
                        : ev.state}
                    </span>
                    <span className="activity-speed-metric">
                      {ev.speedKmh.toFixed(0)} km/h
                    </span>
                  </div>
                  <div className="activity-summary-text">{ev.summary}</div>
                  <div className="activity-explanation-text">
                    {ev.explanation}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

function getStateColor(state: DrivingState): {
  bg: string;
  text: string;
  border: string;
} {
  switch (state) {
    case 'Accelerating':
      return {
        bg: 'rgba(34, 197, 94, 0.15)',
        text: '#4ade80',
        border: 'rgba(34, 197, 94, 0.35)',
      };
    case 'Braking':
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        text: '#f87171',
        border: 'rgba(239, 68, 68, 0.35)',
      };
    case 'Cruising':
    default:
      return {
        bg: 'rgba(56, 189, 248, 0.15)',
        text: '#38bdf8',
        border: 'rgba(56, 189, 248, 0.35)',
      };
  }
}
