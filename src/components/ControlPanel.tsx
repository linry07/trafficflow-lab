/**
 * Control panel for TrafficFlow Lab.
 *
 * Provides:
 *   - Always visible Play / Pause / Reset / Perturb controls
 *   - Always visible Simulation Speed (1x, 2x, 5x) and Presets dropdown
 *   - Collapsible Driving Behavior (Desired Speed v0, Following Time T) — Expanded by default
 *   - Collapsible Roadway Configuration (Vehicle Count, Seed, Apply Changes) — Collapsed by default
 *   - Collapsible Speed Color Legend — Collapsed by default
 *
 * Preserves all numerical inputs, validation, live updates, and reset-detection.
 */

import React, { useState } from 'react';
import { SimulationConfig, PresetKey, SIMULATION_PRESETS } from '../engine/SimulationConfig';
import { SPEED_PALETTE } from '../visualization/colorScale';

export interface ControlPanelProps {
  config: SimulationConfig;
  pendingConfig: SimulationConfig;
  isResetNeeded: boolean;
  isRunning: boolean;
  speedMultiplier: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onSetSpeed: (speed: number) => void;
  onApplyPreset: (preset: PresetKey) => void;
  onUpdateLiveParam: (key: 'v0' | 'T', value: number) => void;
  onSetPendingVehicleCount: (count: number) => void;
  onSetPendingSeed: (seed: number) => void;
  onApplyPendingChanges: () => void;
  onPerturbTraffic: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  pendingConfig,
  isResetNeeded,
  isRunning,
  speedMultiplier,
  onTogglePlay,
  onReset,
  onSetSpeed,
  onApplyPreset,
  onUpdateLiveParam,
  onSetPendingVehicleCount,
  onSetPendingSeed,
  onApplyPendingChanges,
  onPerturbTraffic,
}) => {
  // Collapsible section states (collapsing sections does not alter parameter values)
  const [isDrivingExpanded, setIsDrivingExpanded] = useState<boolean>(true);
  const [isRoadwayExpanded, setIsRoadwayExpanded] = useState<boolean>(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState<boolean>(false);

  // Auto-expand Roadway section if changes are pending and need re-initialization
  const showRoadwayOpen = isRoadwayExpanded || isResetNeeded;

  // Convert m/s to km/h for intuitive user display (33.3 m/s = 120 km/h)
  const currentV0Kmh = Math.round(config.idm.v0 * 3.6);

  return (
    <div className="control-sidebar">
      {/* 1. Primary Playback Bar (Always Visible) */}
      <div className="control-playback-row">
        <button
          onClick={onTogglePlay}
          className={`btn-primary-play ${isRunning ? 'running' : 'paused'}`}
          title={isRunning ? 'Pause simulation (Space)' : 'Start simulation (Space)'}
        >
          <span aria-hidden="true">{isRunning ? '⏸' : '▶'}</span>
          <span>{isRunning ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={onReset}
          className="btn-control-secondary"
          title="Reset vehicles to initial equilibrium spacing"
        >
          <span aria-hidden="true">↺</span>
          <span>Reset</span>
        </button>

        <button
          onClick={onPerturbTraffic}
          className="btn-perturb"
          title="Instantly reduces the speed of a vehicle by 75% to observe shockwave formation"
        >
          <span aria-hidden="true">⚡</span>
          <span>Perturb</span>
        </button>
      </div>

      {/* 2. Simulation Speed & Presets Bar (Always Visible) */}
      <div className="control-speed-preset-grid">
        {/* Speed Selector */}
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#94a3b8',
              marginBottom: '4px',
            }}
          >
            Speed
          </div>
          <div className="speed-selector-group">
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => onSetSpeed(speed)}
                className={`speed-selector-btn ${
                  speedMultiplier === speed ? 'active' : 'inactive'
                }`}
                title={`Run at ${speed}x simulated speed`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Presets Dropdown */}
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#94a3b8',
              marginBottom: '4px',
            }}
          >
            Scenario Presets
          </div>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onApplyPreset(e.target.value as PresetKey);
                e.target.value = '';
              }
            }}
            className="preset-dropdown"
          >
            <option value="" disabled>
              Load Scenario Preset...
            </option>
            {Object.entries(SIMULATION_PRESETS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Collapsible Section: Driving Behavior (Expanded by default) */}
      <div className="collapsible-card">
        <button
          type="button"
          onClick={() => setIsDrivingExpanded(!isDrivingExpanded)}
          className="collapsible-trigger-btn"
          aria-expanded={isDrivingExpanded}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: '#38bdf8' }}>
              {isDrivingExpanded ? '▼' : '▶'}
            </span>
            <span>Driving Behavior</span>
          </div>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '1px 6px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              textTransform: 'uppercase',
            }}
          >
            ⚡ Live
          </span>
        </button>

        {isDrivingExpanded && (
          <div className="collapsible-content">
            {/* Desired Speed Slider */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#cbd5e1',
                  marginBottom: '2px',
                }}
              >
                <span>Desired Speed (v₀)</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#38bdf8',
                  }}
                >
                  {currentV0Kmh} km/h{' '}
                  <span style={{ color: '#64748b', fontWeight: 400, fontSize: '10px' }}>
                    ({config.idm.v0.toFixed(1)} m/s)
                  </span>
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="160"
                step="5"
                value={currentV0Kmh}
                onChange={(e) => {
                  const kmh = parseFloat(e.target.value);
                  onUpdateLiveParam('v0', kmh / 3.6);
                }}
                style={{ width: '100%', cursor: 'pointer' }}
                aria-label="Desired Speed v0"
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '9px',
                  color: '#64748b',
                }}
              >
                <span>60 km/h</span>
                <span>160 km/h</span>
              </div>
            </div>

            {/* Time Headway Slider */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#cbd5e1',
                  marginBottom: '2px',
                }}
              >
                <span>Time Headway (T)</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#38bdf8',
                  }}
                >
                  {config.idm.T.toFixed(1)} s
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.1"
                value={config.idm.T}
                onChange={(e) => onUpdateLiveParam('T', parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
                aria-label="Following Time Headway T"
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '9px',
                  color: '#64748b',
                }}
              >
                <span>0.6s (Aggressive)</span>
                <span>3.0s (Cautious)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Collapsible Section: Roadway Configuration (Collapsed by default, auto-opens when changes pending) */}
      <div
        className="collapsible-card"
        style={{
          borderColor: isResetNeeded ? '#f59e0b' : undefined,
        }}
      >
        <button
          type="button"
          onClick={() => setIsRoadwayExpanded(!showRoadwayOpen)}
          className="collapsible-trigger-btn"
          aria-expanded={showRoadwayOpen}
          style={{
            background: isResetNeeded ? 'rgba(245, 158, 11, 0.15)' : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: isResetNeeded ? '#fbbf24' : '#94a3b8' }}>
              {showRoadwayOpen ? '▼' : '▶'}
            </span>
            <span style={{ color: isResetNeeded ? '#fbbf24' : undefined }}>
              Roadway &amp; Fleet
            </span>
          </div>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: isResetNeeded ? '#fbbf24' : '#64748b',
              background: isResetNeeded
                ? 'rgba(251, 191, 36, 0.2)'
                : 'rgba(100, 116, 139, 0.12)',
              padding: '1px 6px',
              borderRadius: '8px',
              border: isResetNeeded
                ? '1px solid rgba(251, 191, 36, 0.4)'
                : '1px solid #334155',
              textTransform: 'uppercase',
            }}
          >
            {isResetNeeded ? '⚠️ Apply Needed' : '🔄 Reset'}
          </span>
        </button>

        {showRoadwayOpen && (
          <div className="collapsible-content">
            {/* Vehicle Count Slider */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#cbd5e1',
                  marginBottom: '2px',
                }}
              >
                <span>Vehicle Count (N)</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color:
                      pendingConfig.vehicleCount !== config.vehicleCount
                        ? '#fbbf24'
                        : '#f8fafc',
                  }}
                >
                  {pendingConfig.vehicleCount} cars
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="1"
                value={pendingConfig.vehicleCount}
                onChange={(e) =>
                  onSetPendingVehicleCount(parseInt(e.target.value, 10))
                }
                style={{ width: '100%', cursor: 'pointer' }}
                aria-label="Vehicle Count N"
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '9px',
                  color: '#64748b',
                }}
              >
                <span>5 (Sparse)</span>
                <span>80 (Heavy)</span>
              </div>
            </div>

            {/* Random Seed & Road Length Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#94a3b8',
                    marginBottom: '2px',
                  }}
                >
                  Random Seed
                </label>
                <input
                  type="number"
                  value={pendingConfig.seed}
                  onChange={(e) =>
                    onSetPendingSeed(parseInt(e.target.value, 10) || 0)
                  }
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    background: '#1e293b',
                    border:
                      pendingConfig.seed !== config.seed
                        ? '1px solid #fbbf24'
                        : '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  aria-label="Random PRNG Seed"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    color: '#94a3b8',
                    marginBottom: '2px',
                  }}
                >
                  Road Length
                </label>
                <div
                  style={{
                    padding: '4px 6px',
                    background: '#131c2e',
                    border: '1px solid #1e293b',
                    borderRadius: '4px',
                    color: '#94a3b8',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  {config.roadLength} m
                </div>
              </div>
            </div>

            {/* Apply Changes Button (shown prominently when reset is needed) */}
            {isResetNeeded && (
              <button
                type="button"
                onClick={onApplyPendingChanges}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#f59e0b',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)',
                }}
              >
                <span>🔄</span>
                <span>Apply &amp; Re-initialize Simulation</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Collapsible Section: Speed Legend (Collapsed by default) */}
      <div className="collapsible-card">
        <button
          type="button"
          onClick={() => setIsLegendExpanded(!isLegendExpanded)}
          className="collapsible-trigger-btn"
          aria-expanded={isLegendExpanded}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>
              {isLegendExpanded ? '▼' : '▶'}
            </span>
            <span>Speed Legend</span>
          </div>
          <span style={{ fontSize: '10px', color: '#64748b' }}>🎨</span>
        </button>

        {isLegendExpanded && (
          <div className="collapsible-content">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                fontSize: '11px',
                color: '#cbd5e1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: SPEED_PALETTE.freeFlow,
                    flexShrink: 0,
                  }}
                />
                <span>Free Flow (&gt; 75% v₀)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: SPEED_PALETTE.slowing,
                    flexShrink: 0,
                  }}
                />
                <span>Slowing (30% – 75% v₀)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: SPEED_PALETTE.congested,
                    flexShrink: 0,
                  }}
                />
                <span>Congested / Stopped (&lt; 30% v₀)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
