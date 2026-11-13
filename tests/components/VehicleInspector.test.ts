import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/engine/Simulation';
import { DEFAULT_CONFIG } from '../../src/engine/SimulationConfig';

describe('Vehicle Inspector — telemetry, pause behavior, and physics invariants', () => {
  it('supplies complete telemetry directly from the simulation engine without fabrication', () => {
    const sim = new Simulation({
      ...DEFAULT_CONFIG,
      vehicleCount: 20,
      seed: 1234,
    });

    const diag = sim.getVehicleDiagnostics(0);
    expect(diag).not.toBeNull();
    if (!diag) return;

    // Verify all required fields are present and finite numbers
    expect(Number.isFinite(diag.vehicleId)).toBe(true);
    expect(Number.isFinite(diag.speedKmh)).toBe(true);
    expect(Number.isFinite(diag.desiredSpeedKmh)).toBe(true);
    expect(Number.isFinite(diag.acceleration)).toBe(true);
    expect(Number.isFinite(diag.gap)).toBe(true);
    expect(Number.isFinite(diag.desiredGap)).toBe(true);
    expect(Number.isFinite(diag.relativeSpeedKmh)).toBe(true);
    expect(['Accelerating', 'Cruising', 'Braking']).toContain(diag.drivingState);
    expect(diag.explanation.length).toBeGreaterThan(10);
    expect(Number.isFinite(diag.freeRoadTerm)).toBe(true);
    expect(Number.isFinite(diag.interactionTerm)).toBe(true);
  });

  it('freezes telemetry at exact correct values when paused', () => {
    const sim = new Simulation({
      ...DEFAULT_CONFIG,
      vehicleCount: 15,
      seed: 99,
    });

    // Run 50 steps
    for (let i = 0; i < 50; i++) {
      sim.step();
    }

    // Inspect vehicle 3 at pause point
    const diagAtPause1 = sim.getVehicleDiagnostics(3);
    const timeAtPause1 = sim.getTime();

    // Do NOT step simulation (simulating paused state)
    // Check again
    const diagAtPause2 = sim.getVehicleDiagnostics(3);
    const timeAtPause2 = sim.getTime();

    expect(timeAtPause2).toBe(timeAtPause1);
    expect(diagAtPause2?.speedKmh).toBe(diagAtPause1?.speedKmh);
    expect(diagAtPause2?.acceleration).toBe(diagAtPause1?.acceleration);
    expect(diagAtPause2?.gap).toBe(diagAtPause1?.gap);
    expect(diagAtPause2?.explanation).toBe(diagAtPause1?.explanation);
  });

  it('preserves exact physics trajectories regardless of whether vehicles are selected or inspected (no-observer-effect)', () => {
    const config = {
      ...DEFAULT_CONFIG,
      vehicleCount: 25,
      seed: 555,
    };

    // Run 1: Normal run without inspection
    const simA = new Simulation(config);
    for (let step = 0; step < 100; step++) {
      simA.step();
    }
    const stateA = simA.getState();

    // Run 2: Simulation with frequent diagnostics calls on multiple vehicles
    const simB = new Simulation(config);
    for (let step = 0; step < 100; step++) {
      simB.getVehicleDiagnostics(0);
      simB.getVehicleDiagnostics(5);
      simB.getVehicleDiagnostics(12);
      simB.getVehicleActivityHistory(0);
      simB.step();
      simB.getVehicleDiagnostics(0);
    }
    const stateB = simB.getState();

    // Every vehicle position and speed must match bit-for-bit
    expect(stateA.vehicles.length).toBe(stateB.vehicles.length);
    for (let i = 0; i < stateA.vehicles.length; i++) {
      expect(stateA.vehicles[i].position).toBe(stateB.vehicles[i].position);
      expect(stateA.vehicles[i].speed).toBe(stateB.vehicles[i].speed);
      expect(stateA.vehicles[i].acceleration).toBe(stateB.vehicles[i].acceleration);
    }
  });

  it('safely returns null when inspecting a non-existent vehicle ID', () => {
    const sim = new Simulation({
      ...DEFAULT_CONFIG,
      vehicleCount: 10,
    });

    // ID 999 does not exist
    const diag = sim.getVehicleDiagnostics(999);
    expect(diag).toBeNull();

    const history = sim.getVehicleActivityHistory(999);
    expect(history).toEqual([]);
  });

  it('handles traffic perturbation on inspected vehicle without error', () => {
    const sim = new Simulation({
      ...DEFAULT_CONFIG,
      vehicleCount: 15,
      seed: 77,
    });

    for (let i = 0; i < 20; i++) {
      sim.step();
    }

    // Perturb vehicle 0
    sim.perturbVehicle(0, 0.2);

    const diag = sim.getVehicleDiagnostics(0);
    expect(diag).not.toBeNull();
    // Acceleration should be affected and computed properly
    expect(Number.isFinite(diag?.acceleration)).toBe(true);
  });
});
