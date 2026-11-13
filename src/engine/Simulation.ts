/**
 * Core simulation engine for TrafficFlow Lab.
 *
 * Manages N vehicles on a circular road of length L. Each simulation step:
 *   1. Computes IDM acceleration for each vehicle based on its leader
 *   2. Updates speeds (semi-implicit Euler, clamped to >= 0)
 *   3. Updates positions using the new speeds
 *   4. Wraps positions for periodic boundary conditions
 *   5. Re-sorts vehicles and runs collision safety checks
 *
 * The engine is completely independent of rendering — it has no DOM, Canvas,
 * or React dependencies. This enables headless experiments that run orders
 * of magnitude faster than real time.
 *
 * Design decisions:
 *   - Fixed timestep (default 0.05s) so physics is deterministic and
 *     frame-rate-independent.
 *   - Semi-implicit Euler: update speed first, then use new speed for position.
 *     This is more stable than explicit Euler at the same cost.
 *   - Post-step collision safety: if any gap goes negative (shouldn't happen
 *     with reasonable parameters, but is a safety net), clamp the follower's
 *     position and speed.
 *   - Vehicles are stored sorted by position. Leader lookup is O(1).
 */

import { Vehicle, createVehicle } from './Vehicle';
import { computeAcceleration } from './IDMModel';
import { wrapPosition, computeGap, sortVehicles, getLeaderIndex } from './Road';
import { IDMParams, SimulationConfig, DEFAULT_CONFIG } from './SimulationConfig';
import { SeededRandom } from './SeededRandom';
import { computeAllMetrics, TrafficMetrics } from './metrics';
import {
  VehicleDiagnostics,
  computeVehicleDiagnostics,
} from './VehicleDiagnostics';
import {
  VehicleActivityTracker,
  VehicleActivityEvent,
} from './VehicleActivityTracker';

/**
 * Immutable snapshot of the simulation at a point in time.
 * Used for rendering and analytics without risking mutation.
 */
export interface SimulationState {
  /** All vehicles, sorted by position. */
  readonly vehicles: ReadonlyArray<Readonly<Vehicle>>;
  /** Current simulation time (s). */
  readonly time: number;
  /** Number of simulation steps completed. */
  readonly stepCount: number;
  /** The configuration used for this simulation run. */
  readonly config: Readonly<SimulationConfig>;
  /** Current traffic metrics. */
  readonly metrics: TrafficMetrics;
}

export class Simulation {
  private vehicles: Vehicle[];
  private time: number;
  private stepCount: number;
  private config: SimulationConfig;
  private rng: SeededRandom;
  private activityTracker: VehicleActivityTracker;

  constructor(config: SimulationConfig = DEFAULT_CONFIG) {
    this.config = { ...config, idm: { ...config.idm } };
    this.vehicles = [];
    this.time = 0;
    this.stepCount = 0;
    this.rng = new SeededRandom(config.seed);
    this.activityTracker = new VehicleActivityTracker();
    this.initialize();
  }

  /**
   * Place vehicles evenly around the road with small random speed perturbations.
   *
   * Uniform center-to-center spacing ensures a valid initial state.
   * Note on spacing vs. net gap:
   *   - Center-to-center vehicle distance: d = roadLength / vehicleCount.
   *   - Net bumper-to-bumper gap: s = d - vehicleLength.
   * Speed perturbations (±5% of v₀) seed instabilities that may or may not
   * grow into jams depending on density.
   */
  private initialize(): void {
    const { roadLength, vehicleCount, idm } = this.config;
    // Initial center-to-center vehicle spacing (m)
    const spacing = roadLength / vehicleCount;

    this.vehicles = [];
    for (let i = 0; i < vehicleCount; i++) {
      const position = i * spacing;
      // Small random perturbation around equilibrium speed.
      // The perturbation is ±5% of v₀ — enough to seed instabilities
      // without creating immediate collisions.
      const speedPerturbation = idm.v0 * (this.rng.nextRange(-0.05, 0.05));
      const speed = Math.max(0, idm.v0 + speedPerturbation);
      this.vehicles.push(createVehicle(i, position, speed));
    }

    this.vehicles = sortVehicles(this.vehicles);
    this.activityTracker.initialize(this.vehicles, this.config, this.time);
  }

  /**
   * Advance the simulation by one fixed timestep.
   *
   * Uses semi-implicit Euler integration:
   *   1. Compute accelerations from current state
   *   2. Update speeds using accelerations (clamp >= 0)
   *   3. Update positions using NEW speeds (this is the "semi-implicit" part)
   *   4. Apply periodic boundary conditions
   *   5. Re-sort and enforce collision safety
   *
   * @param dt  Timestep in seconds. Defaults to config.dt.
   */
  step(dt: number = this.config.dt): void {
    const { roadLength, vehicleLength, idm } = this.config;
    const n = this.vehicles.length;

    if (n === 0) {
      this.time += dt;
      this.stepCount++;
      return;
    }

    // Phase 1: Compute all accelerations from current state.
    // We read all positions/speeds before writing any, ensuring consistency.
    const accelerations = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const vehicle = this.vehicles[i];
      const leaderIdx = getLeaderIndex(i, n);
      const leader = this.vehicles[leaderIdx];
      const gap = computeGap(vehicle, leader, roadLength, vehicleLength);
      const approachRate = vehicle.speed - leader.speed;

      accelerations[i] = computeAcceleration(
        vehicle.speed,
        gap,
        approachRate,
        idm,
      );
    }

    // Phase 2: Update speeds (semi-implicit Euler — speed first).
    for (let i = 0; i < n; i++) {
      this.vehicles[i].acceleration = accelerations[i];
      this.vehicles[i].speed = Math.max(
        0,
        this.vehicles[i].speed + accelerations[i] * dt,
      );
    }

    // Phase 3: Update positions using NEW speeds.
    // Using the already-updated speed is what makes this semi-implicit Euler,
    // which is more stable than explicit Euler for the same computational cost.
    for (let i = 0; i < n; i++) {
      this.vehicles[i].position = wrapPosition(
        this.vehicles[i].position + this.vehicles[i].speed * dt,
        roadLength,
      );
    }

    // Phase 4: Re-sort vehicles by position.
    this.vehicles = sortVehicles(this.vehicles);

    // Phase 5: Collision safety check.
    // If any gap is negative (which shouldn't happen with reasonable parameters
    // and dt, but we enforce it as a hard constraint), clamp the follower's
    // position to maintain a zero gap and match the leader's speed.
    this.enforceMinimumGaps();

    this.time += dt;
    this.stepCount++;
    this.activityTracker.update(this.vehicles, this.time, this.config);
  }

  /**
   * Enforce minimum gap constraint.
   *
   * Iterates through sorted vehicles and ensures no vehicle overlaps its leader.
   * If overlap is detected, the follower is pushed back and its speed is capped.
   *
   * This is a safety net, not the primary dynamics. With correct IDM parameters
   * and a reasonable timestep, this should almost never activate.
   */
  private enforceMinimumGaps(): void {
    const { roadLength, vehicleLength } = this.config;
    const n = this.vehicles.length;

    for (let i = 0; i < n; i++) {
      const leaderIdx = getLeaderIndex(i, n);
      const gap = computeGap(
        this.vehicles[i],
        this.vehicles[leaderIdx],
        roadLength,
        vehicleLength,
      );

      if (gap < 0) {
        // Push follower back so gap = 0
        this.vehicles[i].position = wrapPosition(
          this.vehicles[leaderIdx].position - vehicleLength,
          roadLength,
        );
        // Cap follower speed to leader speed (prevent further closing)
        this.vehicles[i].speed = Math.min(
          this.vehicles[i].speed,
          this.vehicles[leaderIdx].speed,
        );
      }
    }
  }

  /**
   * Apply a speed perturbation to a single vehicle.
   *
   * This implements the "Perturb Traffic" feature. One vehicle's speed is
   * temporarily reduced. Whether the disturbance dissipates or amplifies
   * into a jam is determined entirely by the IDM dynamics and traffic density.
   *
   * @param vehicleIndex  Index in the sorted vehicle array (0-based).
   *                      If omitted, perturbs vehicle 0.
   * @param factor        Speed multiplier (0–1). Default 0.3 = reduce to 30% of current speed.
   */
  perturbVehicle(vehicleIndex: number = 0, factor: number = 0.3): void {
    if (vehicleIndex < 0 || vehicleIndex >= this.vehicles.length) return;
    this.vehicles[vehicleIndex].speed *= factor;
    // Ensure speed stays non-negative
    this.vehicles[vehicleIndex].speed = Math.max(
      0,
      this.vehicles[vehicleIndex].speed,
    );
  }

  /**
   * Update IDM parameters during a running simulation.
   *
   * Only v₀ (desired speed) and T (time headway) can be changed live.
   * Other parameters require a full reset.
   *
   * After updating, we verify that the new parameters don't create an
   * invalid state (e.g., vehicles now overlapping because of different
   * spacing requirements). The next simulation step will naturally adjust
   * via IDM braking.
   */
  updateIDMParams(updates: Partial<Pick<IDMParams, 'v0' | 'T'>>): void {
    if (updates.v0 !== undefined && updates.v0 > 0) {
      this.config.idm.v0 = updates.v0;
    }
    if (updates.T !== undefined && updates.T >= 0) {
      this.config.idm.T = updates.T;
    }
    // No need to clamp positions — IDM will naturally brake if vehicles
    // are now too close for the new time headway. This avoids artificial
    // state manipulation while keeping the simulation physically consistent.
  }

  /**
   * Get an immutable snapshot of the current simulation state.
   *
   * The snapshot includes computed traffic metrics, so consumers don't
   * need to import the metrics module.
   */
  getState(): SimulationState {
    const metrics = computeAllMetrics(
      this.vehicles,
      this.config.roadLength,
      this.config.idm.v0,
    );

    return {
      vehicles: this.vehicles.map((v) => ({ ...v })),
      time: this.time,
      stepCount: this.stepCount,
      config: {
        ...this.config,
        idm: { ...this.config.idm },
      },
      metrics,
    };
  }

  /**
   * Reset the simulation with a new configuration, or re-initialize
   * with the current configuration.
   */
  reset(config?: SimulationConfig): void {
    if (config) {
      this.config = { ...config, idm: { ...config.idm } };
    }
    this.vehicles = [];
    this.time = 0;
    this.stepCount = 0;
    this.rng = new SeededRandom(this.config.seed);
    this.initialize();
  }

  /**
   * Get the current number of vehicles.
   */
  getVehicleCount(): number {
    return this.vehicles.length;
  }

  /**
   * Get the current simulation time.
   */
  getTime(): number {
    return this.time;
  }

  /**
   * Compute live IDM diagnostics for a single vehicle.
   */
  getVehicleDiagnostics(vehicleId: number): VehicleDiagnostics | null {
    return computeVehicleDiagnostics(vehicleId, this.vehicles, this.config);
  }

  /**
   * Get recent driving activity events for a vehicle (up to 10 events, newest first).
   */
  getVehicleActivityHistory(
    vehicleId: number,
  ): ReadonlyArray<VehicleActivityEvent> {
    return this.activityTracker.getHistory(vehicleId);
  }
}
