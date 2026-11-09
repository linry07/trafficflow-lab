/**
 * Animation loop hook using requestAnimationFrame with a fixed-timestep physics accumulator.
 *
 * Technical design:
 *   1. Decoupled physics & rendering:
 *      Physics advances in discrete chunks of fixedDt (0.05s), ensuring identical
 *      equations and numerical stability regardless of monitor refresh rate (60Hz, 120Hz, etc.).
 *   2. Speed multipliers (1x, 2x, 5x):
 *      Advances simulated time by (realElapsed * speedMultiplier). Because physics steps
 *      are strictly fixed at fixedDt, changing speed changes only the execution rate,
 *      never the physics outcome for equivalent simulated time.
 *   3. Background tab protection ("spiral of death" prevention):
 *      When the browser tab is hidden or backgrounded, rAF pauses or slows down. Upon return,
 *      a naive accumulator would try to simulate seconds or minutes of backlog at once,
 *      freezing the UI. We clamp deltaRealTime to MAX_FRAME_DELTA (0.25s) and cap steps per
 *      frame to MAX_STEPS_PER_FRAME (20). Any remaining lag is discarded cleanly.
 *   4. Clean lifecycle management:
 *      Properly cancels rAF on pause or component unmount.
 */

import { useEffect, useRef } from 'react';

export interface UseAnimationLoopOptions {
  /** Callback executed once for each discrete fixedDt physics step */
  onStep: (dt: number) => void;
  /** Callback executed once per animation frame after all physics steps */
  onRender: () => void;
  /** Whether the simulation is actively running */
  isRunning: boolean;
  /** Simulation speed factor (1 = real-time, 2 = 2x speed, 5 = 5x speed) */
  speedMultiplier?: number;
  /** Fixed physics timestep in seconds (default 0.05s = 20Hz) */
  fixedDt?: number;
  /** Max real elapsed seconds allowed per frame (default 0.25s) */
  maxFrameDelta?: number;
  /** Max physics steps executed in a single animation frame (default 20) */
  maxStepsPerFrame?: number;
}

export function useAnimationLoop({
  onStep,
  onRender,
  isRunning,
  speedMultiplier = 1,
  fixedDt = 0.05,
  maxFrameDelta = 0.25,
  maxStepsPerFrame = 20,
}: UseAnimationLoopOptions): void {
  // Use refs for callbacks and parameters so the loop doesn't re-create needlessly
  const onStepRef = useRef(onStep);
  const onRenderRef = useRef(onRender);
  const speedMultiplierRef = useRef(speedMultiplier);
  const fixedDtRef = useRef(fixedDt);
  const maxFrameDeltaRef = useRef(maxFrameDelta);
  const maxStepsPerFrameRef = useRef(maxStepsPerFrame);

  useEffect(() => {
    onStepRef.current = onStep;
    onRenderRef.current = onRender;
    speedMultiplierRef.current = speedMultiplier;
    fixedDtRef.current = fixedDt;
    maxFrameDeltaRef.current = maxFrameDelta;
    maxStepsPerFrameRef.current = maxStepsPerFrame;
  });

  useEffect(() => {
    if (!isRunning) {
      // Trigger a single render when paused so any static updates (e.g. reset) are visible
      onRenderRef.current();
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;

    const frame = (now: number) => {
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      // Clamp elapsed time to prevent catch-up spiral after tab pause
      const clampedDelta = Math.min(deltaSec, maxFrameDeltaRef.current);
      const targetDt = fixedDtRef.current;
      accumulator += clampedDelta * speedMultiplierRef.current;

      let stepsExecuted = 0;
      const maxSteps = maxStepsPerFrameRef.current;
      // Microsecond epsilon (1e-6) prevents IEEE-754 precision loss from skipping steps
      const EPSILON = 1e-6;

      while (accumulator + EPSILON >= targetDt && stepsExecuted < maxSteps) {
        onStepRef.current(targetDt);
        accumulator -= targetDt;
        stepsExecuted++;
      }
      if (accumulator < 0) {
        accumulator = 0;
      }

      // If we hit the safety cap, discard accumulated lag to prevent backlog build-up
      if (stepsExecuted >= maxSteps) {
        accumulator = 0;
      }

      // Render the latest state
      onRenderRef.current();

      animationFrameId = requestAnimationFrame(frame);
    };

    animationFrameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRunning]);
}
