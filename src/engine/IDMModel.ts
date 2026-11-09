/**
 * Intelligent Driver Model (IDM) — acceleration computation.
 *
 * The IDM is a time-continuous car-following model that computes the
 * longitudinal acceleration of a vehicle based on:
 *   - Its current speed
 *   - The net gap (bumper-to-bumper) to the vehicle ahead
 *   - The approach rate (how fast the gap is closing)
 *
 * Reference: Treiber, Hennecke, Helbing (2000).
 * "Congested traffic states in empirical observations and microscopic simulations."
 * Physical Review E, 62(2), 1805.
 *
 * The model produces two competing effects:
 *   1. Free-road acceleration toward the desired speed v₀
 *   2. Interaction deceleration when the gap is smaller than the desired gap
 *
 * This competition naturally produces phantom traffic jams at high densities:
 * small speed perturbations amplify through the following chain, creating
 * backward-propagating stop-and-go waves.
 */

import { IDMParams } from './SimulationConfig';

/**
 * Compute the IDM acceleration for a single vehicle.
 *
 * @param speed      Current speed of the vehicle (m/s). Must be >= 0.
 * @param gap        Net gap to the vehicle ahead (m). Must be > 0.
 * @param approachRate  Speed difference v_self - v_leader (m/s).
 *                      Positive means closing in, negative means falling behind.
 * @param params     IDM parameters controlling driving behavior.
 * @returns          Acceleration in m/s². Positive = speed up, negative = brake.
 *
 * @throws Never throws. Returns finite values for all valid inputs.
 *         For edge cases (gap ≈ 0), returns strong braking.
 */
export function computeAcceleration(
  speed: number,
  gap: number,
  approachRate: number,
  params: IDMParams,
): number {
  const { v0, s0, T, a, b, delta } = params;

  // Safety: prevent division by zero or negative gap.
  // A very small positive gap produces very strong braking, which is correct.
  const safeGap = Math.max(gap, 0.01);

  // Desired dynamical gap: s*(v, Δv)
  // s* = s0 + max(0, v*T + v*Δv / (2*sqrt(a*b)))
  //
  // The max(0, ...) prevents the desired gap from going negative when the
  // vehicle ahead is moving much faster (large negative approachRate).
  const interactionTerm = (speed * approachRate) / (2 * Math.sqrt(a * b));
  const desiredGap = s0 + Math.max(0, speed * T + interactionTerm);

  // Free-road term: drives acceleration toward v0.
  // When speed << v0, this is ~a (full acceleration).
  // When speed ≈ v0, this approaches 0.
  // When speed > v0, this is negative (deceleration).
  const freeRoadTerm = 1 - Math.pow(speed / v0, delta);

  // Interaction term: brakes when too close to the leader.
  // When gap >> s*, this is ~0 (leader is far away, ignore).
  // When gap ≈ s*, this is ~1 (need to brake to maintain desired gap).
  // When gap < s*, this is >1 (strong braking).
  const interactionRatio = Math.pow(desiredGap / safeGap, 2);

  return a * (freeRoadTerm - interactionRatio);
}
