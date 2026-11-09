import { describe, it, expect } from 'vitest';
import {
  ExperimentRunner,
  TrialConfig,
  DensityExperimentConfig,
} from '../../src/experiments/ExperimentRunner';
import { Simulation } from '../../src/engine/Simulation';
import { DEFAULT_IDM_PARAMS } from '../../src/engine/SimulationConfig';

describe('ExperimentRunner — Headless Simulation & Parameter Sweeps', () => {
  const baseTrialConfig: TrialConfig = {
    roadLength: 1000,
    vehicleCount: 20,
    vehicleLength: 5,
    idm: { ...DEFAULT_IDM_PARAMS },
    seed: 42,
    dt: 0.05,
    duration: 60,
    warmupDuration: 20,
    perturbation: null,
  };

  it('runs a single headless trial deterministically', () => {
    const result1 = ExperimentRunner.runSingleTrial(baseTrialConfig);
    const result2 = ExperimentRunner.runSingleTrial(baseTrialConfig);

    expect(result1.vehicleCount).toBe(20);
    expect(result1.densityVehPerKm).toBe(20);
    expect(result1.seed).toBe(42);

    // Deterministic parity: every recorded metric matches across runs
    expect(result1.meanPostWarmupSpeed).toBe(result2.meanPostWarmupSpeed);
    expect(result1.meanPostWarmupFlow).toBe(result2.meanPostWarmupFlow);
    expect(result1.isSustainedJam).toBe(result2.isSustainedJam);
    expect(result1.regime).toBe(result2.regime);
  });

  it('preserves exact replay fidelity between headless trial and interactive simulation', () => {
    // 1. Run headless trial
    const trial = ExperimentRunner.runSingleTrial({
      ...baseTrialConfig,
      duration: 30,
      warmupDuration: 10,
      perturbation: { time: 10, vehicleIndex: 0, factor: 0.3 },
    });

    // 2. Replay using raw Simulation class with exact same configuration
    const sim = new Simulation(trial.simulationConfig);
    const totalSteps = Math.ceil(30 / 0.05);

    for (let step = 0; step < totalSteps; step++) {
      if (sim.getTime() >= 10 - 1e-6 && step === Math.ceil(10 / 0.05)) {
        sim.perturbVehicle(0, 0.3);
      }
      sim.step(0.05);
    }

    // Positions, speeds, and accelerations must match to floating-point precision
    const simState = sim.getState();
    expect(trial.finalVehicles).toBeDefined();
    expect(simState.vehicles.length).toBe(trial.finalVehicles!.length);
    expect(simState.time).toBeCloseTo(30, 2);

    for (let i = 0; i < simState.vehicles.length; i++) {
      const simV = simState.vehicles[i];
      const trialV = trial.finalVehicles![i];
      expect(simV.id).toBe(trialV.id);
      expect(simV.position).toBeCloseTo(trialV.position, 5);
      expect(simV.speed).toBeCloseTo(trialV.speed, 5);
      expect(simV.acceleration).toBeCloseTo(trialV.acceleration, 5);
    }
  });

  it('executes a multi-density sweep with distinct deterministic seeds', () => {
    const experimentConfig: DensityExperimentConfig = {
      roadLength: 1000,
      minVehicles: 15,
      maxVehicles: 25,
      stepVehicles: 10, // 2 groups: 15 and 25
      trialsPerCount: 2, // 2 trials per group = 4 trials total
      duration: 40,
      warmupDuration: 20,
      baseSeed: 500,
      perturbation: null,
    };

    let progressCount = 0;
    const results = ExperimentRunner.runDensitySweep(
      experimentConfig,
      (prog) => {
        progressCount++;
        expect(prog.totalTrials).toBe(4);
      },
    );

    expect(results.groups.length).toBe(2);
    expect(results.totalTrialsCompleted).toBe(4);
    expect(progressCount).toBe(4);

    // Group 1: 15 vehicles
    expect(results.groups[0].vehicleCount).toBe(15);
    expect(results.groups[0].trials.length).toBe(2);
    // Distinct seeds
    expect(results.groups[0].trials[0].seed).not.toBe(results.groups[0].trials[1].seed);

    // Group 2: 25 vehicles
    expect(results.groups[1].vehicleCount).toBe(25);
    expect(results.groups[1].trials.length).toBe(2);
  });

  it('supports cancellation cleanly during an ongoing sweep', () => {
    const cancelAfter = 2; // Cancel after 2 trials
    let executed = 0;

    const results = ExperimentRunner.runDensitySweep(
      {
        minVehicles: 10,
        maxVehicles: 50,
        stepVehicles: 10,
        trialsPerCount: 3, // 15 trials total
        duration: 20,
        warmupDuration: 10,
      },
      () => {
        executed++;
      },
      () => executed >= cancelAfter,
    );

    // Sweep should have halted early without error
    expect(results.totalTrialsCompleted).toBeLessThan(15);
    expect(executed).toBe(cancelAfter);
  });
});
