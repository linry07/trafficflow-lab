/**
 * Vehicle Activity History Tracker.
 *
 * Tracks meaningful behavioral events and state transitions for each vehicle
 * across simulation time with bounded memory retention (last 10 events per vehicle).
 *
 * Features:
 *   - Bounded retention: at most 10 events kept per vehicle (oldest discarded)
 *   - Hysteresis & duration thresholds to filter out noisy single-step fluctuations
 *   - Significant deceleration (hard braking) detection
 *   - Simulated-time timestamps and deterministic IDM-derived explanations
 *   - Completely deterministic and reproducible across scenario replays
 */

import { Vehicle } from './Vehicle';
import { SimulationConfig } from './SimulationConfig';
import {
  DrivingState,
  computeVehicleDiagnostics,
  classifyDrivingState,
} from './VehicleDiagnostics';

export type ActivityEventType = 'state_transition' | 'hard_braking' | 'initial';

export interface VehicleActivityEvent {
  /** Unique event identifier */
  readonly id: string;
  /** Simulation time in seconds when event occurred */
  readonly timestamp: number;
  /** Driving state after the event */
  readonly state: DrivingState;
  /** Type of event */
  readonly eventType: ActivityEventType;
  /** Speed at event time (km/h) */
  readonly speedKmh: number;
  /** Acceleration at event time (m/s²) */
  readonly acceleration: number;
  /** Bumper-to-bumper gap at event time (m) */
  readonly gap: number;
  /** Desired gap s* at event time (m) */
  readonly desiredGap: number;
  /** Relative speed to leader at event time (km/h) */
  readonly relativeSpeedKmh: number;
  /** Concise event summary title */
  readonly summary: string;
  /** Detailed IDM-derived physical explanation */
  readonly explanation: string;
}

interface VehicleTrackingState {
  currentState: DrivingState;
  candidateState: DrivingState | null;
  candidateStateStartTime: number;
  lastCommittedTime: number;
  isHardBraking: boolean;
  events: VehicleActivityEvent[];
}

export class VehicleActivityTracker {
  private trackingMap: Map<number, VehicleTrackingState>;
  private maxEventsPerVehicle: number;
  private minStateDuration: number; // Minimum seconds a new state must persist to commit (hysteresis)

  constructor(maxEventsPerVehicle: number = 10, minStateDuration: number = 0.2) {
    this.trackingMap = new Map();
    this.maxEventsPerVehicle = maxEventsPerVehicle;
    this.minStateDuration = minStateDuration;
  }

  /**
   * Initialize or reset tracking for all vehicles at t=0.
   */
  initialize(
    vehicles: ReadonlyArray<Vehicle>,
    config: SimulationConfig,
    simTime: number = 0,
  ): void {
    this.trackingMap.clear();

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const diag = computeVehicleDiagnostics(v.id, vehicles, config);
      const state = diag ? diag.drivingState : classifyDrivingState(v.acceleration, v.speed);

      const initialEvent: VehicleActivityEvent = {
        id: `ev-${v.id}-${simTime.toFixed(2)}-init`,
        timestamp: simTime,
        state,
        eventType: 'initial',
        speedKmh: diag ? diag.speedKmh : v.speed * 3.6,
        acceleration: diag ? diag.acceleration : v.acceleration,
        gap: diag ? diag.gap : 0,
        desiredGap: diag ? diag.desiredGap : 0,
        relativeSpeedKmh: diag ? diag.relativeSpeedKmh : 0,
        summary: `Initial State: ${state}`,
        explanation: diag ? diag.explanation : 'Initial simulation placement.',
      };

      this.trackingMap.set(v.id, {
        currentState: state,
        candidateState: null,
        candidateStateStartTime: simTime,
        lastCommittedTime: simTime,
        isHardBraking: false,
        events: [initialEvent],
      });
    }
  }

  /**
   * Update tracker on every simulation step.
   *
   * Analyzes transitions and significant deceleration while enforcing hysteresis
   * to keep logs meaningful without capturing physics noise.
   */
  update(
    vehicles: ReadonlyArray<Vehicle>,
    simTime: number,
    config: SimulationConfig,
  ): void {
    if (vehicles.length === 0) return;

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      let stateRecord = this.trackingMap.get(v.id);

      // Lazily create if new vehicle appeared
      if (!stateRecord) {
        const diag = computeVehicleDiagnostics(v.id, vehicles, config);
        const state = diag ? diag.drivingState : classifyDrivingState(v.acceleration, v.speed);
        stateRecord = {
          currentState: state,
          candidateState: null,
          candidateStateStartTime: simTime,
          lastCommittedTime: simTime,
          isHardBraking: false,
          events: [],
        };
        this.trackingMap.set(v.id, stateRecord);
      }

      const diag = computeVehicleDiagnostics(v.id, vehicles, config);
      if (!diag) continue;

      const rawState = diag.drivingState;
      const accel = diag.acceleration;

      // 1. Detect Hard Braking (significant deceleration event)
      if (accel < -2.0 && !stateRecord.isHardBraking) {
        stateRecord.isHardBraking = true;
        this.addEvent(stateRecord, {
          id: `ev-${v.id}-${simTime.toFixed(2)}-hardbrake`,
          timestamp: simTime,
          state: 'Braking',
          eventType: 'hard_braking',
          speedKmh: diag.speedKmh,
          acceleration: diag.acceleration,
          gap: diag.gap,
          desiredGap: diag.desiredGap,
          relativeSpeedKmh: diag.relativeSpeedKmh,
          summary: 'Significant Deceleration (Hard Braking)',
          explanation: diag.explanation,
        });
        stateRecord.currentState = 'Braking';
        stateRecord.candidateState = null;
        stateRecord.lastCommittedTime = simTime;
        continue;
      } else if (accel > -1.2) {
        stateRecord.isHardBraking = false;
      }

      // 2. Normal State Transitions with Hysteresis
      if (rawState !== stateRecord.currentState) {
        // High magnitude accelerations transition with less delay
        const isStrongTransition = Math.abs(accel) >= 0.5;

        if (stateRecord.candidateState !== rawState) {
          // Started candidate transition
          stateRecord.candidateState = rawState;
          stateRecord.candidateStateStartTime = simTime;
        }

        const candidateDuration = simTime - stateRecord.candidateStateStartTime;

        if (isStrongTransition || candidateDuration >= this.minStateDuration) {
          // Commit state transition
          const prevState = stateRecord.currentState;
          stateRecord.currentState = rawState;
          stateRecord.candidateState = null;
          stateRecord.lastCommittedTime = simTime;

          let summary: string;
          if (rawState === 'Braking') {
            summary =
              diag.relativeSpeedKmh > 2
                ? 'Transitioned to Braking (Approaching Slower Leader)'
                : 'Transitioned to Braking (Adjusting Following Gap)';
          } else if (rawState === 'Accelerating') {
            summary =
              prevState === 'Braking'
                ? 'Resumed Acceleration (Leader Cleared / Traffic Wave Passed)'
                : 'Began Accelerating toward Desired Speed';
          } else {
            summary = 'Cruising Speed Stabilized (Forces Balanced)';
          }

          this.addEvent(stateRecord, {
            id: `ev-${v.id}-${simTime.toFixed(2)}-trans`,
            timestamp: simTime,
            state: rawState,
            eventType: 'state_transition',
            speedKmh: diag.speedKmh,
            acceleration: diag.acceleration,
            gap: diag.gap,
            desiredGap: diag.desiredGap,
            relativeSpeedKmh: diag.relativeSpeedKmh,
            summary,
            explanation: diag.explanation,
          });
        }
      } else {
        // Raw state matches current state, reset candidate
        stateRecord.candidateState = null;
      }
    }
  }

  /**
   * Helper to push an event, keeping at most maxEventsPerVehicle (newest first).
   */
  private addEvent(
    stateRecord: VehicleTrackingState,
    event: VehicleActivityEvent,
  ): void {
    stateRecord.events.unshift(event);
    if (stateRecord.events.length > this.maxEventsPerVehicle) {
      stateRecord.events.pop();
    }
  }

  /**
   * Get activity events for a vehicle (newest first, up to maxEventsPerVehicle).
   */
  getHistory(vehicleId: number): ReadonlyArray<VehicleActivityEvent> {
    const record = this.trackingMap.get(vehicleId);
    return record ? record.events : [];
  }

  /**
   * Clear all tracked activity history.
   */
  clear(): void {
    this.trackingMap.clear();
  }

  /**
   * Reset tracking state for fresh simulation start.
   */
  reset(
    vehicles: ReadonlyArray<Vehicle>,
    config: SimulationConfig,
    simTime: number = 0,
  ): void {
    this.initialize(vehicles, config, simTime);
  }
}
