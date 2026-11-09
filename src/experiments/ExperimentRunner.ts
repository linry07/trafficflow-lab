/**
 * Headless Experiment Runner — Automated parameter sweep and statistical engine.
 *
 * Runs deterministic batch simulations off the main rendering thread using
 * the pure Simulation engine and CongestionDetector.
 */

import { Simulation } from '../engine/Simulation';
import { SimulationConfig } from '../engine/SimulationConfig';
import { Vehicle } from '../engine/Vehicle';
import { TrafficMetrics } from '../engine/metrics';
import { CongestionDetector, TrafficRegime } from '../analytics/CongestionDetector';
import {
  computeWilsonInterval,
  computeMeanAndStdDev,
  ConfidenceInterval,
} from './Statistics';

export interface PerturbationSchedule {
  /** Simulated time in seconds at which the perturbation is triggered */
  time: number;
  /** Index of vehicle to perturb (default 0) */
  vehicleIndex: number;
  /** Speed multiplier factor (e.g. 0.25 = brake to 25% of current speed) */
  factor: number;
}

export interface TrialConfig {
  roadLength: number;
  vehicleCount: number;
  vehicleLength: number;
  idm: SimulationConfig['idm'];
  seed: number;
  dt: number;
  duration: number;
  warmupDuration: number;
  perturbation: PerturbationSchedule | null;
}

export interface TrialResult {
  trialId: string;
  vehicleCount: number;
  densityVehPerKm: number;
  seed: number;
  isSustainedJam: boolean;
  regime: TrafficRegime;
  maxCongestionFraction: number;
  sustainedJamDuration: number;
  meanPostWarmupSpeed: number;
  meanPostWarmupSpeedKmh: number;
  meanPostWarmupFlow: number;
  meanPostWarmupFlowHourly: number;
  meanSpeedVariance: number;
  duration: number;
  simulationConfig: SimulationConfig;
  perturbation: PerturbationSchedule | null;
  /** Terminal vehicle snapshots at the completion of the trial */
  finalVehicles?: ReadonlyArray<Vehicle>;
}

export interface DensityGroupResult {
  vehicleCount: number;
  densityVehPerKm: number;
  totalTrials: number;
  jamTrials: number;
  jamProbability: number;
  confidenceInterval: ConfidenceInterval;
  meanSpeedKmh: number;
  stdSpeedKmh: number;
  meanFlowHourly: number;
  stdFlowHourly: number;
  meanCongestionFraction: number;
  trials: TrialResult[];
}

export interface CriticalDensityWindow {
  /** Vehicle density (veh/km) where jam probability first crosses >= 10% */
  lowerVehPerKm: number;
  /** Vehicle density (veh/km) where jam probability first reaches >= 80% */
  upperVehPerKm: number;
  /** Interpolated density (veh/km) where jam probability crosses 50% */
  crossingVehPerKm: number;
}

export interface DensityExperimentConfig {
  roadLength?: number;
  vehicleLength?: number;
  minVehicles?: number;
  maxVehicles?: number;
  stepVehicles?: number;
  trialsPerCount?: number;
  duration?: number;
  warmupDuration?: number;
  baseSeed?: number;
  idm?: SimulationConfig['idm'];
  perturbation?: PerturbationSchedule | null;
}

export interface DensityExperimentResults {
  config: Required<DensityExperimentConfig>;
  groups: DensityGroupResult[];
  totalTrialsCompleted: number;
  estimatedTransitionWindow: CriticalDensityWindow | null;
  executionDurationMs: number;
}

export interface ExperimentProgress {
  completedTrials: number;
  totalTrials: number;
  currentVehicleCount: number;
  currentSeed: number;
  latestResult?: TrialResult;
}

export class ExperimentRunner {
  /**
   * Execute a single deterministic simulation trial headlessly.
   */
  static runSingleTrial(trialConfig: TrialConfig): TrialResult {
    const {
      roadLength,
      vehicleCount,
      vehicleLength,
      idm,
      seed,
      dt,
      duration,
      warmupDuration,
      perturbation,
    } = trialConfig;

    const simulationConfig: SimulationConfig = {
      roadLength,
      vehicleCount,
      vehicleLength,
      idm: { ...idm },
      seed,
      dt,
    };

    const sim = new Simulation(simulationConfig);
    const history: Array<{ time: number; metrics: TrafficMetrics }> = [];

    // Sample metrics every 0.5s of simulated time
    const sampleInterval = 0.5;
    let lastSampleTime = -Infinity;
    let perturbationTriggered = false;

    const totalSteps = Math.ceil(duration / dt);

    for (let step = 0; step < totalSteps; step++) {
      const time = sim.getTime();

      // Check scheduled perturbation
      if (
        perturbation &&
        !perturbationTriggered &&
        time >= perturbation.time - 1e-6
      ) {
        sim.perturbVehicle(perturbation.vehicleIndex, perturbation.factor);
        perturbationTriggered = true;
      }

      // Record metric sample
      if (time - lastSampleTime >= sampleInterval - 1e-6) {
        history.push({ time, metrics: sim.getState().metrics });
        lastSampleTime = time;
      }

      sim.step(dt);
    }

    // Analyze post-warmup metrics for sustained jam criteria
    const detector = new CongestionDetector({
      v0: idm.v0,
      warmupDuration,
      minJamDuration: 60,
    });

    const analysis = detector.analyze(history);
    const densityVehPerKm = (vehicleCount / roadLength) * 1000;

    return {
      trialId: `N${vehicleCount}-seed${seed}-${Date.now().toString(36)}`,
      vehicleCount,
      densityVehPerKm,
      seed,
      isSustainedJam: analysis.isSustainedJam,
      regime: analysis.regime,
      maxCongestionFraction: analysis.maxCongestionFraction,
      sustainedJamDuration: analysis.sustainedJamDuration,
      meanPostWarmupSpeed: analysis.meanPostWarmupSpeed,
      meanPostWarmupSpeedKmh: Math.round(analysis.meanPostWarmupSpeed * 3.6 * 10) / 10,
      meanPostWarmupFlow: analysis.meanPostWarmupFlow,
      meanPostWarmupFlowHourly: Math.round(analysis.meanPostWarmupFlow * 3600),
      meanSpeedVariance: analysis.meanSpeedVariance,
      duration,
      simulationConfig,
      perturbation,
      finalVehicles: sim.getState().vehicles.map((v) => ({ ...v })),
    };
  }

  /**
   * Execute an automated parameter sweep across vehicle densities.
   */
  static runDensitySweep(
    userConfig: DensityExperimentConfig,
    onProgress?: (progress: ExperimentProgress) => void,
    shouldCancel?: () => boolean,
  ): DensityExperimentResults {
    const startTime = performance.now();

    const config: Required<DensityExperimentConfig> = {
      roadLength: userConfig.roadLength ?? 1000,
      vehicleLength: userConfig.vehicleLength ?? 5,
      minVehicles: userConfig.minVehicles ?? 15,
      maxVehicles: userConfig.maxVehicles ?? 45,
      stepVehicles: userConfig.stepVehicles ?? 5,
      trialsPerCount: userConfig.trialsPerCount ?? 5,
      duration: userConfig.duration ?? 240,
      warmupDuration: userConfig.warmupDuration ?? 120,
      baseSeed: userConfig.baseSeed ?? 1000,
      idm: userConfig.idm ?? {
        v0: 33.3,
        s0: 2.0,
        T: 1.5,
        a: 1.0,
        b: 3.0,
        delta: 4,
      },
      perturbation:
        userConfig.perturbation !== undefined
          ? userConfig.perturbation
          : { time: 120, vehicleIndex: 0, factor: 0.25 },
    };

    // Generate vehicle counts
    const vehicleCounts: number[] = [];
    for (
      let n = config.minVehicles;
      n <= config.maxVehicles;
      n += config.stepVehicles
    ) {
      vehicleCounts.push(n);
    }

    const totalTrials = vehicleCounts.length * config.trialsPerCount;
    let completedTrials = 0;
    const groups: DensityGroupResult[] = [];

    for (const n of vehicleCounts) {
      if (shouldCancel && shouldCancel()) break;

      const trials: TrialResult[] = [];
      const densityVehPerKm = (n / config.roadLength) * 1000;

      for (let t = 0; t < config.trialsPerCount; t++) {
        if (shouldCancel && shouldCancel()) break;

        // Controlled Comparative Design (Common Random Numbers):
        // Each trial index t across all density levels shares the identical deterministic seed.
        // This isolates vehicle density as the primary experimental variable by matching initial
        // micro-perturbation profiles across density configurations.
        const seed = config.baseSeed + t * 7919;

        const trialResult = this.runSingleTrial({
          roadLength: config.roadLength,
          vehicleCount: n,
          vehicleLength: config.vehicleLength,
          idm: config.idm,
          seed,
          dt: 0.05,
          duration: config.duration,
          warmupDuration: config.warmupDuration,
          perturbation: config.perturbation,
        });

        trials.push(trialResult);
        completedTrials++;

        if (onProgress) {
          onProgress({
            completedTrials,
            totalTrials,
            currentVehicleCount: n,
            currentSeed: seed,
            latestResult: trialResult,
          });
        }
      }

      if (trials.length > 0) {
        const jamCount = trials.filter((tr) => tr.isSustainedJam).length;
        const confidenceInterval = computeWilsonInterval(
          jamCount,
          trials.length,
          0.95,
        );

        const speedsKmh = trials.map((tr) => tr.meanPostWarmupSpeedKmh);
        const flowsHourly = trials.map((tr) => tr.meanPostWarmupFlowHourly);
        const congestions = trials.map((tr) => tr.maxCongestionFraction);

        const speedStats = computeMeanAndStdDev(speedsKmh);
        const flowStats = computeMeanAndStdDev(flowsHourly);
        const congestionStats = computeMeanAndStdDev(congestions);

        groups.push({
          vehicleCount: n,
          densityVehPerKm,
          totalTrials: trials.length,
          jamTrials: jamCount,
          jamProbability: confidenceInterval.estimate,
          confidenceInterval,
          meanSpeedKmh: speedStats.mean,
          stdSpeedKmh: speedStats.stdDev,
          meanFlowHourly: flowStats.mean,
          stdFlowHourly: flowStats.stdDev,
          meanCongestionFraction: congestionStats.mean,
          trials,
        });
      }
    }

    // Estimate critical density transition window
    const estimatedTransitionWindow = this.estimateTransitionWindow(groups);
    const executionDurationMs = Math.round(performance.now() - startTime);

    return {
      config,
      groups,
      totalTrialsCompleted: completedTrials,
      estimatedTransitionWindow,
      executionDurationMs,
    };
  }

  /**
   * Estimate the density window where jam probability transitions from low (<20%) to high (>80%).
   */
  private static estimateTransitionWindow(
    groups: DensityGroupResult[],
  ): CriticalDensityWindow | null {
    if (groups.length < 2) return null;

    let crossing: number | null = null;
    let crossingLower: number | null = null;
    let crossingUpper: number | null = null;

    // Find crossing of 50% probability via linear interpolation
    for (let i = 0; i < groups.length - 1; i++) {
      const g1 = groups[i];
      const g2 = groups[i + 1];

      if (g1.jamProbability <= 0.5 && g2.jamProbability >= 0.5) {
        crossingLower = g1.densityVehPerKm;
        crossingUpper = g2.densityVehPerKm;
        const dP = g2.jamProbability - g1.jamProbability;
        if (dP > 0) {
          const frac = (0.5 - g1.jamProbability) / dP;
          crossing = g1.densityVehPerKm + frac * (g2.densityVehPerKm - g1.densityVehPerKm);
        } else {
          crossing = (g1.densityVehPerKm + g2.densityVehPerKm) / 2;
        }
        break;
      }
    }

    if (crossing !== null && crossingLower !== null && crossingUpper !== null) {
      return {
        lowerVehPerKm: Math.round(crossingLower * 10) / 10,
        upperVehPerKm: Math.round(crossingUpper * 10) / 10,
        crossingVehPerKm: Math.round(crossing * 10) / 10,
      };
    }

    return null;
  }
}
