/**
 * ExperimentPanel — Scientific interface for the Automatic Experiment Discovery Engine.
 *
 * Provides:
 *   - Automated density sweep configuration (min/max vehicles, step, trials per count, duration)
 *   - Worker-based execution with live progress bar and cancellation
 *   - Jam Probability vs Density curve with 95% Wilson Confidence Intervals
 *   - Macroscopic Fundamental Diagram (Speed & Flow vs Density)
 *   - Estimated Critical Density Transition Window callout
 *   - Detailed trials table with one-click "Replay Scenario" button
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import {
  DensityExperimentConfig,
  DensityExperimentResults,
  ExperimentProgress,
  TrialResult,
} from '../experiments/ExperimentRunner';
import {
  exportExperimentTrialsCSV,
  exportExperimentSummaryCSV,
  exportExperimentJSON,
  downloadFile,
} from '../analytics';

export interface ExperimentPanelProps {
  isRunning: boolean;
  progress: ExperimentProgress | null;
  results: DensityExperimentResults | null;
  error: string | null;
  onStartExperiment: (config: DensityExperimentConfig) => void;
  onCancelExperiment: () => void;
  onReplayTrial: (trial: TrialResult) => void;
}

export const ExperimentPanel: React.FC<ExperimentPanelProps> = ({
  isRunning,
  progress,
  results,
  error,
  onStartExperiment,
  onCancelExperiment,
  onReplayTrial,
}) => {
  // Config state with sensible defaults for quick laptop experimentation
  const [minVehicles, setMinVehicles] = useState<number>(15);
  const [maxVehicles, setMaxVehicles] = useState<number>(45);
  const [stepVehicles, setStepVehicles] = useState<number>(5);
  const [trialsPerCount, setTrialsPerCount] = useState<number>(5);
  const [duration, setDuration] = useState<number>(240);
  const [warmupDuration, setWarmupDuration] = useState<number>(120);
  const [enablePerturbation, setEnablePerturbation] = useState<boolean>(true);

  // Quick preset configurations
  const handleSetQuickPreset = (preset: 'fast' | 'thorough') => {
    if (preset === 'fast') {
      setMinVehicles(15);
      setMaxVehicles(45);
      setStepVehicles(10);
      setTrialsPerCount(3);
      setDuration(200);
      setWarmupDuration(100);
    } else {
      setMinVehicles(15);
      setMaxVehicles(45);
      setStepVehicles(5);
      setTrialsPerCount(5);
      setDuration(240);
      setWarmupDuration(120);
    }
  };

  const handleLaunch = () => {
    onStartExperiment({
      minVehicles,
      maxVehicles,
      stepVehicles,
      trialsPerCount,
      duration,
      warmupDuration,
      baseSeed: 1000,
      perturbation: enablePerturbation
        ? { time: warmupDuration, vehicleIndex: 0, factor: 0.25 }
        : null,
    });
  };

  // Prepare chart data from results
  const chartData = results
    ? results.groups.map((g) => ({
        vehicles: g.vehicleCount,
        density: g.densityVehPerKm,
        probability: Math.round(g.jamProbability * 100),
        ciLower: Math.round(g.confidenceInterval.lower * 100),
        ciUpper: Math.round(g.confidenceInterval.upper * 100),
        ciRange: [
          Math.round(g.confidenceInterval.lower * 100),
          Math.round(g.confidenceInterval.upper * 100),
        ],
        speedKmh: g.meanSpeedKmh,
        flowHourly: g.meanFlowHourly,
        congestionPct: Math.round(g.meanCongestionFraction * 100),
        jamTrials: `${g.jamTrials}/${g.totalTrials}`,
      }))
    : [];

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
      }}
    >
      {/* 1. Header */}
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
              fontSize: '16px',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🔬</span> Automatic Experiment Discovery Engine
          </h2>
          <p
            style={{
              margin: '3px 0 0 0',
              fontSize: '12px',
              color: '#94a3b8',
            }}
          >
            Executes headless parameter sweeps in a Web Worker to detect the empirical density threshold where sustained traffic jams emerge.
          </p>
        </div>

        {/* Preset quick buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            disabled={isRunning}
            onClick={() => handleSetQuickPreset('fast')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#cbd5e1',
              fontSize: '11px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            ⚡ Fast Sweep (~12 trials)
          </button>
          <button
            disabled={isRunning}
            onClick={() => handleSetQuickPreset('thorough')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #0284c7',
              background: '#0369a1',
              color: '#f0f9ff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            📊 Standard Sweep (35 trials)
          </button>
        </div>
      </div>

      {/* 2. Experiment Configuration Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          background: '#131c2e',
          padding: '14px',
          borderRadius: '8px',
          border: '1px solid #1e293b',
        }}
      >
        <ConfigField
          label="Min Vehicles"
          value={minVehicles}
          onChange={setMinVehicles}
          disabled={isRunning}
          min={5}
          max={60}
        />
        <ConfigField
          label="Max Vehicles"
          value={maxVehicles}
          onChange={setMaxVehicles}
          disabled={isRunning}
          min={10}
          max={80}
        />
        <ConfigField
          label="Step Size"
          value={stepVehicles}
          onChange={setStepVehicles}
          disabled={isRunning}
          min={1}
          max={20}
        />
        <ConfigField
          label="Trials / Density"
          value={trialsPerCount}
          onChange={setTrialsPerCount}
          disabled={isRunning}
          min={1}
          max={20}
        />
        <ConfigField
          label="Duration (s)"
          value={duration}
          onChange={setDuration}
          disabled={isRunning}
          min={60}
          max={600}
        />
        <ConfigField
          label="Warmup (s)"
          value={warmupDuration}
          onChange={setWarmupDuration}
          disabled={isRunning}
          min={30}
          max={300}
        />

        {/* Perturbation toggle & Launch button */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enablePerturbation}
              disabled={isRunning}
              onChange={(e) => setEnablePerturbation(e.target.checked)}
            />
            Perturb post-warmup
          </label>

          {isRunning ? (
            <button
              onClick={onCancelExperiment}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #ef4444',
                background: '#dc2626',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ⏹ Cancel Experiment
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: '#22c55e',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
              }}
            >
              🚀 Launch Discovery
            </button>
          )}
        </div>
      </div>

      {/* Error notice */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '12px',
            color: '#fca5a5',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Progress Bar when running */}
      {isRunning && progress && (
        <div
          style={{
            background: '#131c2e',
            border: '1px solid #0284c7',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
            <span>
              Simulating trial <strong>{progress.completedTrials}</strong> of <strong>{progress.totalTrials}</strong> (N = {progress.currentVehicleCount} vehicles, Seed #{progress.currentSeed})...
            </span>
            <span style={{ fontWeight: 700, color: '#38bdf8' }}>
              {Math.round((progress.completedTrials / Math.max(1, progress.totalTrials)) * 100)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: '#1e293b',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(progress.completedTrials / Math.max(1, progress.totalTrials)) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Results Section */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Transition Region Callout Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
              border: '1px solid #38bdf8',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Statistical Discovery Finding
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '4px 0' }}>
                {results.estimatedTransitionWindow ? (
                  <>
                    Estimated Critical Density Threshold: ~{results.estimatedTransitionWindow.crossingVehPerKm} veh/km
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginLeft: '8px' }}>
                      (Transition Window: {results.estimatedTransitionWindow.lowerVehPerKm} – {results.estimatedTransitionWindow.upperVehPerKm} veh/km)
                    </span>
                  </>
                ) : (
                  <>Completed {results.totalTrialsCompleted} Headless Simulation Trials in {(results.executionDurationMs / 1000).toFixed(1)}s</>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Confidence intervals calculated via 95% Wilson Score formulation across {results.config.trialsPerCount} micro-perturbation seeds per density level (Common Random Numbers design).
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                Execution time: <strong>{(results.executionDurationMs / 1000).toFixed(2)}s</strong>
                <br />
                Total trials: <strong>{results.totalTrialsCompleted}</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    const csv = exportExperimentTrialsCSV(results);
                    downloadFile(csv, `trafficflow_trials_${Date.now()}.csv`);
                  }}
                  title="Download raw metrics for every simulated trial"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📥 Trials (CSV)
                </button>
                <button
                  onClick={() => {
                    const csv = exportExperimentSummaryCSV(results);
                    downloadFile(csv, `trafficflow_density_summary_${Date.now()}.csv`);
                  }}
                  title="Download aggregate density statistics & 95% Wilson CIs"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📥 Summary (CSV)
                </button>
                <button
                  onClick={() => {
                    const jsonStr = exportExperimentJSON(results);
                    downloadFile(jsonStr, `trafficflow_results_${Date.now()}.json`, 'application/json');
                  }}
                  title="Download full experiment results as JSON"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#cbd5e1',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📥 JSON
                </button>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Chart 1: Jam Probability vs Density */}
            <div
              style={{
                background: '#131c2e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                  Jam Probability vs. Vehicle Density
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Shaded band = 95% Wilson CI
                </span>
              </div>
              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="density" stroke="#64748b" fontSize={10} unit=" veh/km" />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} unit="%" />
                    <Tooltip content={<ProbabilityTooltip />} />
                    <ReferenceLine y={50} stroke="#64748b" strokeDasharray="3 3" label={{ value: '50% transition', fill: '#64748b', fontSize: 9, position: 'right' }} />
                    <Area type="monotone" dataKey="ciUpper" stroke="none" fill="#ef4444" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="ciLower" stroke="none" fill="#0f172a" fillOpacity={1} />
                    <Line type="monotone" dataKey="probability" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Macroscopic Fundamental Diagram (Speed & Flow) */}
            <div
              style={{
                background: '#131c2e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                  Fundamental Diagram (Flow &amp; Speed vs. Density)
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Q (veh/h) &amp; v̄ (km/h)
                </span>
              </div>
              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="density" stroke="#64748b" fontSize={10} unit=" veh/km" />
                    <YAxis yAxisId="flow" stroke="#34d399" fontSize={10} domain={[0, 'auto']} unit=" veh/h" tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                    <YAxis yAxisId="speed" orientation="right" stroke="#38bdf8" fontSize={10} domain={[0, 140]} unit=" km/h" />
                    <Tooltip content={<FundamentalTooltip />} />
                    <Line yAxisId="flow" type="monotone" dataKey="flowHourly" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} name="Flow Q" isAnimationActive={false} />
                    <Line yAxisId="speed" type="monotone" dataKey="speedKmh" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} name="Avg Speed" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 4. Trial Details Table with One-Click Replay */}
          <div
            style={{
              background: '#131c2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '16px',
              overflowX: 'auto',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
              Individual Trial Repertoire &amp; Exact Replay
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
                color: '#cbd5e1',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '8px' }}>Density</th>
                  <th style={{ padding: '8px' }}>Vehicles</th>
                  <th style={{ padding: '8px' }}>Seed</th>
                  <th style={{ padding: '8px' }}>Regime</th>
                  <th style={{ padding: '8px' }}>Sustained Jam?</th>
                  <th style={{ padding: '8px' }}>Mean Speed</th>
                  <th style={{ padding: '8px' }}>Traffic Flow</th>
                  <th style={{ padding: '8px' }}>Jam Duration</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Replay</th>
                </tr>
              </thead>
              <tbody>
                {results.groups.flatMap((g) =>
                  g.trials.map((tr) => (
                    <tr
                      key={tr.trialId}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        background: tr.isSustainedJam ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{tr.densityVehPerKm} veh/km</td>
                      <td style={{ padding: '8px' }}>{tr.vehicleCount} cars</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>#{tr.seed}</td>
                      <td style={{ padding: '8px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            background:
                              tr.regime === 'sustained-jam'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : tr.regime === 'free-flow'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(245, 158, 11, 0.2)',
                            color:
                              tr.regime === 'sustained-jam'
                                ? '#fca5a5'
                                : tr.regime === 'free-flow'
                                ? '#86efac'
                                : '#fde047',
                          }}
                        >
                          {tr.regime}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontWeight: 600, color: tr.isSustainedJam ? '#ef4444' : '#22c55e' }}>
                        {tr.isSustainedJam ? 'YES' : 'NO'}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{tr.meanPostWarmupSpeedKmh} km/h</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{tr.meanPostWarmupFlowHourly} veh/h</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{tr.sustainedJamDuration}s</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => onReplayTrial(tr)}
                          title="Load this exact configuration, seed, and perturbation schedule into the Highway Simulator"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid #0284c7',
                            background: '#0369a1',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          ▶ Replay
                        </button>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfigField: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  disabled: boolean;
  min: number;
  max: number;
}> = ({ label, value, onChange, disabled, min, max }) => (
  <div>
    <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </label>
    <input
      type="number"
      value={value}
      disabled={disabled}
      min={min}
      max={max}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || min)}
      style={{
        width: '100%',
        padding: '6px 8px',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '6px',
        color: '#f8fafc',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    />
  </div>
);

const ProbabilityTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: '#f8fafc' }}>
        <div>Density: <strong>{label} veh/km</strong> ({data.vehicles} cars)</div>
        <div style={{ color: '#ef4444', fontWeight: 700, margin: '2px 0' }}>
          Jam Probability: {data.probability}% ({data.jamTrials})
        </div>
        <div style={{ color: '#94a3b8', fontSize: '10px' }}>
          95% Wilson CI: [{data.ciLower}%, {data.ciUpper}%]
        </div>
      </div>
    );
  }
  return null;
};

const FundamentalTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: '#f8fafc' }}>
        <div>Density: <strong>{label} veh/km</strong></div>
        {payload.map((item: any) => (
          <div key={item.name} style={{ color: item.color, fontWeight: 600 }}>
            {item.name}: {item.value} {item.unit}
          </div>
        ))}
      </div>
    );
  }
  return null;
};
