/**
 * Data export utilities for TrafficFlow Lab.
 *
 * Provides serialisation functions to export simulation time-series,
 * experiment trial matrices, and summary statistics to CSV and JSON.
 * Includes browser download helpers using Blob URLs.
 */

import { DensityExperimentResults } from '../experiments/ExperimentRunner';
import { TimeSeriesPoint } from './TimeSeriesCollector';

/**
 * Escapes a cell value for standard RFC-4180 CSV formatting.
 */
function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of rows (each an array of cell values) into a CSV string.
 */
function rowsToCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

/**
 * Exports all individual trial results from a density experiment to CSV format.
 */
export function exportExperimentTrialsCSV(results: DensityExperimentResults): string {
  const headers = [
    'trial_id',
    'density_veh_per_km',
    'vehicle_count',
    'seed',
    'regime',
    'is_sustained_jam',
    'mean_speed_kmh',
    'mean_flow_hourly',
    'mean_congestion_fraction',
    'max_contiguous_congestion_s',
    'has_perturbation',
    'perturbation_time_s',
    'warmup_duration_s',
    'total_duration_s',
  ];

  const rows: (string | number | boolean | null | undefined)[][] = [headers];

  for (const group of results.groups) {
    for (const trial of group.trials) {
      rows.push([
        trial.trialId,
        trial.densityVehPerKm,
        trial.vehicleCount,
        trial.seed,
        trial.regime,
        trial.isSustainedJam ? 1 : 0,
        trial.meanPostWarmupSpeedKmh,
        trial.meanPostWarmupFlowHourly,
        trial.maxCongestionFraction,
        trial.sustainedJamDuration,
        trial.perturbation ? 1 : 0,
        trial.perturbation ? trial.perturbation.time : '',
        results.config.warmupDuration,
        results.config.duration,
      ]);
    }
  }

  return rowsToCsv(rows);
}

/**
 * Exports density group summary statistics (including Wilson 95% CIs) to CSV format.
 */
export function exportExperimentSummaryCSV(results: DensityExperimentResults): string {
  const headers = [
    'density_veh_per_km',
    'vehicle_count',
    'total_trials',
    'jam_trials',
    'jam_probability',
    'ci_95_lower',
    'ci_95_upper',
    'mean_speed_kmh',
    'mean_flow_hourly',
    'mean_congestion_fraction',
  ];

  const rows: (string | number | boolean | null | undefined)[][] = [headers];

  for (const group of results.groups) {
    rows.push([
      group.densityVehPerKm,
      group.vehicleCount,
      group.totalTrials,
      group.jamTrials,
      Number(group.jamProbability.toFixed(4)),
      Number(group.confidenceInterval.lower.toFixed(4)),
      Number(group.confidenceInterval.upper.toFixed(4)),
      group.meanSpeedKmh,
      group.meanFlowHourly,
      Number(group.meanCongestionFraction.toFixed(4)),
    ]);
  }

  return rowsToCsv(rows);
}

/**
 * Exports complete experiment results including config, summary groups,
 * and individual trial results as formatted JSON.
 */
export function exportExperimentJSON(results: DensityExperimentResults): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Exports simulation time-series samples to CSV format.
 */
export function exportTimeSeriesCSV(samples: TimeSeriesPoint[]): string {
  const headers = [
    'simulated_time_s',
    'average_speed_kmh',
    'congestion_percentage',
    'traffic_flow_hourly',
    'density_veh_per_km',
    'speed_variance',
  ];

  const rows: (string | number | boolean | null | undefined)[][] = [headers];

  for (const sample of samples) {
    rows.push([
      Number(sample.time.toFixed(2)),
      Number(sample.avgSpeedKmh.toFixed(2)),
      Number(sample.congestionPct.toFixed(1)),
      Number(sample.flowHourly.toFixed(1)),
      Number(sample.densityPerKm.toFixed(2)),
      Number(sample.speedVariance.toFixed(4)),
    ]);
  }

  return rowsToCsv(rows);
}

/**
 * Triggers a browser download of a given text content as a file using a Blob.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
