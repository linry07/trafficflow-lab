import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/engine/Simulation';
import { SimulationConfig, DEFAULT_CONFIG, DEFAULT_IDM_PARAMS } from '../../src/engine/SimulationConfig';
import { computeGap, getLeaderIndex } from '../../src/engine/Road';

describe('Simulation — initialization', () => {
  it('creates the correct number of vehicles', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const state = sim.getState();
    expect(state.vehicles.length).toBe(DEFAULT_CONFIG.vehicleCount);
  });

  it('starts at time 0', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().stepCount).toBe(0);
  });

  it('places vehicles with all positive speeds', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const state = sim.getState();
    for (const v of state.vehicles) {
      expect(v.speed).toBeGreaterThanOrEqual(0);
    }
  });

  it('places vehicles sorted by position', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const state = sim.getState();
    for (let i = 1; i < state.vehicles.length; i++) {
      expect(state.vehicles[i].position).toBeGreaterThanOrEqual(
        state.vehicles[i - 1].position,
      );
    }
  });

  it('places vehicles with no initial overlaps', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const state = sim.getState();
    const n = state.vehicles.length;
    for (let i = 0; i < n; i++) {
      const leaderIdx = getLeaderIndex(i, n);
      const gap = computeGap(
        state.vehicles[i],
        state.vehicles[leaderIdx],
        DEFAULT_CONFIG.roadLength,
        DEFAULT_CONFIG.vehicleLength,
      );
      expect(gap).toBeGreaterThan(0);
    }
  });
});

describe('Simulation — stepping', () => {
  it('advances time by dt each step', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    sim.step();
    expect(sim.getState().time).toBeCloseTo(DEFAULT_CONFIG.dt);
    expect(sim.getState().stepCount).toBe(1);
  });

  it('advances time correctly over many steps', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const steps = 100;
    for (let i = 0; i < steps; i++) sim.step();
    expect(sim.getState().time).toBeCloseTo(steps * DEFAULT_CONFIG.dt, 5);
    expect(sim.getState().stepCount).toBe(steps);
  });

  it('conserves vehicle count over many steps', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    for (let i = 0; i < 500; i++) {
      sim.step();
      expect(sim.getVehicleCount()).toBe(DEFAULT_CONFIG.vehicleCount);
    }
  });

  it('handles stepping with zero vehicles', () => {
    const config: SimulationConfig = { ...DEFAULT_CONFIG, vehicleCount: 0 };
    const sim = new Simulation(config);
    sim.step();
    expect(sim.getState().time).toBeCloseTo(config.dt);
    expect(sim.getState().vehicles.length).toBe(0);
  });

  it('handles stepping with one vehicle', () => {
    const config: SimulationConfig = { ...DEFAULT_CONFIG, vehicleCount: 1 };
    const sim = new Simulation(config);
    for (let i = 0; i < 100; i++) sim.step();
    const state = sim.getState();
    expect(state.vehicles.length).toBe(1);
    // Single vehicle on the road: should accelerate toward v₀
    expect(state.vehicles[0].speed).toBeGreaterThan(0);
  });
});

describe('Simulation — perturbVehicle', () => {
  it('reduces the speed of the target vehicle', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const speedBefore = sim.getState().vehicles[0].speed;
    sim.perturbVehicle(0, 0.3);
    const speedAfter = sim.getState().vehicles[0].speed;
    expect(speedAfter).toBeCloseTo(speedBefore * 0.3, 5);
  });

  it('does not affect other vehicles', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const speedsBefore = sim.getState().vehicles.map((v) => v.speed);
    sim.perturbVehicle(0, 0.3);
    const speedsAfter = sim.getState().vehicles.map((v) => v.speed);
    for (let i = 1; i < speedsBefore.length; i++) {
      expect(speedsAfter[i]).toBe(speedsBefore[i]);
    }
  });

  it('ignores invalid vehicle index', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const stateBefore = sim.getState();
    sim.perturbVehicle(-1);
    sim.perturbVehicle(1000);
    const stateAfter = sim.getState();
    expect(stateAfter.vehicles).toEqual(stateBefore.vehicles);
  });

  it('clamps perturbed speed to non-negative', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    sim.perturbVehicle(0, 0);
    expect(sim.getState().vehicles[0].speed).toBe(0);
  });
});

describe('Simulation — updateIDMParams (live parameter changes)', () => {
  it('updates v₀ without resetting', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    for (let i = 0; i < 100; i++) sim.step();
    const timeBefore = sim.getState().time;
    sim.updateIDMParams({ v0: 25 });
    expect(sim.getState().config.idm.v0).toBe(25);
    expect(sim.getState().time).toBe(timeBefore); // Time not reset
  });

  it('updates T without resetting', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    for (let i = 0; i < 100; i++) sim.step();
    sim.updateIDMParams({ T: 2.0 });
    expect(sim.getState().config.idm.T).toBe(2.0);
  });

  it('rejects invalid values', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    sim.updateIDMParams({ v0: -5 }); // Should be ignored
    expect(sim.getState().config.idm.v0).toBe(DEFAULT_IDM_PARAMS.v0);
    sim.updateIDMParams({ T: -1 }); // Should be ignored
    expect(sim.getState().config.idm.T).toBe(DEFAULT_IDM_PARAMS.T);
  });

  it('does not cause collisions after reducing v₀', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    for (let i = 0; i < 100; i++) sim.step();
    // Dramatically reduce desired speed
    sim.updateIDMParams({ v0: 10 });
    // Run many more steps — IDM should brake smoothly
    for (let i = 0; i < 1000; i++) {
      sim.step();
      const state = sim.getState();
      const n = state.vehicles.length;
      for (let j = 0; j < n; j++) {
        const leaderIdx = getLeaderIndex(j, n);
        const gap = computeGap(
          state.vehicles[j],
          state.vehicles[leaderIdx],
          state.config.roadLength,
          state.config.vehicleLength,
        );
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('does not cause collisions after increasing T', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    for (let i = 0; i < 100; i++) sim.step();
    // Increase following time (vehicles want more space)
    sim.updateIDMParams({ T: 3.0 });
    for (let i = 0; i < 1000; i++) {
      sim.step();
      const state = sim.getState();
      const n = state.vehicles.length;
      for (let j = 0; j < n; j++) {
        const leaderIdx = getLeaderIndex(j, n);
        const gap = computeGap(
          state.vehicles[j],
          state.vehicles[leaderIdx],
          state.config.roadLength,
          state.config.vehicleLength,
        );
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('Simulation — reset', () => {
  it('resets time to zero', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    for (let i = 0; i < 100; i++) sim.step();
    sim.reset();
    expect(sim.getState().time).toBe(0);
    expect(sim.getState().stepCount).toBe(0);
  });

  it('produces identical state to fresh construction', () => {
    const sim1 = new Simulation(DEFAULT_CONFIG);
    const sim2 = new Simulation(DEFAULT_CONFIG);
    for (let i = 0; i < 100; i++) sim1.step();
    sim1.reset();
    expect(sim1.getState().vehicles).toEqual(sim2.getState().vehicles);
  });

  it('accepts a new config on reset', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const newConfig: SimulationConfig = { ...DEFAULT_CONFIG, vehicleCount: 10 };
    sim.reset(newConfig);
    expect(sim.getVehicleCount()).toBe(10);
  });
});

describe('Simulation — metrics', () => {
  it('provides valid metrics in state', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const state = sim.getState();
    expect(state.metrics.averageSpeed).toBeGreaterThan(0);
    expect(state.metrics.density).toBeGreaterThan(0);
    expect(state.metrics.flow).toBeGreaterThan(0);
    expect(state.metrics.congestionFraction).toBeGreaterThanOrEqual(0);
    expect(state.metrics.congestionFraction).toBeLessThanOrEqual(1);
  });

  it('metrics update after stepping', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const m1 = sim.getState().metrics;
    for (let i = 0; i < 100; i++) sim.step();
    const m2 = sim.getState().metrics;
    // Metrics should have changed (vehicles are moving and interacting)
    // At least some metric should differ
    const changed =
      m1.averageSpeed !== m2.averageSpeed ||
      m1.speedVariance !== m2.speedVariance;
    expect(changed).toBe(true);
  });
});
