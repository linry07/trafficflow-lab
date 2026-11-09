/**
 * CongestionDetector — Scientifically grounded traffic congestion & jam classification.
 *
 * Distinguishes four distinct macroscopic and microscopic traffic flow regimes:
 *   1. 'free-flow': High speed, low variance, zero or negligible congestion.
 *   2. 'transient-disturbance': Localized slowdown that naturally dissipates within < 60s.
 *   3. 'uniformly-slow': Low average speed across the fleet, but uniform flow without stop-and-go waves (low variance).
 *   4. 'sustained-jam': Persistent stop-and-go waves with high speed variance lasting >= 60s post-warmup.
 *
 * Scientific Criteria & Physical Definitions:
 *   - Congested Vehicle Threshold: Speed v < 0.30 * v0 (m/s).
 *   - Fleet Congestion Fraction: f_c = (count of congested vehicles) / N.
 *   - Stop-and-Go Wave Signature: Speed variance sigma_v >= 1.8 m/s (indicates concurrent coexistence of stopped and moving vehicles).
 *   - Warmup Period Exclusion: Transients during the first 120s are excluded from sustained jam determination.
 *   - Persistence Window: Continuous or sustained congestion lasting >= 60s of simulated time post-warmup.
 */

import { TrafficMetrics } from '../engine/metrics';

export type TrafficRegime =
  | 'free-flow'
  | 'transient-disturbance'
  | 'uniformly-slow'
  | 'sustained-jam';

export interface CongestionDetectorConfig {
  /** Desired speed v0 in m/s (used for 30% threshold calculation) */
  v0: number;
  /** Fraction of v0 below which a vehicle is congested (default 0.30) */
  speedThresholdRatio?: number;
  /** Minimum fraction of fleet congested to flag a congested state (default 0.15 = 15%) */
  congestionFractionThreshold?: number;
  /** Minimum speed variance in (m/s)² indicating stop-and-go heterogeneity (default 3.0, sigma_v ≈ 1.73 m/s) */
  varianceThreshold?: number;
  /** Warm-up duration in simulated seconds to exclude from evaluation (default 120s) */
  warmupDuration?: number;
  /** Minimum duration in simulated seconds that congestion must persist to be classified as sustained (default 60s) */
  minJamDuration?: number;
  /** Grace period in seconds to tolerate brief threshold dips during wave oscillation before resetting jam duration (default 3.0s) */
  jamClearGracePeriod?: number;
}

export interface CongestionAnalysisResult {
  /** Macroscopic traffic regime classification */
  regime: TrafficRegime;
  /** Boolean flag: true if criteria for a sustained traffic jam were met */
  isSustainedJam: boolean;
  /** Peak congestion fraction observed during the evaluated post-warmup window */
  maxCongestionFraction: number;
  /** Longest contiguous duration (in seconds) of sustained congestion post-warmup */
  sustainedJamDuration: number;
  /** Mean vehicle speed during the post-warmup period (m/s) */
  meanPostWarmupSpeed: number;
  /** Mean traffic flow during the post-warmup period (veh/s) */
  meanPostWarmupFlow: number;
  /** Mean speed variance during the post-warmup period ((m/s)²) */
  meanSpeedVariance: number;
  /** Total simulated time evaluated (excluding warmup) */
  evaluatedDuration: number;
}

export class CongestionDetector {
  readonly v0: number;
  readonly speedThresholdRatio: number;
  readonly congestionFractionThreshold: number;
  readonly varianceThreshold: number;
  readonly warmupDuration: number;
  readonly minJamDuration: number;
  readonly jamClearGracePeriod: number;

  constructor(config: CongestionDetectorConfig) {
    this.v0 = config.v0;
    this.speedThresholdRatio = config.speedThresholdRatio ?? 0.30;
    this.congestionFractionThreshold = config.congestionFractionThreshold ?? 0.15;
    this.varianceThreshold = config.varianceThreshold ?? 3.0; // (m/s)²
    this.warmupDuration = config.warmupDuration ?? 120;
    this.minJamDuration = config.minJamDuration ?? 60;
    this.jamClearGracePeriod = config.jamClearGracePeriod ?? 3.0;
  }

  /**
   * Analyze a time-series of recorded metrics snapshots from a completed or running simulation.
   *
   * @param history Array of { time, metrics } samples
   * @returns Comprehensive scientific analysis and classification
   */
  analyze(
    history: ReadonlyArray<{ time: number; metrics: TrafficMetrics }>,
  ): CongestionAnalysisResult {
    if (history.length === 0) {
      return {
        regime: 'free-flow',
        isSustainedJam: false,
        maxCongestionFraction: 0,
        sustainedJamDuration: 0,
        meanPostWarmupSpeed: 0,
        meanPostWarmupFlow: 0,
        meanSpeedVariance: 0,
        evaluatedDuration: 0,
      };
    }

    // 1. Filter out warmup samples
    const postWarmup = history.filter((pt) => pt.time >= this.warmupDuration);

    if (postWarmup.length === 0) {
      // Simulation ended before warmup completed
      return {
        regime: 'free-flow',
        isSustainedJam: false,
        maxCongestionFraction: 0,
        sustainedJamDuration: 0,
        meanPostWarmupSpeed: 0,
        meanPostWarmupFlow: 0,
        meanSpeedVariance: 0,
        evaluatedDuration: 0,
      };
    }

    const evaluatedDuration =
      postWarmup[postWarmup.length - 1].time - postWarmup[0].time;

    // 2. Track contiguous durations of stop-and-go congestion with hysteresis debouncing
    let maxContiguousJamDuration = 0;
    let currentContiguousJamDuration = 0;
    let currentLapseDuration = 0;
    let peakCongestion = 0;
    let sumSpeed = 0;
    let sumFlow = 0;
    let sumVariance = 0;
    let anyCongestionObserved = false;
    const gracePeriod = this.jamClearGracePeriod;

    for (let i = 0; i < postWarmup.length; i++) {
      const pt = postWarmup[i];
      const m = pt.metrics;
      const dtSample = i > 0 ? pt.time - postWarmup[i - 1].time : 0;

      sumSpeed += m.averageSpeed;
      sumFlow += m.flow;
      sumVariance += m.speedVariance;

      if (m.congestionFraction > peakCongestion) {
        peakCongestion = m.congestionFraction;
      }

      if (m.congestionFraction > 0.05) {
        anyCongestionObserved = true;
      }

      // Check if point meets stop-and-go congestion criteria:
      // High congestion fraction AND elevated speed variance (distinguishes stop-and-go from uniform slow)
      const isStopAndGo =
        m.congestionFraction >= this.congestionFractionThreshold &&
        m.speedVariance >= this.varianceThreshold;

      if (isStopAndGo) {
        currentLapseDuration = 0;
        currentContiguousJamDuration += dtSample;
        if (currentContiguousJamDuration > maxContiguousJamDuration) {
          maxContiguousJamDuration = currentContiguousJamDuration;
        }
      } else {
        // Hysteresis: only reset contiguous jam progress if clearance persists beyond grace period
        currentLapseDuration += dtSample;
        if (currentLapseDuration > gracePeriod) {
          currentContiguousJamDuration = 0;
        }
      }
    }

    const count = postWarmup.length;
    const meanSpeed = sumSpeed / count;
    const meanFlow = sumFlow / count;
    const meanVariance = sumVariance / count;

    // 3. Classify traffic regime based on physical attributes
    const isSustainedJam = maxContiguousJamDuration >= this.minJamDuration;

    let regime: TrafficRegime;
    if (isSustainedJam) {
      regime = 'sustained-jam';
    } else if (meanSpeed < this.v0 * 0.40 && meanVariance < this.varianceThreshold) {
      // Low speed across the fleet, but low variance (homogeneous crawling without waves)
      regime = 'uniformly-slow';
    } else if (anyCongestionObserved || peakCongestion >= this.congestionFractionThreshold) {
      // Congestion appeared temporarily (e.g. due to disturbance), but dissipated before 60s
      regime = 'transient-disturbance';
    } else {
      regime = 'free-flow';
    }

    return {
      regime,
      isSustainedJam,
      maxCongestionFraction: Math.round(peakCongestion * 1000) / 1000,
      sustainedJamDuration: Math.round(maxContiguousJamDuration * 10) / 10,
      meanPostWarmupSpeed: Math.round(meanSpeed * 100) / 100,
      meanPostWarmupFlow: Math.round(meanFlow * 1000) / 1000,
      meanSpeedVariance: Math.round(meanVariance * 100) / 100,
      evaluatedDuration: Math.round(evaluatedDuration * 10) / 10,
    };
  }
}
