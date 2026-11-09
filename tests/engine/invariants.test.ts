import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/engine/Simulation';
import {
  SimulationConfig,
  DEFAULT_CONFIG,
  DEFAULT_IDM_PARAMS,
  PRESET_STABLE,
  PRESET_UNSTABLE,
} from '../../src/engine/SimulationConfig';
import { computeGap, getLeaderIndex } from '../../src/engine/Road';

/**
 * Invariant tests verify that fundamental physical constraints are maintained
 * at EVERY simulation step, not just at the end. These are the most important
 * correctness tests for the simulation engine.
 *
 * Invariants tested:
 *   1. Speed is always >= 0 (no backward driving)
 *   2. Gaps are always >= 0 (no overlapping vehicles)
 *   3. Vehicle count is conserved
 *   4. All values are finite (no NaN/Infinity)
 *   5. Positions are within [0, roadLength)
 */

/**
 * Run a simulation for the given number of steps and check invariants
 * at every single step.
 */
function assertInvariantsForConfig(
  config: SimulationConfig,
  steps: number,
  label: string,
): void {
  const sim = new Simulation(config);

  for (let step = 0; step < steps; step++) {
    sim.step();
    const state = sim.getState();
    const n = state.vehicles.length;

    // Invariant: vehicle count conservation
    expect(n).toBe(config.vehicleCount);

    for (let i = 0; i < n; i++) {
      const v = state.vehicles[i];

      // Invariant: speed non-negativity
      expect(v.speed).toBeGreaterThanOrEqual(
        0,
        `[${label}] step ${step}, vehicle ${v.id}: speed ${v.speed} is negative`,
      );

      // Invariant: finite values
      expect(Number.isFinite(v.speed)).toBe(true);
      expect(Number.isFinite(v.position)).toBe(true);
      expect(Number.isFinite(v.acceleration)).toBe(true);

      // Invariant: position in range
      expect(v.position).toBeGreaterThanOrEqual(0);
      expect(v.position).toBeLessThan(config.roadLength);

      // Invariant: non-negative gap
      const leaderIdx = getLeaderIndex(i, n);
      const gap = computeGap(
        v,
        state.vehicles[leaderIdx],
        config.roadLength,
        config.vehicleLength,
      );
      expect(gap).toBeGreaterThanOrEqual(
        0,
        `[${label}] step ${step}, vehicle ${v.id}: gap ${gap} is negative (collision!)`,
      );
    }
  }
}

describe('Invariants — default configuration', () => {
  it('maintains all invariants over 2000 steps', () => {
    assertInvariantsForConfig(DEFAULT_CONFIG, 2000, 'default');
  });
});

describe('Invariants — stable preset', () => {
  it('maintains all invariants over 2000 steps', () => {
    assertInvariantsForConfig(PRESET_STABLE, 2000, 'stable');
  });
});

describe('Invariants — unstable preset', () => {
  it('maintains all invariants over 2000 steps', () => {
    assertInvariantsForConfig(PRESET_UNSTABLE, 2000, 'unstable');
  });
});

describe('Invariants — high density (stress test)', () => {
  it('maintains invariants with dense traffic', () => {
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      vehicleCount: 60,
      seed: 777,
    };
    assertInvariantsForConfig(config, 2000, 'high-density');
  });
});

describe('Invariants — very high density (near capacity)', () => {
  it('maintains invariants near maximum packing', () => {
    // With 5m vehicles on a 1000m road, max ~200 vehicles
    // 100 vehicles = 50% of max density — very congested
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      vehicleCount: 100,
      seed: 999,
    };
    assertInvariantsForConfig(config, 1000, 'very-high-density');
  });
});

describe('Invariants — low density', () => {
  it('maintains invariants with sparse traffic', () => {
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      vehicleCount: 5,
      seed: 111,
    };
    assertInvariantsForConfig(config, 2000, 'low-density');
  });
});

describe('Invariants — single vehicle', () => {
  it('maintains invariants with one vehicle', () => {
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      vehicleCount: 1,
      seed: 42,
    };
    assertInvariantsForConfig(config, 1000, 'single-vehicle');
  });
});

describe('Invariants — after perturbation', () => {
  it('maintains invariants after perturbing a vehicle', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    // Run for a while to reach steady state
    for (let i = 0; i < 200; i++) sim.step();

    // Perturb vehicle 0 (brake hard)
    sim.perturbVehicle(0, 0.1);

    // Run many more steps — invariants must hold as the perturbation propagates
    for (let step = 0; step < 2000; step++) {
      sim.step();
      const state = sim.getState();
      const n = state.vehicles.length;

      for (let i = 0; i < n; i++) {
        expect(state.vehicles[i].speed).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(state.vehicles[i].speed)).toBe(true);

        const leaderIdx = getLeaderIndex(i, n);
        const gap = computeGap(
          state.vehicles[i],
          state.vehicles[leaderIdx],
          DEFAULT_CONFIG.roadLength,
          DEFAULT_CONFIG.vehicleLength,
        );
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('Invariants — after live parameter changes', () => {
  it('maintains invariants after reducing v₀ mid-simulation', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    for (let i = 0; i < 200; i++) sim.step();

    sim.updateIDMParams({ v0: 15 }); // Halve desired speed

    for (let step = 0; step < 2000; step++) {
      sim.step();
      const state = sim.getState();
      const n = state.vehicles.length;
      for (let i = 0; i < n; i++) {
        expect(state.vehicles[i].speed).toBeGreaterThanOrEqual(0);
        const leaderIdx = getLeaderIndex(i, n);
        const gap = computeGap(
          state.vehicles[i],
          state.vehicles[leaderIdx],
          state.config.roadLength,
          state.config.vehicleLength,
        );
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('maintains invariants after increasing T mid-simulation', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    for (let i = 0; i < 200; i++) sim.step();

    sim.updateIDMParams({ T: 3.0 }); // Double time headway

    for (let step = 0; step < 2000; step++) {
      sim.step();
      const state = sim.getState();
      const n = state.vehicles.length;
      for (let i = 0; i < n; i++) {
        expect(state.vehicles[i].speed).toBeGreaterThanOrEqual(0);
        const leaderIdx = getLeaderIndex(i, n);
        const gap = computeGap(
          state.vehicles[i],
          state.vehicles[leaderIdx],
          state.config.roadLength,
          state.config.vehicleLength,
        );
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('Invariants — timestep sensitivity', () => {
  it('maintains invariants with smaller dt (0.01s)', () => {
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      dt: 0.01,
      vehicleCount: 40,
      seed: 42,
    };
    assertInvariantsForConfig(config, 2000, 'small-dt');
  });

  it('maintains invariants with larger dt (0.1s)', () => {
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      dt: 0.1,
      vehicleCount: 40,
      seed: 42,
    };
    assertInvariantsForConfig(config, 1000, 'large-dt');
  });

  it('maintains invariants with aggressive dt (0.2s)', () => {
    // This is an unreasonably large timestep — testing the safety net
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      dt: 0.2,
      vehicleCount: 40,
      seed: 42,
    };
    assertInvariantsForConfig(config, 500, 'aggressive-dt');
  });
});

describe('Determinism', () => {
  it('same seed produces identical trajectories', () => {
    const sim1 = new Simulation(DEFAULT_CONFIG);
    const sim2 = new Simulation(DEFAULT_CONFIG);

    for (let i = 0; i < 1000; i++) {
      sim1.step();
      sim2.step();
    }

    const state1 = sim1.getState();
    const state2 = sim2.getState();

    expect(state1.time).toBe(state2.time);
    expect(state1.vehicles.length).toBe(state2.vehicles.length);

    for (let i = 0; i < state1.vehicles.length; i++) {
      expect(state1.vehicles[i].position).toBe(state2.vehicles[i].position);
      expect(state1.vehicles[i].speed).toBe(state2.vehicles[i].speed);
      expect(state1.vehicles[i].acceleration).toBe(
        state2.vehicles[i].acceleration,
      );
    }
  });

  it('different seeds produce different trajectories', () => {
    const config1: SimulationConfig = { ...DEFAULT_CONFIG, seed: 1 };
    const config2: SimulationConfig = { ...DEFAULT_CONFIG, seed: 2 };

    const sim1 = new Simulation(config1);
    const sim2 = new Simulation(config2);

    for (let i = 0; i < 100; i++) {
      sim1.step();
      sim2.step();
    }

    const state1 = sim1.getState();
    const state2 = sim2.getState();

    // At least some vehicle positions should differ
    let anyDifferent = false;
    for (let i = 0; i < state1.vehicles.length; i++) {
      if (state1.vehicles[i].position !== state2.vehicles[i].position) {
        anyDifferent = true;
        break;
      }
    }
    expect(anyDifferent).toBe(true);
  });

  it('reset reproduces the initial state exactly', () => {
    const sim = new Simulation(DEFAULT_CONFIG);
    const initialState = sim.getState();

    for (let i = 0; i < 500; i++) sim.step();
    sim.reset();

    const resetState = sim.getState();
    expect(resetState.vehicles).toEqual(initialState.vehicles);
    expect(resetState.time).toBe(0);
  });

  it('determinism survives perturbation', () => {
    const sim1 = new Simulation(DEFAULT_CONFIG);
    const sim2 = new Simulation(DEFAULT_CONFIG);

    for (let i = 0; i < 200; i++) {
      sim1.step();
      sim2.step();
    }

    // Both get the same perturbation
    sim1.perturbVehicle(0, 0.3);
    sim2.perturbVehicle(0, 0.3);

    for (let i = 0; i < 500; i++) {
      sim1.step();
      sim2.step();
    }

    const state1 = sim1.getState();
    const state2 = sim2.getState();

    for (let i = 0; i < state1.vehicles.length; i++) {
      expect(state1.vehicles[i].position).toBe(state2.vehicles[i].position);
      expect(state1.vehicles[i].speed).toBe(state2.vehicles[i].speed);
    }
  });
});

describe('Invariants — multiple seeds', () => {
  // Run invariant checks across several seeds to catch seed-specific issues
  const seeds = [1, 42, 100, 200, 314, 777, 999, 12345];

  for (const seed of seeds) {
    it(`maintains invariants with seed ${seed}`, () => {
      const config: SimulationConfig = {
        ...DEFAULT_CONFIG,
        vehicleCount: 35,
        seed,
      };
      assertInvariantsForConfig(config, 1000, `seed-${seed}`);
    });
  }
});
