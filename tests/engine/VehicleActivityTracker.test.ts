import { describe, it, expect } from 'vitest';
import { VehicleActivityTracker } from '../../src/engine/VehicleActivityTracker';
import { Simulation } from '../../src/engine/Simulation';
import { createVehicle } from '../../src/engine/Vehicle';
import { DEFAULT_CONFIG } from '../../src/engine/SimulationConfig';

describe('VehicleActivityTracker — activity history and transition detection', () => {
  const config = {
    ...DEFAULT_CONFIG,
    roadLength: 1000,
    vehicleLength: 5,
  };

  it('initializes each vehicle with an initial state event at t=0', () => {
    const tracker = new VehicleActivityTracker();
    const v = createVehicle(0, 100, 25);
    tracker.initialize([v], config, 0);

    const history = tracker.getHistory(0);
    expect(history.length).toBe(1);
    expect(history[0].eventType).toBe('initial');
    expect(history[0].timestamp).toBe(0);
    expect(history[0].speedKmh).toBeCloseTo(90);
  });

  it('strictly bounds event retention to at most 10 events per vehicle (oldest discarded)', () => {
    const tracker = new VehicleActivityTracker(10, 0.05); // min duration 0.05s
    const v = createVehicle(0, 100, 25);
    tracker.initialize([v], config, 0);

    // Simulate 20 alternating transitions with sufficient time and strong acceleration
    for (let step = 1; step <= 25; step++) {
      const simTime = step * 0.5;
      // Alternate acceleration to trigger distinct transitions
      v.acceleration = step % 2 === 0 ? 1.5 : -1.5;
      tracker.update([v], simTime, config);
    }

    const history = tracker.getHistory(0);
    expect(history.length).toBeLessThanOrEqual(10);
    expect(history.length).toBe(10);

    // Ordering: newest first
    for (let i = 0; i < history.length - 1; i++) {
      expect(history[i].timestamp).toBeGreaterThanOrEqual(history[i + 1].timestamp);
    }
  });

  it('records significant deceleration (hard braking) events', () => {
    const tracker = new VehicleActivityTracker();
    const v = createVehicle(1, 100, 25);
    tracker.initialize([v], config, 0);

    // Sudden hard brake
    v.acceleration = -3.2;
    tracker.update([v], 1.0, config);

    const history = tracker.getHistory(1);
    const hardBrakeEvent = history.find((ev) => ev.eventType === 'hard_braking');
    expect(hardBrakeEvent).toBeDefined();
    expect(hardBrakeEvent?.state).toBe('Braking');
    expect(hardBrakeEvent?.summary).toContain('Deceleration');
  });

  it('applies hysteresis so noisy single-step fluctuations do not cause duplicate flapping', () => {
    const tracker = new VehicleActivityTracker(10, 0.25); // 0.25s hysteresis
    const v = createVehicle(0, 100, 25);
    v.acceleration = 0;
    tracker.initialize([v], config, 0);

    // Step 1: tiny fluctuation for 1 step (0.05s) with small magnitude
    v.acceleration = 0.09;
    tracker.update([v], 0.05, config);

    // Step 2: back to cruising immediately
    v.acceleration = 0.01;
    tracker.update([v], 0.1, config);

    const history = tracker.getHistory(0);
    // Should NOT have committed a transition to Accelerating because it did not persist
    expect(history.length).toBe(1);
  });

  it('clears and reinitializes history cleanly on reset', () => {
    const tracker = new VehicleActivityTracker();
    const v = createVehicle(0, 100, 25);
    tracker.initialize([v], config, 0);

    v.acceleration = -2.5;
    tracker.update([v], 1.0, config);
    expect(tracker.getHistory(0).length).toBeGreaterThan(1);

    tracker.reset([v], config, 0);
    const resetHistory = tracker.getHistory(0);
    expect(resetHistory.length).toBe(1);
    expect(resetHistory[0].timestamp).toBe(0);
  });

  it('is 100% deterministic: replaying identical simulation yields identical activity events at identical times', () => {
    const simConfig = {
      ...DEFAULT_CONFIG,
      vehicleCount: 20,
      seed: 42,
    };

    // Run simulation 1 for 100 steps
    const sim1 = new Simulation(simConfig);
    for (let i = 0; i < 100; i++) {
      sim1.step();
    }
    const history1 = sim1.getVehicleActivityHistory(0);

    // Run simulation 2 with same config for 100 steps
    const sim2 = new Simulation(simConfig);
    for (let i = 0; i < 100; i++) {
      sim2.step();
    }
    const history2 = sim2.getVehicleActivityHistory(0);

    expect(history1.length).toBe(history2.length);
    for (let i = 0; i < history1.length; i++) {
      expect(history1[i].timestamp).toBeCloseTo(history2[i].timestamp);
      expect(history1[i].state).toBe(history2[i].state);
      expect(history1[i].speedKmh).toBeCloseTo(history2[i].speedKmh);
      expect(history1[i].acceleration).toBeCloseTo(history2[i].acceleration);
    }
  });
});
