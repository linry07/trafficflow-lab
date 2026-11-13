/**
 * TrafficFlow Lab — Main Application View
 *
 * Microscopic traffic flow simulator and computational experimentation platform:
 *   - Compact header (60-72px) with branding, live status, and Science Guide
 *   - Five compact real-time macroscopic metrics (avg speed, density, flow, congestion %, time)
 *   - Primary workspace: circular highway simulation (~430px) side-by-side with compact control sidebar
 *   - Tabbed analytics workspace below (Live Charts, Space-Time Diagram, Automatic Experiments)
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
import { AnalyticsWorkspace } from './components/AnalyticsWorkspace';
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
    selectedVehicleId,
    selectVehicle,
    selectedVehicleDiagnostics,
    selectedVehicleActivity,
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
    <div className="app-container">
      {/* 1. Compact Header */}
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
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Replay Notice Banner */}
        {activeReplayTrial && (
          <div className="replay-banner">
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
                padding: '2px 6px',
              }}
            >
              ✕ Dismiss
            </button>
          </div>
        )}

        {/* 2. Compact Real-time Macroscopic Metrics */}
        <section aria-label="Real-time traffic metrics">
          <MetricsPanel
            metrics={state.metrics}
            time={state.time}
            stepCount={state.stepCount}
            speedMultiplier={speedMultiplier}
          />
        </section>

        {/* 3. Primary Simulation Viewport: Circular Road (~430px) & Compact Control Sidebar */}
        <section
          ref={canvasSectionRef}
          aria-label="Simulation workspace"
          className="workspace-grid"
        >
          {/* Circular Road Canvas Viewport */}
          <div className="simulation-column">
            <SimulationCanvas
              vehicles={state.vehicles}
              roadLength={config.roadLength}
              v0={config.idm.v0}
              isRunning={isRunning}
              highlightedVehicleId={highlightedVehicleId}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={selectVehicle}
              selectedVehicleDiagnostics={selectedVehicleDiagnostics}
              selectedVehicleActivity={selectedVehicleActivity}
            />
          </div>

          {/* Compact Interactive Control Sidebar */}
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

        {/* 4. Tabbed Analytics Workspace (Live Charts, Space-Time Diagram, Experiments) */}
        <section aria-label="Analytics and experimentation workspace">
          <AnalyticsWorkspace
            timeSeriesData={timeSeriesData}
            v0={config.idm.v0}
            simTime={state.time}
            spaceTimeSlices={spaceTimeSlices}
            roadLength={config.roadLength}
            spaceTimeWindow={spaceTimeWindow}
            onTimeWindowChange={setSpaceTimeWindow}
            isExperimentRunning={isExperimentRunning}
            experimentProgress={experimentProgress}
            experimentResults={experimentResults}
            experimentError={experimentError}
            onStartExperiment={startExperiment}
            onCancelExperiment={cancelExperiment}
            onReplayTrial={handleReplayTrial}
          />
        </section>

        {/* 5. Scientific Summary & Educational Reference */}
        <footer
          style={{
            background: '#090e1a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '11px',
            color: '#94a3b8',
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: '#f8fafc',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔬</span> Emergent Jam Dynamics &amp; Intelligent Driver Model (IDM)
          </div>
          <p style={{ margin: '0 0 4px 0' }}>
            In a single-lane circular highway with periodic boundaries, traffic jams emerge without accidents, lane reductions, or external obstacles.
            When vehicle density exceeds the critical threshold (&asymp; 27.5 veh/km), individual braking fluctuations amplify backward along the loop,
            spontaneously forming stop-and-go shockwaves.
          </p>
          <p style={{ margin: 0, color: '#64748b' }}>
            Use the <strong>Experiments</strong> tab above to run headless multi-seed density sweeps and compute 95% Wilson Score confidence intervals, or observe backward-moving wave worldlines in the <strong>Space-Time Diagram</strong> tab.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
