/**
 * Vehicle state representation.
 *
 * Each vehicle is a simple data object with position, speed, and acceleration
 * on the 1D circular road. Vehicles are value objects — the simulation
 * creates new state each step rather than mutating in place, enabling
 * clean state snapshots.
 */

/**
 * The state of a single vehicle at a point in time.
 */
export interface Vehicle {
  /** Unique identifier for this vehicle. Stable across simulation steps. */
  readonly id: number;
  /** Position on the road (m). In range [0, roadLength). */
  position: number;
  /** Current speed (m/s). Always >= 0. */
  speed: number;
  /** Current acceleration (m/s²). Computed by IDM each step. */
  acceleration: number;
}

/**
 * Create a new vehicle with the given initial state.
 *
 * @param id        Unique identifier.
 * @param position  Initial position on the road (m).
 * @param speed     Initial speed (m/s). Must be >= 0.
 * @returns         A new Vehicle object.
 */
export function createVehicle(
  id: number,
  position: number,
  speed: number,
): Vehicle {
  return {
    id,
    position,
    speed: Math.max(0, speed),
    acceleration: 0,
  };
}
