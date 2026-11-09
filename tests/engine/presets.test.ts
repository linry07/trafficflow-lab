import { describe, it, expect } from 'vitest';
import {
  SIMULATION_PRESETS,
  Simulation,
  PRESET_STABLE,
  PRESET_UNSTABLE,
  PRESET_SPEED_LIMIT,
  PRESET_AUTONOMOUS,
  PRESET_AGGRESSIVE,
  PresetKey,
} from '../../src/engine';

describe('Simulation Presets — Physical Configuration & Behavioral Validation', () => {
  const presetKeys: PresetKey[] = [
    'stable',
    'unstable',
    'speed-limit',
    'autonomous',
    'aggressive',
  ];

  it.each(presetKeys)('preset "%s" has valid physical configuration and finite values', (key) => {
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
    expect(config.dt).toBe(0.05);

    const sim = new Simulation(config);
    expect(sim.getState().vehicles).toHaveLength(config.vehicleCount);
  });

  it('demonstrates that Low Density Baseline (15 cars) recovers completely from a speed perturbation', () => {
    const sim = new Simulation(PRESET_STABLE);
    // 1. Warm-up to steady state (60s)
    for (let i = 0; i < 1200; i++) sim.step();
    // 2. Introduce severe perturbation (brake to 25% speed)
    sim.perturbVehicle(0, 0.25);
    // 3. Allow 80s recovery
    for (let i = 0; i < 1600; i++) sim.step();

    const state = sim.getState();
    // In stable traffic, congestion completely disappears
    expect(state.metrics.congestionFraction).toBe(0);
    // Speed returns to closed-ring equilibrium (~27.5 m/s)
    expect(state.metrics.averageSpeed).toBeGreaterThan(25.0);
    expect(state.metrics.speedVariance).toBeLessThan(2.0);
  });

  it('demonstrates that High Density Baseline (40 cars) develops severe persistent stop-and-go waves', () => {
    const sim = new Simulation(PRESET_UNSTABLE);
    // 1. Warm-up
    for (let i = 0; i < 1200; i++) sim.step();
    // 2. Introduce perturbation
    sim.perturbVehicle(0, 0.25);
    // 3. Observe post-perturbation wave evolution
    for (let i = 0; i < 1600; i++) sim.step();

    const state = sim.getState();
    // String instability produces persistent stop-and-go waves:
    // Large portion of fleet is congested (>= 25%)
    expect(state.metrics.congestionFraction).toBeGreaterThanOrEqual(0.25);
    // Substantial speed heterogeneity across the loop
    expect(state.metrics.speedVariance).toBeGreaterThan(15.0);
    // Average speed collapses
    expect(state.metrics.averageSpeed).toBeLessThan(15.0);
  });

  it('demonstrates that Reduced Speed Limit (80 km/h, 35 cars) bounds speeds and mitigates congestion severity', () => {
    const sim = new Simulation(PRESET_SPEED_LIMIT);
    for (let i = 0; i < 1200; i++) sim.step();
    sim.perturbVehicle(0, 0.25);
    for (let i = 0; i < 1600; i++) sim.step();

    const state = sim.getState();
    // Speeds are bounded by the 80 km/h (22.2 m/s) limit
    expect(state.metrics.averageSpeed).toBeLessThanOrEqual(22.2);
    // Congestion fraction is markedly lower than the 40% observed in the 40-car baseline
    expect(state.metrics.congestionFraction).toBeLessThan(0.20);
  });

  it('demonstrates that Idealized Low Headway (T=0.8s, 35 cars) achieves higher throughput speed than human baseline', () => {
    const simCAV = new Simulation(PRESET_AUTONOMOUS);
    for (let i = 0; i < 1200; i++) simCAV.step();
    simCAV.perturbVehicle(0, 0.25);
    for (let i = 0; i < 1600; i++) simCAV.step();

    const stateCAV = simCAV.getState();
    // Reduced time headway (0.8s) allows 35 cars to maintain significantly higher average speed (> 18 m/s)
    // than 35 cars with standard human headway (T=1.5s, which crawls at ~12 m/s)
    expect(stateCAV.metrics.averageSpeed).toBeGreaterThan(18.0);
    expect(stateCAV.metrics.congestionFraction).toBeLessThan(0.10);
  });

  it('demonstrates that Aggressive Driving (140 km/h, T=0.7s, 30 cars) operates at high cruising speed', () => {
    const simAggressive = new Simulation(PRESET_AGGRESSIVE);
    for (let i = 0; i < 1200; i++) simAggressive.step();

    const stateAggressive = simAggressive.getState();
    // High desired speed allows vehicles to cruise near 110-140 km/h (~30 m/s)
    expect(stateAggressive.metrics.averageSpeed).toBeGreaterThan(28.0);
  });
});
