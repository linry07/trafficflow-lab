import { describe, it, expect, vi } from 'vitest';

/**
 * Pure timing accumulator test helper replicating the exact logic of useAnimationLoop.
 * This verifies the mathematical accumulator guarantees without needing a full DOM browser environment.
 */
class AccumulatorSimulation {
  public accumulator = 0;
  public stepCount = 0;
  public renderCount = 0;

  constructor(
    public fixedDt: number = 0.05,
    public maxFrameDelta: number = 0.25,
    public maxStepsPerFrame: number = 20,
    public speedMultiplier: number = 1,
  ) {}

  onFrame(deltaSec: number): void {
    const clampedDelta = Math.min(deltaSec, this.maxFrameDelta);
    this.accumulator += clampedDelta * this.speedMultiplier;

    let stepsExecuted = 0;
    const EPSILON = 1e-6;
    while (
      this.accumulator + EPSILON >= this.fixedDt &&
      stepsExecuted < this.maxStepsPerFrame
    ) {
      this.stepCount++;
      this.accumulator -= this.fixedDt;
      stepsExecuted++;
    }
    if (this.accumulator < 0) {
      this.accumulator = 0;
    }

    if (stepsExecuted >= this.maxStepsPerFrame) {
      this.accumulator = 0;
    }

    this.renderCount++;
  }
}

describe('useAnimationLoop — Accumulator Timing Logic', () => {
  it('advances physics in exact fixedDt chunks for standard 60fps frames (16.6ms)', () => {
    const sim = new AccumulatorSimulation(0.05); // 50ms timestep

    // At 60fps (~16.67ms per frame), 3 frames = ~50ms = 1 physics step
    sim.onFrame(0.01667);
    expect(sim.stepCount).toBe(0); // 16.67ms accumulated < 50ms

    sim.onFrame(0.01667);
    expect(sim.stepCount).toBe(0); // 33.34ms accumulated < 50ms

    sim.onFrame(0.01667);
    expect(sim.stepCount).toBe(1); // 50.01ms accumulated >= 50ms -> 1 step executed!
    expect(sim.accumulator).toBeCloseTo(0.00001, 4);
  });

  it('preserves total physics steps for equivalent simulated time regardless of frame rate', () => {
    // 1 second of real time simulated at 1x speed should yield 20 steps (1s / 0.05s)
    // In discrete simulations, frames with slight roundoff accumulate.
    // Testing 50 frames of 20ms each (exact 1.000s):
    const sim50 = new AccumulatorSimulation(0.05);
    for (let i = 0; i < 50; i++) {
      sim50.onFrame(0.02); // 20ms per frame
    }
    expect(sim50.stepCount).toBe(20);

    // 100 frames of 10ms each (exact 1.000s, 100fps):
    const sim100 = new AccumulatorSimulation(0.05);
    for (let i = 0; i < 100; i++) {
      sim100.onFrame(0.01); // 10ms per frame
    }
    expect(sim100.stepCount).toBe(20);

    // 25 frames of 40ms each (exact 1.000s, 25fps):
    const sim25 = new AccumulatorSimulation(0.05);
    for (let i = 0; i < 25; i++) {
      sim25.onFrame(0.04); // 40ms per frame
    }
    expect(sim25.stepCount).toBe(20);
  });

  it('scales step rate proportionally with speedMultiplier (2x, 5x)', () => {
    // 1 second of real time (50 frames of 20ms) at 2x speed -> simulates 2 seconds = 40 steps
    const sim2x = new AccumulatorSimulation(0.05, 0.25, 20, 2);
    for (let i = 0; i < 50; i++) {
      sim2x.onFrame(0.02);
    }
    expect(sim2x.stepCount).toBe(40);

    // 1 second of real time (50 frames of 20ms) at 5x speed -> simulates 5 seconds = 100 steps
    const sim5x = new AccumulatorSimulation(0.05, 0.25, 20, 5);
    for (let i = 0; i < 50; i++) {
      sim5x.onFrame(0.02);
    }
    expect(sim5x.stepCount).toBe(100);
  });

  it('prevents unbounded catch-up loop (spiral of death) after background tab pause', () => {
    const sim = new AccumulatorSimulation(0.05, 0.25, 20, 1);

    // Simulate returning after user was away in another tab for 10 seconds!
    const backgroundTabPause = 10.0; // 10 seconds delta
    sim.onFrame(backgroundTabPause);

    // Should have clamped to maxFrameDelta (0.25s) -> at most 0.25 / 0.05 = 5 steps
    // NOT 10.0 / 0.05 = 200 steps which would lock the browser thread!
    expect(sim.stepCount).toBe(5);
    expect(sim.accumulator).toBeCloseTo(0);
  });

  it('caps max steps per frame when load exceeds safety threshold', () => {
    // If a frame takes 0.25s at 5x speed (1.25s to simulate = 25 steps),
    // maxStepsPerFrame = 20 should cap execution at 20 steps and discard overflow.
    const sim = new AccumulatorSimulation(0.05, 0.25, 20, 5);
    sim.onFrame(0.25);

    expect(sim.stepCount).toBe(20);
    expect(sim.accumulator).toBe(0); // overflow discarded cleanly
  });
});
