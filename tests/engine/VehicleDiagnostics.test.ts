import { describe, it, expect } from 'vitest';
import {
  computeVehicleDiagnostics,
  classifyDrivingState,
  explainDrivingDecision,
} from '../../src/engine/VehicleDiagnostics';
import { createVehicle } from '../../src/engine/Vehicle';
import { DEFAULT_CONFIG } from '../../src/engine/SimulationConfig';
import { computeAcceleration } from '../../src/engine/IDMModel';

describe('VehicleDiagnostics — physical calculations and rule-based explanations', () => {
  const config = {
    ...DEFAULT_CONFIG,
    roadLength: 1000,
    vehicleLength: 5,
  };

  it('correctly identifies leader across circular 1000m-to-0m boundary', () => {
    // Follower at 980m, leader at 20m
    const vFollower = createVehicle(1, 980, 25);
    const vLeader = createVehicle(2, 20, 25);
    const vehicles = [vLeader, vFollower]; // sorted by position: [20m, 980m]

    const diag = computeVehicleDiagnostics(1, vehicles, config);
    expect(diag).not.toBeNull();
    expect(diag?.leaderId).toBe(2);
    // Distance from 980m to 20m wrapping 1000m is 40m center-to-center.
    // Bumper-to-bumper net gap = 40m - 5m = 35m.
    expect(diag?.gap).toBeCloseTo(35);
  });

  it('calculates bumper-to-bumper gap and relative speed accurately', () => {
    const vA = createVehicle(10, 100, 30); // 30 m/s
    const vB = createVehicle(11, 150, 20); // 20 m/s (slower leader)
    const vehicles = [vA, vB];

    const diag = computeVehicleDiagnostics(10, vehicles, config);
    expect(diag).not.toBeNull();
    expect(diag?.gap).toBeCloseTo(45); // (150 - 100) - 5 = 45m
    expect(diag?.relativeSpeedMs).toBeCloseTo(10); // 30 - 20 = +10 m/s (closing in)
    expect(diag?.relativeSpeedKmh).toBeCloseTo(36); // 10 m/s * 3.6 = 36 km/h
  });

  it('matches exact IDM model acceleration and separates free-road vs interaction terms', () => {
    const vA = createVehicle(0, 100, 25);
    const vB = createVehicle(1, 140, 20);
    const vehicles = [vA, vB];

    const diag = computeVehicleDiagnostics(0, vehicles, config);
    expect(diag).not.toBeNull();

    // Direct IDM model computation
    const rawGap = 40 - config.vehicleLength; // 35m
    const approachRate = 25 - 20; // 5 m/s
    const directAccel = computeAcceleration(25, rawGap, approachRate, config.idm);

    expect(diag?.idmAcceleration).toBeCloseTo(directAccel);
    expect(diag?.freeRoadTerm - diag!.interactionTerm).toBeCloseTo(directAccel);
  });

  it('handles single-vehicle edge case (N=1) gracefully without errors', () => {
    const vSingle = createVehicle(0, 350, 25);
    const vehicles = [vSingle];

    const diag = computeVehicleDiagnostics(0, vehicles, config);
    expect(diag).not.toBeNull();
    expect(diag?.isSingleVehicle).toBe(true);
    expect(diag?.leaderId).toBe(0);
    expect(diag?.gap).toBe(config.roadLength - config.vehicleLength);
    expect(diag?.relativeSpeedMs).toBe(0);
    expect(diag?.explanation).toContain('no traffic ahead');
  });

  it('classifies driving states accurately based on acceleration threshold', () => {
    expect(classifyDrivingState(0.5, 20)).toBe('Accelerating');
    expect(classifyDrivingState(0.1, 20)).toBe('Accelerating');
    expect(classifyDrivingState(-0.1, 20)).toBe('Braking');
    expect(classifyDrivingState(-1.5, 20)).toBe('Braking');
    expect(classifyDrivingState(0.02, 20)).toBe('Cruising');
    expect(classifyDrivingState(-0.02, 20)).toBe('Cruising');
    expect(classifyDrivingState(0.0, 0.0)).toBe('Cruising');
  });

  it('generates physical, deterministic explanations for different traffic scenarios', () => {
    // 1. Braking behind slower vehicle with gap smaller than desired
    const explBraking = explainDrivingDecision({
      speedKmh: 80,
      desiredSpeedKmh: 120,
      acceleration: -1.2,
      freeRoadTerm: 0.8,
      interactionTerm: 2.0,
      gap: 18,
      desiredGap: 24,
      relativeSpeedKmh: 12,
      drivingState: 'Braking',
      isSingleVehicle: false,
    });
    expect(explBraking).toContain('Braking');
    expect(explBraking).toContain('ahead is slower');

    // 2. Accelerating on open road toward desired speed
    const explAccel = explainDrivingDecision({
      speedKmh: 60,
      desiredSpeedKmh: 120,
      acceleration: 1.1,
      freeRoadTerm: 1.2,
      interactionTerm: 0.1,
      gap: 120,
      desiredGap: 25,
      relativeSpeedKmh: 0,
      drivingState: 'Accelerating',
      isSingleVehicle: false,
    });
    expect(explAccel).toContain('Accelerating toward desired speed');

    // 3. Maintaining balanced cruising speed
    const explCruising = explainDrivingDecision({
      speedKmh: 119.5,
      desiredSpeedKmh: 120,
      acceleration: 0.01,
      freeRoadTerm: 0.05,
      interactionTerm: 0.04,
      gap: 90,
      desiredGap: 30,
      relativeSpeedKmh: 0,
      drivingState: 'Cruising',
      isSingleVehicle: false,
    });
    expect(explCruising).toContain('Cruising smoothly');

    // 4. Hard braking emergency event
    const explHardBrake = explainDrivingDecision({
      speedKmh: 70,
      desiredSpeedKmh: 120,
      acceleration: -2.8,
      freeRoadTerm: 0.9,
      interactionTerm: 3.7,
      gap: 10,
      desiredGap: 28,
      relativeSpeedKmh: 15,
      drivingState: 'Braking',
      isSingleVehicle: false,
    });
    expect(explHardBrake).toContain('Hard braking');

    // 5. Stationary in stopped traffic wave
    const explStopped = explainDrivingDecision({
      speedKmh: 0.2,
      desiredSpeedKmh: 120,
      acceleration: -0.01,
      freeRoadTerm: 1.4,
      interactionTerm: 1.41,
      gap: 2.2,
      desiredGap: 2.0,
      relativeSpeedKmh: 0,
      drivingState: 'Cruising',
      isSingleVehicle: false,
    });
    expect(explStopped).toContain('Stationary in congested traffic');
  });

  it('dynamically recalculates diagnostics when live IDM parameters change', () => {
    const vA = createVehicle(0, 100, 20);
    const vB = createVehicle(1, 130, 20);
    const vehicles = [vA, vB];

    // Diagnostic with default T = 1.2s
    const diag1 = computeVehicleDiagnostics(0, vehicles, config);

    // Diagnostic with increased safe headway T = 2.5s
    const updatedConfig = {
      ...config,
      idm: { ...config.idm, T: 2.5 },
    };
    const diag2 = computeVehicleDiagnostics(0, vehicles, updatedConfig);

    expect(diag2?.desiredGap).toBeGreaterThan(diag1!.desiredGap);
    expect(diag2?.interactionTerm).toBeGreaterThan(diag1!.interactionTerm);
  });
});
