/**
 * TrafficFlow Lab — Main Application View
 *
 * Microscopic traffic flow simulator and computational experimentation platform:
 *   - Circular highway canvas visualization
 *   - Interactive controls (playback, speed, live behavior, structural params)
 *   - Real-time macroscopic metrics (avg speed, density, flow, congestion %)
 *   - Space-Time diagram (Kessel wave propagation plot)
 *   - Real-time time-series charts (Speed, Congestion %, Traffic Flow)
 *   - Automatic Experiment Discovery Engine with Web Worker density sweeps and Wilson CI
 *   - One-click reproducible scenario replay
 */

import React, { useRef, useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { useExperiment } from './hooks/useExperiment';
import { Header } from './components/Header';
import { SimulationCanvas } from './components/SimulationCanvas';
import { MetricsPanel } from './components/MetricsPanel';
import { ControlPanel } from './components/ControlPanel';
import { SpaceTimePanel } from './components/SpaceTimePanel';
import { ChartsPanel } from './components/ChartsPanel';
import { ExperimentPanel } from './components/ExperimentPanel';
import { ScienceGuideModal } from './components/ScienceGuideModal';
import { TrialResult } from './experiments/ExperimentRunner';

export const App: React.FC = () => {
  const canvasSectionRef = useRef<HTMLDivElement>(null);
  const [activeReplayTrial, setActiveReplayTrial] = useState<TrialResult | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const {
    state,
    config,
    pendingConfig,
    isResetNeeded,
    isRunning,
    speedMultiplier,
    highlightedVehicleId,
    timeSeriesData,
    spaceTimeSlices,
    spaceTimeWindow,
    togglePlay,
    reset,
    setSpeedMultiplier,
    applyPreset,
    updateLiveParam,
    setPendingVehicleCount,
    setPendingSeed,
    applyPendingChanges,
    perturbTraffic,
    setSpaceTimeWindow,
    replayScenario,
  } = useSimulation();

  const {
    isRunning: isExperimentRunning,
    progress: experimentProgress,
    results: experimentResults,
    error: experimentError,
    startExperiment,
    cancelExperiment,
  } = useExperiment();

  const handleReplayTrial = (trial: TrialResult) => {
    setActiveReplayTrial(trial);
    replayScenario(trial.simulationConfig, trial.perturbation);
    canvasSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#0b1120',
        color: '#f8fafc',
      }}
    >
      {/* Top Header */}
      <Header
        seed={config.seed}
        roadLength={config.roadLength}
        fixedDt={config.dt}
        isRunning={isRunning}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Interactive Science & Physics Guide Modal */}
      <ScienceGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Replay Notice Banner */}
        {activeReplayTrial && (
          <div
            style={{
              background: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid #0284c7',
              borderRadius: '8px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#38bdf8',
            }}
          >
            <span>
              ▶ <strong>Replaying Experiment Scenario:</strong> {activeReplayTrial.vehicleCount} vehicles ({activeReplayTrial.densityVehPerKm} veh/km), Seed #{activeReplayTrial.seed}
              {activeReplayTrial.perturbation && (
                <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                  (Scheduled perturbation at t = {activeReplayTrial.perturbation.time}s)
                </span>
              )}
            </span>
            <button
              onClick={() => setActiveReplayTrial(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕ Dismiss
            </button>
          </div>
        )}

        {/* 1. Key Metrics Readout */}
        <section aria-label="Real-time traffic metrics">
          <MetricsPanel
            metrics={state.metrics}
            time={state.time}
            stepCount={state.stepCount}
            speedMultiplier={speedMultiplier}
          />
        </section>

        {/* 2. Primary Simulation Viewport: Circular Road & Controls */}
        <section
          ref={canvasSectionRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(400px, 1fr) 380px',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* Circular Road Canvas */}
          <div
            style={{
              height: '600px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SimulationCanvas
              vehicles={state.vehicles}
              roadLength={config.roadLength}
              v0={config.idm.v0}
              isRunning={isRunning}
              highlightedVehicleId={highlightedVehicleId}
            />
          </div>

          {/* Interactive Control Panel */}
          <div>
            <ControlPanel
              config={config}
              pendingConfig={pendingConfig}
              isResetNeeded={isResetNeeded}
              isRunning={isRunning}
              speedMultiplier={speedMultiplier}
              onTogglePlay={togglePlay}
              onReset={() => {
                setActiveReplayTrial(null);
                reset();
              }}
              onSetSpeed={setSpeedMultiplier}
              onApplyPreset={(preset) => {
                setActiveReplayTrial(null);
                applyPreset(preset);
              }}
              onUpdateLiveParam={updateLiveParam}
              onSetPendingVehicleCount={setPendingVehicleCount}
              onSetPendingSeed={setPendingSeed}
              onApplyPendingChanges={applyPendingChanges}
              onPerturbTraffic={() => perturbTraffic(0, 0.25)}
            />
          </div>
        </section>

        {/* 3. Automatic Experiment Discovery Engine (Phase 3 Core Feature) */}
        <section aria-label="Automatic experiment discovery engine">
          <ExperimentPanel
            isRunning={isExperimentRunning}
            progress={experimentProgress}
            results={experimentResults}
            error={experimentError}
            onStartExperiment={startExperiment}
            onCancelExperiment={cancelExperiment}
            onReplayTrial={handleReplayTrial}
          />
        </section>

        {/* 4. Space-Time Wave Propagation Diagram */}
        <section aria-label="Space-time traffic wave propagation">
          <SpaceTimePanel
            slices={spaceTimeSlices}
            roadLength={config.roadLength}
            v0={config.idm.v0}
            selectedWindow={spaceTimeWindow}
            onTimeWindowChange={setSpaceTimeWindow}
          />
        </section>

        {/* 5. Time-Series Analytics (Speed, Congestion %, Flow Q) */}
        <section aria-label="Time-series analytics charts">
          <ChartsPanel
            data={timeSeriesData}
            v0={config.idm.v0}
            time={state.time}
          />
        </section>

        {/* 6. Scientific Summary & Educational Explanation */}
        <footer
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '16px 20px',
            fontSize: '12px',
            color: '#94a3b8',
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: '#f8fafc',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔬</span> Emergent Jam Dynamics &amp; Intelligent Driver Model (IDM)
          </div>
          <p style={{ margin: '0 0 8px 0' }}>
            In a single-lane circular highway with periodic boundaries, traffic jams can emerge entirely without accidents, lane reductions, or external obstacles.
            When vehicle density exceeds a critical threshold, small individual speed perturbations fail to dissipate and instead propagate backward as a shockwave,
            creating a persistent <strong>phantom traffic jam</strong>.
          </p>
          <p style={{ margin: 0, color: '#64748b' }}>
            Use the <strong>Automatic Experiment Discovery Engine</strong> above to empirically determine where your specific driver population transitions from laminar free flow into persistent stop-and-go waves.
            Each trial can be immediately replayed in the circular highway visualization above.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
