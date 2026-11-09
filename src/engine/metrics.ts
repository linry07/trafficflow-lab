/**
 * Traffic metrics computed from simulation state.
 *
 * All metrics are derived directly from the actual vehicle states — nothing
 * is fabricated or approximated independently. This ensures that displayed
 * analytics faithfully represent the simulation.
 */

import { Vehicle } from './Vehicle';

/**
 * Snapshot of traffic metrics at a single point in time.
 */
export interface TrafficMetrics {
  /** Average speed of all vehicles (m/s). */
  averageSpeed: number;
  /** Vehicle density: vehicles per meter of road. */
  density: number;
  /** Traffic flow: vehicles per second passing a point (density × avgSpeed). */
  flow: number;
  /** Speed variance across all vehicles (m²/s²). */
  speedVariance: number;
  /** Fraction of vehicles below the congestion speed threshold [0, 1]. */
  congestionFraction: number;
}

/**
 * Compute the arithmetic mean speed of all vehicles.
 */
export function computeAverageSpeed(vehicles: ReadonlyArray<Vehicle>): number {
  if (vehicles.length === 0) return 0;
  const sum = vehicles.reduce((acc, v) => acc + v.speed, 0);
  return sum / vehicles.length;
}

/**
 * Compute vehicle density (vehicles per meter).
 */
export function computeDensity(
  vehicleCount: number,
  roadLength: number,
): number {
  return vehicleCount / roadLength;
}

/**
 * Compute traffic flow using the fundamental relation Q = ρ × v̄.
 *
 * This is the macroscopic flow: the average number of vehicles passing
 * a fixed point per second.
 */
export function computeFlow(density: number, averageSpeed: number): number {
  return density * averageSpeed;
}

/**
 * Compute the variance of vehicle speeds.
 *
 * High variance indicates stop-and-go traffic (some vehicles stopped,
 * others moving). Low variance indicates either free flow or uniformly
 * slow traffic.
 */
export function computeSpeedVariance(
  vehicles: ReadonlyArray<Vehicle>,
  averageSpeed: number,
): number {
  if (vehicles.length === 0) return 0;
  const sumSquaredDev = vehicles.reduce(
    (acc, v) => acc + (v.speed - averageSpeed) ** 2,
    0,
  );
  return sumSquaredDev / vehicles.length;
}

/**
 * Compute the fraction of vehicles that are "congested" — moving below
 * a threshold speed.
 *
 * The default threshold is 30% of the desired speed (v₀). A vehicle crawling
 * at less than ~36 km/h on a 120 km/h highway is considered congested.
 *
 * Note: This is a simple first-pass metric. It does NOT distinguish between
 * uniformly slow traffic (everyone going 30 km/h) and localized stop-and-go
 * waves (some stopped, some at full speed). Future phases will add spatial
 * congestion detection.
 *
 * @param vehicles    Array of vehicle states.
 * @param v0          Desired speed (m/s) — used to compute the threshold.
 * @param threshold   Fraction of v0 below which a vehicle is congested (default 0.3).
 */
export function computeCongestionFraction(
  vehicles: ReadonlyArray<Vehicle>,
  v0: number,
  threshold: number = 0.3,
): number {
  if (vehicles.length === 0) return 0;
  const congestionSpeed = v0 * threshold;
  const congested = vehicles.filter((v) => v.speed < congestionSpeed).length;
  return congested / vehicles.length;
}

/**
 * Compute all traffic metrics from the current simulation state.
 */
export function computeAllMetrics(
  vehicles: ReadonlyArray<Vehicle>,
  roadLength: number,
  v0: number,
): TrafficMetrics {
  const averageSpeed = computeAverageSpeed(vehicles);
  const density = computeDensity(vehicles.length, roadLength);
  const flow = computeFlow(density, averageSpeed);
  const speedVariance = computeSpeedVariance(vehicles, averageSpeed);
  const congestionFraction = computeCongestionFraction(vehicles, v0);

  return {
    averageSpeed,
    density,
    flow,
    speedVariance,
    congestionFraction,
  };
}
