/**
 * TimeSeriesCollector — Framework-agnostic simulation metric recorder.
 *
 * Key guarantees:
 *   1. Fixed simulated-time sampling: Samples are recorded strictly based on
 *      elapsed simulation time (t_sim), never browser animation frames or wall-clock time.
 *      This ensures identical time-series curves regardless of whether the simulation
 *      is run at 1x, 2x, or 5x speed, or on a 60Hz vs 120Hz monitor.
 *   2. Bounded memory retention: Uses a sliding time window (default 120s of simulated time).
 *      Older data points are evicted in O(1) to prevent unbounded memory growth.
 *   3. Zero physics interference: Pure read-only consumer of TrafficMetrics snapshots.
 */

import { TrafficMetrics } from '../engine/metrics';

export interface TimeSeriesPoint {
  /** Simulated time in seconds */
  time: number;
  /** Average speed in km/h */
  avgSpeedKmh: number;
  /** Average speed in m/s */
  avgSpeedMs: number;
  /** Percentage of congested vehicles (0–100%) */
  congestionPct: number;
  /** Macroscopic traffic flow in vehicles/hour */
  flowHourly: number;
  /** Vehicle density in vehicles/km */
  densityPerKm: number;
  /** Speed variance in (m/s)² */
  speedVariance: number;
}

export interface TimeSeriesCollectorOptions {
  /** Sampling interval in simulated seconds (default 0.5s) */
  sampleInterval?: number;
  /** Maximum simulated time window to retain in seconds (default 120s) */
  maxDuration?: number;
}

export class TimeSeriesCollector {
  private samples: TimeSeriesPoint[] = [];
  private lastSampleTime: number = -Infinity;
  private readonly sampleInterval: number;
  private readonly maxDuration: number;

  constructor(options: TimeSeriesCollectorOptions = {}) {
    this.sampleInterval = options.sampleInterval ?? 0.5;
    this.maxDuration = options.maxDuration ?? 120;
  }

  /**
   * Evaluate whether a sample should be recorded at the given simulation time,
   * and append the point if the sampleInterval has elapsed.
   *
   * @param time Current simulation time in seconds (t_sim)
   * @param metrics Traffic metrics snapshot from the engine
   * @returns true if a new sample was recorded, false otherwise
   */
  record(time: number, metrics: TrafficMetrics): boolean {
    // Record initial point at time 0, or whenever sampleInterval of simulated time has passed
    if (this.samples.length === 0 || time - this.lastSampleTime >= this.sampleInterval - 1e-6) {
      const point: TimeSeriesPoint = {
        time: Math.round(time * 10) / 10,
        avgSpeedKmh: Math.round(metrics.averageSpeed * 3.6 * 10) / 10,
        avgSpeedMs: Math.round(metrics.averageSpeed * 10) / 10,
        congestionPct: Math.round(metrics.congestionFraction * 100 * 10) / 10,
        flowHourly: Math.round(metrics.flow * 3600),
        densityPerKm: Math.round(metrics.density * 1000 * 10) / 10,
        speedVariance: Math.round(metrics.speedVariance * 100) / 100,
      };

      this.samples.push(point);
      this.lastSampleTime = time;

      // Evict points outside the rolling maxDuration retention window
      const cutoffTime = time - this.maxDuration;
      while (this.samples.length > 0 && this.samples[0].time < cutoffTime) {
        this.samples.shift();
      }

      return true;
    }

    return false;
  }

  /**
   * Get all currently retained time-series points.
   */
  getPoints(): ReadonlyArray<TimeSeriesPoint> {
    return this.samples;
  }

  /**
   * Get the most recently recorded point, or null if empty.
   */
  getLatestPoint(): TimeSeriesPoint | null {
    return this.samples.length > 0 ? this.samples[this.samples.length - 1] : null;
  }

  /**
   * Number of samples currently retained in memory.
   */
  get count(): number {
    return this.samples.length;
  }

  /**
   * Maximum capacity in terms of retained simulated time.
   */
  get duration(): number {
    if (this.samples.length < 2) return 0;
    return this.samples[this.samples.length - 1].time - this.samples[0].time;
  }

  /**
   * Reset collector history (e.g. on simulation reset).
   */
  clear(): void {
    this.samples = [];
    this.lastSampleTime = -Infinity;
  }
}
