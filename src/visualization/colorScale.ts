/**
 * Speed-to-color mapping for vehicle visualization.
 *
 * Implements a physically meaningful traffic state color scale:
 *   - Green (#22c55e): Free-flowing traffic (v >= 0.75 * v0)
 *   - Yellow/Amber (#f59e0b): Transition/slowing traffic (0.30 * v0 < v < 0.75 * v0)
 *   - Red (#ef4444): Congested/stopped traffic (v <= 0.30 * v0)
 *
 * Provides smooth continuous HSL interpolation so speed fluctuations
 * are visually apparent, as well as categorical classification for legends.
 */

export type TrafficSpeedCategory = 'free-flow' | 'slowing' | 'congested';

export interface SpeedColorInfo {
  color: string;
  category: TrafficSpeedCategory;
  ratio: number;
}

/**
 * Categorize speed relative to desired speed v0.
 */
export function getSpeedCategory(speed: number, v0: number): TrafficSpeedCategory {
  if (v0 <= 0) return 'congested';
  const ratio = Math.max(0, speed / v0);
  if (ratio <= 0.30) return 'congested';
  if (ratio < 0.75) return 'slowing';
  return 'free-flow';
}

/**
 * Compute an interpolated RGB hex string based on vehicle speed.
 *
 * Uses a 3-stop gradient:
 *   ratio = 0.00 -> Red    rgb(239, 68, 68)   #ef4444
 *   ratio = 0.30 -> Red-Orange rgb(249, 115, 22) #f97316
 *   ratio = 0.55 -> Amber  rgb(245, 158, 11)  #f59e0b
 *   ratio = 0.75 -> Yellow-Green rgb(132, 204, 22) #84cc16
 *   ratio = 1.00+ -> Emerald rgb(34, 197, 94)  #22c55e
 *
 * @param speed Current vehicle speed (m/s)
 * @param v0 Desired speed (m/s)
 * @returns CSS color hex string
 */
export function getSpeedColor(speed: number, v0: number): string {
  if (v0 <= 0) return '#ef4444';
  const ratio = Math.max(0, Math.min(1.0, speed / v0));

  // Color stops in [r, g, b]
  const RED = [239, 68, 68];       // #ef4444
  const AMBER = [245, 158, 11];    // #f59e0b
  const GREEN = [34, 197, 94];     // #22c55e

  let r: number, g: number, b: number;

  if (ratio <= 0.35) {
    // Congested zone: deep red to reddish-amber
    const t = ratio / 0.35;
    r = Math.round(RED[0] + (AMBER[0] - RED[0]) * (t * 0.4));
    g = Math.round(RED[1] + (AMBER[1] - RED[1]) * (t * 0.4));
    b = Math.round(RED[2] + (AMBER[2] - RED[2]) * (t * 0.4));
  } else if (ratio <= 0.75) {
    // Decelerating / transition zone: amber to lime
    const t = (ratio - 0.35) / 0.40;
    r = Math.round(AMBER[0] + (GREEN[0] - AMBER[0]) * t);
    g = Math.round(AMBER[1] + (GREEN[1] - AMBER[1]) * t);
    b = Math.round(AMBER[2] + (GREEN[2] - AMBER[2]) * t);
  } else {
    // Free-flow zone: crisp emerald green
    const t = Math.min(1.0, (ratio - 0.75) / 0.25);
    r = Math.round(GREEN[0] * (1 - t * 0.15));
    g = Math.round(GREEN[1] + (220 - GREEN[1]) * (t * 0.2));
    b = Math.round(GREEN[2] * (1 - t * 0.15));
  }

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Get detailed speed color and category info.
 */
export function getSpeedColorInfo(speed: number, v0: number): SpeedColorInfo {
  return {
    color: getSpeedColor(speed, v0),
    category: getSpeedCategory(speed, v0),
    ratio: v0 > 0 ? Math.max(0, speed / v0) : 0,
  };
}

export const SPEED_PALETTE = {
  congested: '#ef4444',
  slowing: '#f59e0b',
  freeFlow: '#22c55e',
  perturbedHighlight: '#38bdf8', // Light blue for perturbed / marked vehicle
  roadAsphalt: '#1e293b',
  roadBorder: '#334155',
  laneMarking: '#475569',
  roadSurfaceGlow: 'rgba(51, 65, 85, 0.4)',
} as const;
