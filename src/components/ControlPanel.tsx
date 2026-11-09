/**
 * Control panel for TrafficFlow Lab.
 *
 * Provides:
 *   - Play / Pause / Reset controls
 *   - Simulation Speed (1x, 2x, 5x)
 *   - Perturb Traffic trigger button
 *   - Presets (Stable vs Unstable)
 *   - Live Parameters (Desired Speed v0, Following Time T)
 *   - Structural Parameters (Vehicle Count, Seed) with Apply & Reset banner
 *   - Visual Color Legend
 */

import React from 'react';
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
  // Convert m/s to km/h for intuitive user display (33.3 m/s = 120 km/h)
  const currentV0Kmh = Math.round(config.idm.v0 * 3.6);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '20px',
        color: '#f8fafc',
      }}
    >
      {/* 1. Primary Playback Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <button
          onClick={onTogglePlay}
          style={{
            flex: '1 1 auto',
            minWidth: '120px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            background: isRunning ? '#ef4444' : '#22c55e',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isRunning
              ? '0 2px 8px rgba(239, 68, 68, 0.3)'
              : '0 2px 8px rgba(34, 197, 94, 0.3)',
            transition: 'all 0.15s ease',
          }}
        >
          {isRunning ? (
            <>
              <span style={{ fontSize: '12px' }}>⏸</span> Pause
            </>
          ) : (
            <>
              <span style={{ fontSize: '12px' }}>▶</span> Play
            </>
          )}
        </button>

        <button
          onClick={onReset}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#cbd5e1',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>↺</span> Reset
        </button>

        <button
          onClick={onPerturbTraffic}
          title="Instantly reduces the speed of a vehicle to observe whether the shockwave dissipates or grows into a phantom jam"
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #0284c7',
            background: '#0369a1',
            color: '#f0f9ff',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
          }}
        >
          <span>⚡</span> Perturb Traffic
        </button>
      </div>

      {/* 2. Simulation Speed & Presets Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        {/* Speed Selector */}
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#94a3b8',
              marginBottom: '6px',
            }}
          >
            Simulation Speed
          </div>
          <div
            style={{
              display: 'flex',
              background: '#1e293b',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid #334155',
            }}
          >
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => onSetSpeed(speed)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: '4px',
                  border: 'none',
                  background:
                    speedMultiplier === speed ? '#3b82f6' : 'transparent',
                  color: speedMultiplier === speed ? '#ffffff' : '#94a3b8',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#94a3b8',
              marginBottom: '6px',
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
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="" disabled>Load Scenario Preset...</option>
            {Object.entries(SIMULATION_PRESETS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ height: '1px', background: '#1e293b' }} />

      {/* 3. Live Parameters (⚡ Immediate update) */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#f8fafc',
            }}
          >
            Driving Behavior
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.1)',
              padding: '2px 8px',
              borderRadius: '10px',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            ⚡ Live Updates
          </span>
        </div>

        {/* Desired Speed Slider */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '4px',
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
              <span style={{ color: '#64748b', fontWeight: 400 }}>
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
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
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
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '4px',
            }}
          >
            <span>Following Time Headway (T)</span>
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
            onChange={(e) =>
              onUpdateLiveParam('T', parseFloat(e.target.value))
            }
            style={{ width: '100%', cursor: 'pointer' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#64748b',
            }}
          >
            <span>0.6s (Aggressive)</span>
            <span>3.0s (Cautious)</span>
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: '#1e293b' }} />

      {/* 4. Structural Parameters (🔄 Requires Reset) */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#f8fafc',
            }}
          >
            Roadway Configuration
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: isResetNeeded ? '#fbbf24' : '#64748b',
              background: isResetNeeded
                ? 'rgba(251, 191, 36, 0.15)'
                : 'rgba(100, 116, 139, 0.1)',
              padding: '2px 8px',
              borderRadius: '10px',
              border: isResetNeeded
                ? '1px solid rgba(251, 191, 36, 0.3)'
                : '1px solid #334155',
            }}
          >
            {isResetNeeded ? '⚠️ Reset Needed' : '🔄 Requires Reset'}
          </span>
        </div>

        {/* Vehicle Count Slider */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#cbd5e1',
              marginBottom: '4px',
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
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#64748b',
            }}
          >
            <span>5 (Sparse)</span>
            <span>80 (Heavy)</span>
          </div>
        </div>

        {/* Random Seed Input & Road Length */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: isResetNeeded ? '12px' : '0',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: '#94a3b8',
                marginBottom: '4px',
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
                padding: '6px 8px',
                background: '#1e293b',
                border:
                  pendingConfig.seed !== config.seed
                    ? '1px solid #fbbf24'
                    : '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: '#94a3b8',
                marginBottom: '4px',
              }}
            >
              Road Length
            </label>
            <div
              style={{
                padding: '6px 8px',
                background: '#131c2e',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                color: '#94a3b8',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              {config.roadLength} m
            </div>
          </div>
        </div>

        {/* Reset banner when pending changes exist */}
        {isResetNeeded && (
          <button
            onClick={onApplyPendingChanges}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
              marginTop: '10px',
            }}
          >
            <span>🔄</span> Apply & Re-initialize Simulation
          </button>
        )}
      </div>

      <div style={{ height: '1px', background: '#1e293b' }} />

      {/* 5. Speed Color Legend */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#94a3b8',
            marginBottom: '8px',
          }}
        >
          Vehicle Speed Legend
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
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
              }}
            />
            <span>Congested / Stopped (&lt; 30% v₀)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
