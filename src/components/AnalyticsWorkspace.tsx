/**
 * Tabbed Analytics Workspace Component.
 *
 * Integrates:
 *   1. Live Charts (Speed, Congestion %, Flow Q with CSV export)
 *   2. Space-Time Diagram (Spatiotemporal wave propagation)
 *   3. Automatic Experiment Discovery Engine (Worker sweeps, Wilson CI, replay)
 *
 * Guarantees:
 *   - Continuous mounting: switching tabs never resets state or aborts running experiments
 *   - Automatic layout recalculation on tab change via resize event dispatch
 *   - Live background experiment indicator badge on tab header
 */

import React, { useState, useEffect } from 'react';
import { ChartsPanel } from './ChartsPanel';
import { SpaceTimePanel } from './SpaceTimePanel';
import { ExperimentPanel } from './ExperimentPanel';
import { TimeSeriesPoint } from '../analytics/TimeSeriesCollector';
import { SpaceTimeSlice } from '../analytics/SpaceTimeGrid';
import {
  DensityExperimentConfig,
  DensityExperimentResults,
  ExperimentProgress,
  TrialResult,
} from '../experiments/ExperimentRunner';

export type AnalyticsTab = 'charts' | 'spacetime' | 'experiments';

export interface AnalyticsWorkspaceProps {
  // Live Charts props
  timeSeriesData: ReadonlyArray<TimeSeriesPoint>;
  v0: number;
  simTime: number;

  // Space-Time props
  spaceTimeSlices: ReadonlyArray<SpaceTimeSlice>;
  roadLength: number;
  spaceTimeWindow: number;
  onTimeWindowChange: (seconds: number) => void;

  // Experiments props
  isExperimentRunning: boolean;
  experimentProgress: ExperimentProgress | null;
  experimentResults: DensityExperimentResults | null;
  experimentError: string | null;
  onStartExperiment: (config: DensityExperimentConfig) => void;
  onCancelExperiment: () => void;
  onReplayTrial: (trial: TrialResult) => void;
}

export const AnalyticsWorkspace: React.FC<AnalyticsWorkspaceProps> = ({
  timeSeriesData,
  v0,
  simTime,
  spaceTimeSlices,
  roadLength,
  spaceTimeWindow,
  onTimeWindowChange,
  isExperimentRunning,
  experimentProgress,
  experimentResults,
  experimentError,
  onStartExperiment,
  onCancelExperiment,
  onReplayTrial,
}) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('charts');

  // Trigger container resize event whenever active tab changes so Recharts and canvas recalculate dimensions
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleTabSelect = (tab: AnalyticsTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="analytics-workspace">
      {/* Tab Navigation Header Bar */}
      <div className="analytics-tab-bar" role="tablist" aria-label="Analytics & Experiments Tabs">
        {/* Tab 1: Live Charts */}
        <button
          type="button"
          role="tab"
          id="tab-charts"
          aria-selected={activeTab === 'charts'}
          aria-controls="panel-charts"
          onClick={() => handleTabSelect('charts')}
          className={`analytics-tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
        >
          <span aria-hidden="true">📊</span>
          <span>Live Charts</span>
          {timeSeriesData.length > 0 && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '8px',
                background: '#1e293b',
                color: '#94a3b8',
                fontFamily: 'monospace',
              }}
            >
              {timeSeriesData.length} pts
            </span>
          )}
        </button>

        {/* Tab 2: Space-Time Diagram */}
        <button
          type="button"
          role="tab"
          id="tab-spacetime"
          aria-selected={activeTab === 'spacetime'}
          aria-controls="panel-spacetime"
          onClick={() => handleTabSelect('spacetime')}
          className={`analytics-tab-btn ${activeTab === 'spacetime' ? 'active' : ''}`}
        >
          <span aria-hidden="true">🌊</span>
          <span>Space-Time Diagram</span>
        </button>

        {/* Tab 3: Automatic Experiment Discovery Engine */}
        <button
          type="button"
          role="tab"
          id="tab-experiments"
          aria-selected={activeTab === 'experiments'}
          aria-controls="panel-experiments"
          onClick={() => handleTabSelect('experiments')}
          className={`analytics-tab-btn ${activeTab === 'experiments' ? 'active' : ''}`}
        >
          <span aria-hidden="true">🔬</span>
          <span>Experiments</span>

          {/* Running progress badge indicator */}
          {isExperimentRunning && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                fontWeight: 700,
                border: '1px solid rgba(56, 189, 248, 0.4)',
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: '#38bdf8',
                }}
              />
              Running
            </span>
          )}

          {/* Completed results indicator */}
          {!isExperimentRunning && experimentResults && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                fontFamily: 'monospace',
              }}
            >
              {experimentResults.totalTrialsCompleted} trials
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels: Rendered continuously with CSS display toggling to preserve all execution & state */}
      <div
        role="tabpanel"
        id="panel-charts"
        aria-labelledby="tab-charts"
        className="analytics-tab-panel"
        style={{ display: activeTab === 'charts' ? 'block' : 'none' }}
      >
        <ChartsPanel data={timeSeriesData} v0={v0} time={simTime} />
      </div>

      <div
        role="tabpanel"
        id="panel-spacetime"
        aria-labelledby="tab-spacetime"
        className="analytics-tab-panel"
        style={{ display: activeTab === 'spacetime' ? 'block' : 'none' }}
      >
        <SpaceTimePanel
          slices={spaceTimeSlices}
          roadLength={roadLength}
          v0={v0}
          selectedWindow={spaceTimeWindow}
          onTimeWindowChange={onTimeWindowChange}
        />
      </div>

      <div
        role="tabpanel"
        id="panel-experiments"
        aria-labelledby="tab-experiments"
        className="analytics-tab-panel"
        style={{ display: activeTab === 'experiments' ? 'block' : 'none' }}
      >
        <ExperimentPanel
          isRunning={isExperimentRunning}
          progress={experimentProgress}
          results={experimentResults}
          error={experimentError}
          onStartExperiment={onStartExperiment}
          onCancelExperiment={onCancelExperiment}
          onReplayTrial={onReplayTrial}
        />
      </div>
    </div>
  );
};
