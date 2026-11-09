import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/engine/Simulation';
import { PRESET_STABLE, PRESET_UNSTABLE } from '../../src/engine/SimulationConfig';

describe('Preset Comparison — Physical Validation of Emergent Jams', () => {
  it('experimentally demonstrates that disturbances dissipate in Stable Traffic (15 vehicles)', () => {
    const sim = new Simulation(PRESET_STABLE);

    // 1. Warm-up to laminar steady state (60s = 1200 steps at dt=0.05)
    for (let i = 0; i < 1200; i++) sim.step();

    const baselineMetrics = sim.getState().metrics;
    expect(baselineMetrics.congestionFraction).toBe(0);

    // 2. Introduce severe speed perturbation to vehicle 0 (brake to 25% speed)
    sim.perturbVehicle(0, 0.25);
    const postPerturbState = sim.getState();
    expect(postPerturbState.vehicles[0].speed).toBeLessThan(15);

    // 3. Run for 80 seconds of simulated time (1600 steps)
    // In stable traffic, the perturbation should decay as vehicles recover free flow
    for (let i = 0; i < 1600; i++) sim.step();

    const finalState = sim.getState();
    const finalMetrics = finalState.metrics;

    // Disturbance has dissipated:
    // - Congestion fraction returns to 0%
    expect(finalMetrics.congestionFraction).toBe(0);
    // - Fleet settles at the IDM closed-ring equilibrium speed (~27.5 m/s, ~99 km/h)
    // Note: On a closed 1000m loop with 15 cars, IDM equilibrium headway prevents cars from
    // reaching full unconstrained v0 (33.3 m/s), settling stably at ~27.5 m/s.
    expect(finalMetrics.averageSpeed).toBeGreaterThan(25.0);
    expect(finalMetrics.averageSpeed).toBeLessThan(30.0);
    // - Speed variance across the fleet decays toward laminar flow (< 1.5 m²/s²)
    expect(finalMetrics.speedVariance).toBeLessThan(1.5);
  });

  it('experimentally demonstrates that disturbances amplify into persistent congestion in Unstable Traffic (40 vehicles)', () => {
    const sim = new Simulation(PRESET_UNSTABLE);

    // 1. Warm-up (40s = 800 steps)
    for (let i = 0; i < 800; i++) sim.step();

    // 2. Introduce perturbation to vehicle 0
    sim.perturbVehicle(0, 0.25);

    // 3. Track metrics over the next 120 seconds of simulated time (2400 steps)
    let maxCongestionSeen = 0;
    let congestedStepCount = 0;
    const totalSteps = 2400;

    for (let step = 0; step < totalSteps; step++) {
      sim.step();
      const m = sim.getState().metrics;
      if (m.congestionFraction > maxCongestionSeen) {
        maxCongestionSeen = m.congestionFraction;
      }
      if (m.congestionFraction > 0.05) {
        congestedStepCount++;
      }
    }

    // In unstable traffic:
    // - Substantial congestion fraction emerges (> 15% of fleet congested)
    expect(maxCongestionSeen).toBeGreaterThan(0.15);
    // - Congestion persists over time rather than dissipating
    expect(congestedStepCount).toBeGreaterThan(100);
  });

  it('confirms that after 100s, Stable traffic has zero congestion while Unstable traffic has persistent congestion', () => {
    const simStable = new Simulation(PRESET_STABLE);
    const simUnstable = new Simulation(PRESET_UNSTABLE);

    // Warm up both simulations
    for (let i = 0; i < 800; i++) {
      simStable.step();
      simUnstable.step();
    }

    // Perturb both equally
    simStable.perturbVehicle(0, 0.25);
    simUnstable.perturbVehicle(0, 0.25);

    // Run for 100 seconds (2000 steps) to allow transients to settle
    for (let i = 0; i < 2000; i++) {
      simStable.step();
      simUnstable.step();
    }

    const stableState = simStable.getState();
    const unstableState = simUnstable.getState();

    // In Stable traffic, the perturbation has decayed: zero congestion, low variance (< 0.6)
    expect(stableState.metrics.congestionFraction).toBe(0);
    expect(stableState.metrics.speedVariance).toBeLessThan(0.6);

    // In Unstable traffic, vehicles are caught in stop-and-go waves:
    // Average speed is severely depressed (< 15 m/s vs ~27.5 m/s in stable)
    expect(unstableState.metrics.averageSpeed).toBeLessThan(15.0);
    // Congestion persists
    expect(unstableState.metrics.congestionFraction).toBeGreaterThan(0);
  });
});
