/**
 * Vehicle Diagnostics and Rule-Based IDM Decision Explanations.
 *
 * Provides pure, deterministic diagnostics for individual vehicles:
 *   - Leader identification with periodic circular wraparound
 *   - Bumper-to-bumper distance and relative speed (approach rate)
 *   - Desired following gap (s*) and IDM acceleration terms (free-road vs braking)
 *   - Driving state classification (Accelerating, Cruising, Braking)
 *   - Clear physical explanations grounded in actual IDM dynamics
 */

import { Vehicle } from './Vehicle';
import { SimulationConfig } from './SimulationConfig';
import { computeGap, getLeaderIndex } from './Road';

export type DrivingState = 'Accelerating' | 'Cruising' | 'Braking';

export interface VehicleDiagnostics {
  /** Unique vehicle identifier */
  readonly vehicleId: number;
  /** Unique identifier of the vehicle directly ahead */
  readonly leaderId: number;
  /** Current position on the circular road (m) */
  readonly position: number;
  /** Current speed (m/s) */
  readonly speedMs: number;
  /** Current speed (km/h) */
  readonly speedKmh: number;
  /** Desired speed v₀ (m/s) */
  readonly desiredSpeedMs: number;
  /** Desired speed v₀ (km/h) */
  readonly desiredSpeedKmh: number;
  /** Current acceleration (m/s²). Clamped/integrated actual acceleration. */
  readonly acceleration: number;
  /** Raw IDM theoretical acceleration (m/s²) before numerical integration */
  readonly idmAcceleration: number;
  /** Free-road acceleration component: a * (1 - (v/v₀)^δ) (m/s²) */
  readonly freeRoadTerm: number;
  /** Interaction / braking deceleration component: a * (s_star / s)² (m/s²) */
  readonly interactionTerm: number;
  /** Net bumper-to-bumper gap to leader (m) */
  readonly gap: number;
  /** Dynamic desired following gap s*(v, Δv) (m) */
  readonly desiredGap: number;
  /** Relative speed to leader: v_self - v_leader (m/s). Positive = closing in. */
  readonly relativeSpeedMs: number;
  /** Relative speed to leader: v_self - v_leader (km/h). Positive = closing in. */
  readonly relativeSpeedKmh: number;
  /** Classified driving state */
  readonly drivingState: DrivingState;
  /** Plain-language deterministic physical explanation */
  readonly explanation: string;
  /** Whether the vehicle is the only one on the road */
  readonly isSingleVehicle: boolean;
}

/**
 * Classify a vehicle's driving state based on acceleration and speed.
 */
export function classifyDrivingState(
  acceleration: number,
  speedMs: number = 0,
): DrivingState {
  // Clear acceleration threshold
  if (acceleration > 0.08) {
    return 'Accelerating';
  }
  // Clear braking threshold
  if (acceleration < -0.08) {
    return 'Braking';
  }
  // If stopped and not accelerating, consider it cruising/stationary
  if (speedMs < 0.1 && Math.abs(acceleration) <= 0.08) {
    return 'Cruising';
  }
  // Near zero acceleration: cruising
  return 'Cruising';
}

/**
 * Generate a deterministic, rule-based explanation of driver behavior
 * grounded strictly in the IDM force balance and vehicle kinematic state.
 */
export function explainDrivingDecision(diag: {
  speedKmh: number;
  desiredSpeedKmh: number;
  acceleration: number;
  freeRoadTerm: number;
  interactionTerm: number;
  gap: number;
  desiredGap: number;
  relativeSpeedKmh: number;
  drivingState: DrivingState;
  isSingleVehicle: boolean;
}): string {
  const {
    speedKmh,
    desiredSpeedKmh,
    acceleration,
    freeRoadTerm,
    interactionTerm,
    gap,
    desiredGap,
    relativeSpeedKmh,
    drivingState,
    isSingleVehicle,
  } = diag;

  // Edge case: single vehicle on track
  if (isSingleVehicle) {
    if (drivingState === 'Accelerating') {
      return `Accelerating toward desired speed (${desiredSpeedKmh.toFixed(0)} km/h) on an open road with no traffic ahead.`;
    }
    if (drivingState === 'Cruising') {
      return `Cruising at desired speed (${desiredSpeedKmh.toFixed(0)} km/h) with no traffic ahead.`;
    }
    return `Coasting or decelerating toward desired speed on an open road.`;
  }

  // Standstill or near-standstill in traffic
  if (speedKmh < 1.0) {
    if (drivingState === 'Accelerating') {
      return `Starting from a standstill as the vehicle ahead creates space.`;
    }
    return `Stationary in congested traffic, waiting for the vehicle ahead to advance.`;
  }

  // Braking state
  if (drivingState === 'Braking') {
    // Severe / emergency braking
    if (acceleration < -2.0) {
      if (relativeSpeedKmh > 5.0) {
        return `Hard braking due to rapid approach toward a slower vehicle ahead (closing at ${relativeSpeedKmh.toFixed(1)} km/h).`;
      }
      return `Hard braking because following gap (${gap.toFixed(1)} m) is critically below desired safe distance (${desiredGap.toFixed(1)} m).`;
    }

    // Leader is moving noticeably slower and closing in
    if (relativeSpeedKmh > 2.0) {
      if (gap <= desiredGap * 1.25) {
        return `Braking because the vehicle ahead is slower (closing at ${relativeSpeedKmh.toFixed(1)} km/h) and following gap (${gap.toFixed(1)} m) is smaller than desired (${desiredGap.toFixed(1)} m).`;
      }
      return `Braking because the vehicle ahead is slower, closing the gap at ${relativeSpeedKmh.toFixed(1)} km/h.`;
    }

    // Gap smaller than desired gap (even if relative speed is near 0)
    if (gap < desiredGap) {
      return `Braking to increase following gap (${gap.toFixed(1)} m) back toward the desired safe distance (${desiredGap.toFixed(1)} m).`;
    }

    // Above desired speed on open road
    if (freeRoadTerm < 0 && speedKmh > desiredSpeedKmh + 1.0) {
      return `Decelerating toward desired speed (${desiredSpeedKmh.toFixed(0)} km/h) because current speed is above target.`;
    }

    // General braking from interaction force exceeding free-road acceleration
    return `Braking as interaction force (${interactionTerm.toFixed(2)} m/s²) exceeds free-road acceleration (${freeRoadTerm.toFixed(2)} m/s²).`;
  }

  // Accelerating state
  if (drivingState === 'Accelerating') {
    // Open road or very wide gap
    if (gap > desiredGap * 1.5 || interactionTerm < 0.15) {
      return `Accelerating toward desired speed (${desiredSpeedKmh.toFixed(0)} km/h) because the vehicle ahead is sufficiently far away.`;
    }

    // Leader is pulling away
    if (relativeSpeedKmh < -2.0) {
      return `Accelerating as the vehicle ahead pulls away (opening gap at ${Math.abs(relativeSpeedKmh).toFixed(1)} km/h).`;
    }

    // Free road force exceeds interaction braking
    if (freeRoadTerm > interactionTerm) {
      return `Accelerating toward desired speed while maintaining safe following distance behind the leader.`;
    }

    return `Accelerating toward target speed (${desiredSpeedKmh.toFixed(0)} km/h).`;
  }

  // Cruising state (balanced forces)
  if (Math.abs(speedKmh - desiredSpeedKmh) < 2.0 && gap > desiredGap * 1.2) {
    return `Cruising smoothly near desired speed (${desiredSpeedKmh.toFixed(0)} km/h) on an open stretch of road.`;
  }

  if (Math.abs(relativeSpeedKmh) < 2.0 && gap < desiredGap * 1.3) {
    return `Maintaining speed matched to the vehicle ahead because acceleration and braking forces are approximately balanced.`;
  }

  return `Maintaining speed because acceleration (${freeRoadTerm.toFixed(2)} m/s²) and braking forces (${interactionTerm.toFixed(2)} m/s²) are approximately balanced.`;
}

/**
 * Compute full diagnostics for a single vehicle from the current simulation state.
 *
 * @param vehicleId   ID of the vehicle to inspect
 * @param vehicles    Current array of vehicles (sorted by position)
 * @param config      Active simulation configuration
 * @returns           VehicleDiagnostics object, or null if vehicle not found
 */
export function computeVehicleDiagnostics(
  vehicleId: number,
  vehicles: ReadonlyArray<Vehicle>,
  config: SimulationConfig,
): VehicleDiagnostics | null {
  const n = vehicles.length;
  if (n === 0) return null;

  const idx = vehicles.findIndex((v) => v.id === vehicleId);
  if (idx === -1) return null;

  const vehicle = vehicles[idx];
  const { roadLength, vehicleLength, idm } = config;
  const { v0, s0, T, a, b, delta } = idm;

  const isSingleVehicle = n === 1;
  const leaderIdx = isSingleVehicle ? idx : getLeaderIndex(idx, n);
  const leader = vehicles[leaderIdx];
  const leaderId = leader.id;

  const gap = computeGap(vehicle, leader, roadLength, vehicleLength);
  const relativeSpeedMs = isSingleVehicle ? 0 : vehicle.speed - leader.speed;
  const approachRate = relativeSpeedMs;

  // Safe gap prevents division by zero
  const safeGap = Math.max(gap, 0.01);

  // Dynamic desired gap s*(v, Δv)
  const interactionTermCalc =
    (vehicle.speed * approachRate) / (2 * Math.sqrt(a * b));
  const desiredGap = s0 + Math.max(0, vehicle.speed * T + interactionTermCalc);

  // IDM components
  const freeRoadRatio = 1 - Math.pow(vehicle.speed / v0, delta);
  const freeRoadTerm = a * freeRoadRatio;
  const interactionRatio = Math.pow(desiredGap / safeGap, 2);
  const interactionTerm = a * interactionRatio;
  const idmAcceleration = freeRoadTerm - interactionTerm;

  // Actual acceleration is the vehicle's simulated acceleration
  const acceleration = vehicle.acceleration;

  const speedMs = vehicle.speed;
  const speedKmh = speedMs * 3.6;
  const desiredSpeedMs = v0;
  const desiredSpeedKmh = v0 * 3.6;
  const relativeSpeedKmh = relativeSpeedMs * 3.6;

  const drivingState = classifyDrivingState(acceleration, speedMs);

  const explanation = explainDrivingDecision({
    speedKmh,
    desiredSpeedKmh,
    acceleration,
    freeRoadTerm,
    interactionTerm,
    gap,
    desiredGap,
    relativeSpeedKmh,
    drivingState,
    isSingleVehicle,
  });

  return {
    vehicleId,
    leaderId,
    position: vehicle.position,
    speedMs,
    speedKmh,
    desiredSpeedMs,
    desiredSpeedKmh,
    acceleration,
    idmAcceleration,
    freeRoadTerm,
    interactionTerm,
    gap,
    desiredGap,
    relativeSpeedMs,
    relativeSpeedKmh,
    drivingState,
    explanation,
    isSingleVehicle,
  };
}
