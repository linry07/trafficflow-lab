import { describe, it, expect } from 'vitest';
import {
  SIMULATION_PRESETS,
  Simulation,
  PresetKey,
} from '../../src/engine';

describe('Simulation Presets', () => {
  const presetKeys: PresetKey[] = [
    'stable',
    'unstable',
    'speed-limit',
    'autonomous',
    'aggressive',
  ];

  it.each(presetKeys)('preset "%s" has valid physical configuration and can step smoothly', (key) => {
    const preset = SIMULATION_PRESETS[key];
    expect(preset).toBeDefined();
    expect(preset.name).toBeTruthy();
    expect(preset.description).toBeTruthy();

    const config = preset.config;
    expect(config.vehicleCount).toBeGreaterThan(0);
    expect(config.roadLength).toBe(1000);
    expect(config.idm.v0).toBeGreaterThan(0);
    expect(config.idm.s0).toBeGreaterThan(0);
    expect(config.idm.T).toBeGreaterThan(0);
    expect(config.idm.a).toBeGreaterThan(0);
    expect(config.idm.b).toBeGreaterThan(0);

    // Initialise simulation and step 100 times (5 simulated seconds)
    const sim = new Simulation(config);
    expect(sim.getState().vehicles).toHaveLength(config.vehicleCount);

    for (let i = 0; i < 100; i++) {
      sim.step(config.dt);
    }

    const state = sim.getState();
    expect(state.metrics.averageSpeed).toBeGreaterThan(0);
    expect(state.vehicles.every((v) => Number.isFinite(v.position))).toBe(true);
    expect(state.vehicles.every((v) => v.speed >= 0)).toBe(true);
  });
});
