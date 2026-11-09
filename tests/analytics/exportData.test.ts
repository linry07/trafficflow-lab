import { describe, it, expect } from 'vitest';
import {
  exportExperimentTrialsCSV,
  exportExperimentSummaryCSV,
  exportExperimentJSON,
  exportTimeSeriesCSV,
} from '../../src/analytics/exportData';
import { DensityExperimentResults } from '../../src/experiments/ExperimentRunner';
import { TimeSeriesPoint } from '../../src/analytics/TimeSeriesCollector';
import { DEFAULT_CONFIG } from '../../src/engine/SimulationConfig';

describe('Data Export Utilities', () => {
  const mockResults: DensityExperimentResults = {
    config: {
      minVehicles: 15,
      maxVehicles: 30,
      stepVehicles: 15,
      trialsPerCount: 2,
      duration: 100,
      warmupDuration: 50,
      baseSeed: 1000,
      perturbation: { time: 50, vehicleIndex: 0, factor: 0.25 },
    },
    totalTrialsCompleted: 4,
    executionDurationMs: 120,
    groups: [
      {
        vehicleCount: 15,
        densityVehPerKm: 15,
        totalTrials: 2,
        jamTrials: 0,
        jamProbability: 0,
        confidenceInterval: { lower: 0, upper: 0.657 },
        meanSpeedKmh: 95.2,
        meanFlowHourly: 1428,
        meanCongestionFraction: 0.05,
        trials: [
          {
            trialId: 'density_15_trial_0_seed_1000',
            vehicleCount: 15,
            densityVehPerKm: 15,
            seed: 1000,
            simulationConfig: { ...DEFAULT_CONFIG, vehicleCount: 15, seed: 1000 },
            perturbation: { time: 50, vehicleIndex: 0, factor: 0.25 },
            regime: 'free-flow',
            isSustainedJam: false,
            sustainedJamDuration: 5,
            maxCongestionFraction: 0.05,
            meanPostWarmupSpeed: 26.4,
            meanPostWarmupSpeedKmh: 95.0,
            meanPostWarmupFlow: 0.396,
            meanPostWarmupFlowHourly: 1425,
            meanSpeedVariance: 0.5,
            duration: 100,
          },
          {
            trialId: 'density_15_trial_1_seed_1001',
            vehicleCount: 15,
            densityVehPerKm: 15,
            seed: 1001,
            simulationConfig: { ...DEFAULT_CONFIG, vehicleCount: 15, seed: 1001 },
            perturbation: { time: 50, vehicleIndex: 0, factor: 0.25 },
            regime: 'free-flow',
            isSustainedJam: false,
            sustainedJamDuration: 4,
            maxCongestionFraction: 0.05,
            meanPostWarmupSpeed: 26.5,
            meanPostWarmupSpeedKmh: 95.4,
            meanPostWarmupFlow: 0.397,
            meanPostWarmupFlowHourly: 1431,
            meanSpeedVariance: 0.4,
            duration: 100,
          },
        ],
      },
    ],
    estimatedTransitionWindow: null,
  };

  it('exports trials to valid CSV with headers and rows', () => {
    const csv = exportExperimentTrialsCSV(mockResults);
    const lines = csv.trim().split('\n');
    expect(lines.length).toBe(3); // Header + 2 trials
    expect(lines[0]).toContain('trial_id');
    expect(lines[0]).toContain('density_veh_per_km');
    expect(lines[1]).toContain('density_15_trial_0_seed_1000');
    expect(lines[1]).toContain('free-flow');
  });

  it('exports summary groups with Wilson CI to CSV', () => {
    const csv = exportExperimentSummaryCSV(mockResults);
    const lines = csv.trim().split('\n');
    expect(lines.length).toBe(2); // Header + 1 group
    expect(lines[0]).toContain('ci_95_lower');
    expect(lines[1]).toContain('15');
    expect(lines[1]).toContain('0.657');
  });

  it('exports experiment results to parseable JSON', () => {
    const jsonStr = exportExperimentJSON(mockResults);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.totalTrialsCompleted).toBe(4);
    expect(parsed.groups).toHaveLength(1);
    expect(parsed.groups[0].trials).toHaveLength(2);
  });

  it('exports time-series samples to valid CSV', () => {
    const samples: TimeSeriesPoint[] = [
      {
        time: 0.5,
        avgSpeedMs: 25.0,
        avgSpeedKmh: 90.0,
        congestionPct: 10.0,
        flowHourly: 1260.0,
        densityPerKm: 20.0,
        speedVariance: 0.2,
      },
      {
        time: 1.0,
        avgSpeedMs: 24.5,
        avgSpeedKmh: 88.2,
        congestionPct: 15.0,
        flowHourly: 1224.0,
        densityPerKm: 20.0,
        speedVariance: 0.25,
      },
    ];

    const csv = exportTimeSeriesCSV(samples);
    const lines = csv.trim().split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain('simulated_time_s');
    expect(lines[0]).toContain('average_speed_kmh');
    expect(lines[1]).toContain('90');
  });
});
