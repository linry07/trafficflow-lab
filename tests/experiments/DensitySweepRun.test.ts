import { describe, it } from 'vitest';
import { ExperimentRunner } from '../../src/experiments/ExperimentRunner';

describe('Real Density Sweep Runner', () => {
  it('conducts a full density sweep and outputs empirical findings', () => {
    console.log('\n--- STARTING EMPIRICAL DENSITY SWEEP (15 to 45 vehicles, 5 trials each) ---');

    const results = ExperimentRunner.runDensitySweep(
      {
        roadLength: 1000,
        vehicleLength: 5,
        minVehicles: 15,
        maxVehicles: 45,
        stepVehicles: 5,
        trialsPerCount: 5,
        duration: 240,
        warmupDuration: 120,
        baseSeed: 1000,
        perturbation: { time: 120, vehicleIndex: 0, factor: 0.25 },
      },
      (prog) => {
        if (prog.completedTrials % 5 === 0) {
          console.log(`[Sweep Progress] ${prog.completedTrials}/${prog.totalTrials} trials complete`);
        }
      },
    );

    console.log('\n================ REAL EXPERIMENT DISCOVERY RESULTS ================');
    console.log(`Execution Duration: ${(results.executionDurationMs / 1000).toFixed(2)}s for ${results.totalTrialsCompleted} trials`);
    if (results.estimatedTransitionWindow) {
      console.log(`Estimated Critical Transition Window: ${results.estimatedTransitionWindow.lowerVehPerKm} to ${results.estimatedTransitionWindow.upperVehPerKm} veh/km`);
      console.log(`Estimated 50% Jam Probability Crossing: ${results.estimatedTransitionWindow.crossingVehPerKm} veh/km`);
    }

    console.log('\nDensity | Veh | Jam Prob | 95% Wilson CI     | Mean Speed | Flow Q (veh/h) | Mean Congestion');
    console.log('--------|-----|----------|-------------------|------------|----------------|----------------');

    for (const g of results.groups) {
      const ci = `[${(g.confidenceInterval.lower * 100).toFixed(1)}%, ${(g.confidenceInterval.upper * 100).toFixed(1)}%]`;
      console.log(
        `${g.densityVehPerKm.toFixed(1).padStart(7)} | ` +
        `${g.vehicleCount.toString().padStart(3)} | ` +
        `${(g.jamProbability * 100).toFixed(0).padStart(7)}% | ` +
        `${ci.padEnd(17)} | ` +
        `${g.meanSpeedKmh.toFixed(1).padStart(8)} km/h | ` +
        `${g.meanFlowHourly.toFixed(0).padStart(14)} | ` +
        `${(g.meanCongestionFraction * 100).toFixed(1).padStart(13)}%`
      );
    }
    console.log('===================================================================\n');
  });
});
