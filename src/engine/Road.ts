/**
 * Circular road geometry and vehicle ordering utilities.
 *
 * The road is modeled as a 1D ring of length L. Positions are scalar values
 * in [0, L). Periodic boundary conditions mean that a vehicle crossing
 * position L wraps back to 0, creating an infinite highway without endpoints.
 *
 * Key operations:
 *   - Wrapping positions into [0, L)
 *   - Computing bumper-to-bumper gaps with wraparound
 *   - Maintaining sorted vehicle order
 *   - Finding each vehicle's leader (the next vehicle ahead)
 */

import { Vehicle } from './Vehicle';

/**
 * Wrap a position into the range [0, roadLength).
 *
 * Handles both overflow (position > roadLength) and underflow (position < 0).
 * Uses modular arithmetic with correction for negative values.
 */
export function wrapPosition(position: number, roadLength: number): number {
  return ((position % roadLength) + roadLength) % roadLength;
}

/**
 * Compute the net (bumper-to-bumper) gap between a follower and its leader
 * on a circular road.
 *
 * The gap is the distance from the front of the follower to the rear of the
 * leader, accounting for periodic wraparound.
 *
 * @param follower       The following vehicle.
 * @param leader         The vehicle ahead.
 * @param roadLength     Total road length (m).
 * @param vehicleLength  Length of each vehicle (m).
 * @returns              Net gap in meters. Should always be > 0 for valid states.
 *
 * Assumption: The follower and leader are distinct vehicles that do not overlap.
 * If they do overlap (gap < 0), this indicates a collision that the simulation
 * should have prevented.
 */
export function computeGap(
  follower: Vehicle,
  leader: Vehicle,
  roadLength: number,
  vehicleLength: number,
): number {
  // Center-to-center distance with wraparound
  let rawGap =
    ((leader.position - follower.position) % roadLength + roadLength) %
    roadLength;
  // When a vehicle is its own leader (single-vehicle case) or two vehicles
  // are at exactly the same position, rawGap is 0. On a circular road, the
  // actual forward distance is the full road length.
  if (rawGap === 0 && follower.id !== leader.id) {
    // Two distinct vehicles at the same position — this is a collision (gap < 0)
    // rawGap stays 0
  } else if (rawGap === 0) {
    // Vehicle is its own leader — gap is the full road minus vehicle length
    rawGap = roadLength;
  }
  // Subtract vehicle length to get bumper-to-bumper gap
  return rawGap - vehicleLength;
}

/**
 * Sort vehicles by position in ascending order.
 *
 * On a circular road, "ascending" means in the direction of travel. Since
 * relative order rarely changes (vehicles don't pass each other on a
 * single-lane road), this is typically an O(N) insertion sort situation.
 *
 * Returns a new sorted array; does not mutate the input.
 */
export function sortVehicles(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort((a, b) => a.position - b.position);
}

/**
 * Get the index of the leader (next vehicle ahead) for a given vehicle index
 * in a sorted vehicle array.
 *
 * On a circular road, the leader of the last vehicle in the sorted array
 * is the first vehicle (wraparound).
 *
 * @param index         Index of the current vehicle in the sorted array.
 * @param vehicleCount  Total number of vehicles.
 * @returns             Index of the leader in the sorted array.
 */
export function getLeaderIndex(index: number, vehicleCount: number): number {
  return (index + 1) % vehicleCount;
}
