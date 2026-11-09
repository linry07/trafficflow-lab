/**
 * Configuration types and default parameters for the TrafficFlow Lab simulation.
 *
 * All parameters have physically meaningful units and are documented with
 * their rationale. The IDM parameters follow Treiber, Hennecke, Helbing (2000).
 */

/**
 * Parameters for the Intelligent Driver Model (IDM).
 *
 * The IDM computes longitudinal acceleration as a function of a vehicle's
 * speed, the gap to the vehicle ahead, and the approach rate. These parameters
 * control the trade-off between reaching desired speed and maintaining safe
 * following distances.
 */
export interface IDMParams {
  /** Desired speed on an empty road (m/s). */
  v0: number;
  /** Minimum gap at standstill (m). Bumper-to-bumper distance when stopped. */
  s0: number;
  /** Desired time headway (s). Determines speed-dependent following distance. */
  T: number;
  /** Maximum (comfortable) acceleration (m/s²). */
  a: number;
  /** Comfortable deceleration magnitude (m/s²). Always positive. */
  b: number;
  /** Acceleration exponent. Controls how smoothly acceleration tapers near v0. */
  delta: number;
}

/**
 * Complete configuration for a simulation run.
 */
export interface SimulationConfig {
  /** Length of the circular road (m). */
  roadLength: number;
  /** Number of vehicles on the road. */
  vehicleCount: number;
  /** Physical length of each vehicle (m). */
  vehicleLength: number;
  /** IDM driving behavior parameters. */
  idm: IDMParams;
  /** Random seed for deterministic initialization. */
  seed: number;
  /** Fixed simulation timestep (s). */
  dt: number;
}

/**
 * Default IDM parameters.
 *
 * These produce realistic highway driving behavior where phantom traffic jams
 * can emerge at moderate-to-high densities. The values are standard in the
 * traffic simulation literature.
 */
export const DEFAULT_IDM_PARAMS: Readonly<IDMParams> = {
  v0: 33.3,   // ~120 km/h — typical highway desired speed
  s0: 2.0,    // 2 m minimum standstill gap
  T: 1.5,     // 1.5 s time headway — cautious but not overly conservative
  a: 1.0,     // 1.0 m/s² — comfortable acceleration
  b: 3.0,     // 3.0 m/s² — comfortable braking (not emergency)
  delta: 4,   // Standard exponent — smooth acceleration curve
};

/**
 * Default simulation configuration.
 *
 * 30 vehicles on a 1000m road is near the theoretically estimated critical
 * density, but whether jams actually form depends on the specific seed and
 * perturbations. This is a hypothesis to be validated, not an assumption.
 */
export const DEFAULT_CONFIG: Readonly<SimulationConfig> = {
  roadLength: 1000,
  vehicleCount: 30,
  vehicleLength: 5,
  idm: { ...DEFAULT_IDM_PARAMS },
  seed: 42,
  dt: 0.05,   // 20 Hz physics — stable for IDM with typical parameters
};

/**
 * Preset: Stable traffic.
 * Low density where disturbances dissipate and vehicles return to steady flow.
 */
export const PRESET_STABLE: Readonly<SimulationConfig> = {
  ...DEFAULT_CONFIG,
  vehicleCount: 15,
  seed: 100,
};

/**
 * Preset: Unstable traffic.
 * Higher density where a small disturbance grows into persistent stop-and-go waves.
 */
export const PRESET_UNSTABLE: Readonly<SimulationConfig> = {
  ...DEFAULT_CONFIG,
  vehicleCount: 40,
  seed: 200,
};

/**
 * Preset: Variable Speed Limit (Intervention).
 * High density (35 veh/km) that is normally unstable at 120 km/h,
 * but lowering desired speed to 80 km/h (22.2 m/s) stabilizes string dynamics.
 */
export const PRESET_SPEED_LIMIT: Readonly<SimulationConfig> = {
  ...DEFAULT_CONFIG,
  vehicleCount: 35,
  seed: 300,
  idm: {
    ...DEFAULT_IDM_PARAMS,
    v0: 22.2, // ~80 km/h
  },
};

/**
 * Preset: Connected / Autonomous Vehicles (CAV Platoon).
 * 35 vehicles operating with small time headway (0.8s) and 1.5m standstill gap,
 * demonstrating how automated following maintains stable laminar flow at high capacity.
 */
export const PRESET_AUTONOMOUS: Readonly<SimulationConfig> = {
  ...DEFAULT_CONFIG,
  vehicleCount: 35,
  seed: 400,
  idm: {
    ...DEFAULT_IDM_PARAMS,
    T: 0.8,
    s0: 1.5,
  },
};

/**
 * Preset: Aggressive Tailgating.
 * 30 vehicles with high speed (140 km/h), short headway (0.7s), small gap (1.0m),
 * and high acceleration/braking sensitivity, causing rapid, violent stop-and-go shockwaves.
 */
export const PRESET_AGGRESSIVE: Readonly<SimulationConfig> = {
  ...DEFAULT_CONFIG,
  vehicleCount: 30,
  seed: 500,
  idm: {
    v0: 38.9, // ~140 km/h
    s0: 1.0,
    T: 0.7,
    a: 1.8,
    b: 3.5,
    delta: 4,
  },
};

export type PresetKey =
  | 'stable'
  | 'unstable'
  | 'speed-limit'
  | 'autonomous'
  | 'aggressive';

export const SIMULATION_PRESETS: Record<PresetKey, { name: string; description: string; config: SimulationConfig }> = {
  stable: {
    name: '🟢 Stable (15 cars)',
    description: '15 veh/km: Low density where perturbations dissipate smoothly.',
    config: PRESET_STABLE,
  },
  unstable: {
    name: '🔴 Unstable (40 cars)',
    description: '40 veh/km: Small disturbances amplify into persistent backward stop-and-go waves.',
    config: PRESET_UNSTABLE,
  },
  'speed-limit': {
    name: '🟡 Speed Limit 80 km/h',
    description: '35 veh/km: Reduced speed limit stabilizes dense traffic by shortening headway requirement.',
    config: PRESET_SPEED_LIMIT,
  },
  autonomous: {
    name: '🤖 CAV Platoon (T=0.8s)',
    description: '35 veh/km: Connected / autonomous vehicles maintain laminar flow at high capacity.',
    config: PRESET_AUTONOMOUS,
  },
  aggressive: {
    name: '⚡ Aggressive / Tailgating',
    description: '30 veh/km: 140 km/h with short 0.7s headway produces violent shockwaves.',
    config: PRESET_AGGRESSIVE,
  },
};
