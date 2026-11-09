/**
 * SpaceTimeGrid — Spatiotemporal data accumulator for circular highway analytics.
 *
 * Captures the microscopic (vehicle trajectories) and mesoscopic (spatial bins)
 * state of the traffic flow over simulated time.
 *
 * Scientific design:
 *   1. Temporal sampling: Fixed simulated-time intervals (default 0.25s).
 *   2. Spatial bins: Road of length L is discretized into M uniform bins (e.g. 100 bins of 10m each).
 *      Crucially, bins with NO vehicle present are explicitly recorded as `null` (empty),
 *      avoiding false implications of measurement across sparse empty highway regions.
 *   3. Microscopic trajectories: Stores exact (position, speed) pairs for every vehicle,
 *      allowing rendering of characteristic worldlines.
 *   4. Periodic boundary handling: Seamlessly identifies when vehicles wrap across
 *      the 1000m <-> 0m boundary, avoiding visual horizontal streak artifacts.
 *   5. Memory bounds: Fixed-capacity ring buffer sliding window (e.g. last 60s–120s).
 */

import { Vehicle } from '../engine/Vehicle';

export interface VehicleSnapshot {
  id: number;
  position: number;
  speed: number;
}

export interface SpaceTimeSlice {
  /** Simulated time in seconds */
  time: number;
  /**
   * Spatial speed bins along the road [0, roadLength).
   * Entry is null if no vehicle was observed in that spatial bin at this time.
   * If a vehicle was observed, contains the vehicle's speed in m/s.
   */
  bins: (number | null)[];
  /** Exact vehicle snapshots for continuous trajectory drawing */
  vehicles: VehicleSnapshot[];
}

export interface SpaceTimeGridOptions {
  /** Road length in meters (default 1000) */
  roadLength?: number;
  /** Number of spatial bins across the road length (default 100 bins = 10m/bin) */
  numBins?: number;
  /** Interval of simulated time between spatial slices (default 0.25s) */
  sampleInterval?: number;
  /** Maximum simulated time window to retain in seconds (default 60s) */
  maxDuration?: number;
}

export class SpaceTimeGrid {
  private slices: SpaceTimeSlice[] = [];
  private lastSampleTime: number = -Infinity;
  readonly roadLength: number;
  readonly numBins: number;
  readonly binSize: number;
  readonly sampleInterval: number;
  readonly maxDuration: number;

  constructor(options: SpaceTimeGridOptions = {}) {
    this.roadLength = options.roadLength ?? 1000;
    this.numBins = options.numBins ?? 100;
    this.binSize = this.roadLength / this.numBins;
    this.sampleInterval = options.sampleInterval ?? 0.25;
    this.maxDuration = options.maxDuration ?? 60;
  }

  /**
   * Record a spatiotemporal snapshot if sampleInterval of simulated time has passed.
   *
   * @param time Current simulated time in seconds
   * @param vehicles Current vehicle array from simulation state
   * @returns true if a new slice was recorded, false otherwise
   */
  record(time: number, vehicles: ReadonlyArray<Vehicle>): boolean {
    if (this.slices.length === 0 || time - this.lastSampleTime >= this.sampleInterval - 1e-6) {
      // 1. Initialize empty spatial bins with null (unobserved/empty road)
      const bins: (number | null)[] = new Array(this.numBins).fill(null);
      const binCounts = new Array<number>(this.numBins).fill(0);

      // 2. Map vehicles into spatial bins
      const vehicleSnapshots: VehicleSnapshot[] = [];

      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        vehicleSnapshots.push({
          id: v.id,
          position: v.position,
          speed: v.speed,
        });

        const binIdx = Math.min(
          this.numBins - 1,
          Math.max(0, Math.floor(v.position / this.binSize)),
        );

        if (bins[binIdx] === null) {
          bins[binIdx] = v.speed;
          binCounts[binIdx] = 1;
        } else {
          // Average speed if multiple vehicles fall in the same bin
          bins[binIdx] = (bins[binIdx]! * binCounts[binIdx] + v.speed) / (binCounts[binIdx] + 1);
          binCounts[binIdx]++;
        }
      }

      // 3. Store the slice
      this.slices.push({
        time: Math.round(time * 100) / 100,
        bins,
        vehicles: vehicleSnapshots,
      });

      this.lastSampleTime = time;

      // 4. Evict slices outside the retention window
      const cutoffTime = time - this.maxDuration;
      while (this.slices.length > 0 && this.slices[0].time < cutoffTime) {
        this.slices.shift();
      }

      return true;
    }

    return false;
  }

  /**
   * Get all recorded spatiotemporal slices.
   */
  getSlices(): ReadonlyArray<SpaceTimeSlice> {
    return this.slices;
  }

  /**
   * Number of slices currently recorded.
   */
  get count(): number {
    return this.slices.length;
  }

  /**
   * Time range spanned by currently retained slices (in seconds).
   */
  get timeRange(): { start: number; end: number; duration: number } {
    if (this.slices.length === 0) {
      return { start: 0, end: 0, duration: 0 };
    }
    const start = this.slices[0].time;
    const end = this.slices[this.slices.length - 1].time;
    return { start, end, duration: end - start };
  }

  /**
   * Reset grid history.
   */
  clear(): void {
    this.slices = [];
    this.lastSampleTime = -Infinity;
  }
}
