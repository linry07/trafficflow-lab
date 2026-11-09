import { describe, it, expect } from 'vitest';
import { ExperimentRunner } from '../../src/experiments/ExperimentRunner';

describe('Real Density Sweep Runner — Empirical Validation & Statistical Integrity', () => {
  it('conducts a full density sweep with verified statistical and output integrity', () => {
    const sweepConfig = {
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
    };

    let reportedProgressCount = 0;

    const results = ExperimentRunner.runDensitySweep(
      sweepConfig,
      (prog) => {
        reportedProgressCount++;
        expect(prog.completedTrials).toBeGreaterThan(0);
        expect(prog.totalTrials).toBe(35);
      },
    );

    // 1. Structural completion assertions
    expect(results.totalTrialsCompleted).toBe(35);
    expect(reportedProgressCount).toBe(35);
    expect(results.groups).toHaveLength(7); // 15, 20, 25, 30, 35, 40, 45
    expect(results.executionDurationMs).toBeGreaterThan(0);

    // 2. Statistical calculation & boundary assertions for each density group
    for (let i = 0; i < results.groups.length; i++) {
      const g = results.groups[i];

      expect(g.totalTrials).toBe(5);
      expect(g.trials).toHaveLength(5);
      expect(g.densityVehPerKm).toBe(15 + i * 5);
      expect(g.vehicleCount).toBe(15 + i * 5);

      // Probabilities must be valid mathematical bounds
      expect(g.jamProbability).toBeGreaterThanOrEqual(0);
      expect(g.jamProbability).toBeLessThanOrEqual(1);

      // Wilson 95% Confidence Interval bounds check
      const ci = g.confidenceInterval;
      expect(ci.lower).toBeGreaterThanOrEqual(0);
      expect(ci.upper).toBeLessThanOrEqual(1);
      expect(ci.lower).toBeLessThanOrEqual(ci.upper);
      expect(ci.lower).toBeLessThanOrEqual(g.jamProbability);
      expect(g.jamProbability).toBeLessThanOrEqual(ci.upper);

      // Macroscopic metrics must be finite and within physical bounds
      expect(Number.isFinite(g.meanSpeedKmh)).toBe(true);
      expect(g.meanSpeedKmh).toBeGreaterThan(0);
      expect(g.meanSpeedKmh).toBeLessThanOrEqual(125); // Cannot exceed desired speed + initialization noise

      expect(Number.isFinite(g.meanFlowHourly)).toBe(true);
      expect(g.meanFlowHourly).toBeGreaterThan(0);

      expect(g.meanCongestionFraction).toBeGreaterThanOrEqual(0);
      expect(g.meanCongestionFraction).toBeLessThanOrEqual(1);

      // 3. Individual trial consistency check
      for (let t = 0; t < g.trials.length; t++) {
        const tr = g.trials[t];
        expect(tr.vehicleCount).toBe(g.vehicleCount);
        expect(tr.seed).toBe(1000 + t * 7919); // Common Random Numbers seed verification
        expect(tr.duration).toBe(240);
        expect(['free-flow', 'transient-disturbance', 'uniformly-slow', 'sustained-jam']).toContain(tr.regime);
        expect(tr.isSustainedJam).toBe(tr.regime === 'sustained-jam');
        expect(Number.isFinite(tr.meanPostWarmupSpeed)).toBe(true);
        expect(Number.isFinite(tr.meanPostWarmupFlow)).toBe(true);
      }
    }

    // 4. Transition window validation (if detected)
    if (results.estimatedTransitionWindow) {
      const w = results.estimatedTransitionWindow;
      expect(w.lowerVehPerKm).toBeGreaterThanOrEqual(15);
      expect(w.upperVehPerKm).toBeLessThanOrEqual(45);
      expect(w.lowerVehPerKm).toBeLessThanOrEqual(w.upperVehPerKm);
      expect(w.crossingVehPerKm).toBeGreaterThanOrEqual(w.lowerVehPerKm);
      expect(w.crossingVehPerKm).toBeLessThanOrEqual(w.upperVehPerKm);
    }

    // 5. Reproducibility parity check: re-running single trial 0 must produce identical numbers
    const singleTrialRecheck = ExperimentRunner.runSingleTrial({
      roadLength: 1000,
      vehicleCount: 15,
      vehicleLength: 5,
      idm: sweepConfig.perturbation ? {
        v0: 33.3,
        s0: 2.0,
        T: 1.5,
        a: 1.0,
        b: 3.0,
        delta: 4,
      } : results.config.idm,
      seed: 1000,
      dt: 0.05,
      duration: 240,
      warmupDuration: 120,
      perturbation: sweepConfig.perturbation,
    });

    const firstGroupFirstTrial = results.groups[0].trials[0];
    expect(singleTrialRecheck.meanPostWarmupSpeed).toBe(firstGroupFirstTrial.meanPostWarmupSpeed);
    expect(singleTrialRecheck.meanPostWarmupFlow).toBe(firstGroupFirstTrial.meanPostWarmupFlow);
    expect(singleTrialRecheck.isSustainedJam).toBe(firstGroupFirstTrial.isSustainedJam);
  });
});
