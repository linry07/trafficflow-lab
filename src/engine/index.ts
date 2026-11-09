/**
 * Public API for the TrafficFlow Lab simulation engine.
 *
 * This barrel export defines the public interface of the engine module.
 * All consumers (React components, Web Workers, tests) import from here.
 */

export { Simulation } from './Simulation';
export type { SimulationState } from './Simulation';

export { createVehicle } from './Vehicle';
export type { Vehicle } from './Vehicle';

export { computeAcceleration } from './IDMModel';

export {
  wrapPosition,
  computeGap,
  sortVehicles,
  getLeaderIndex,
} from './Road';

export type { IDMParams, SimulationConfig, PresetKey } from './SimulationConfig';
export {
  DEFAULT_IDM_PARAMS,
  DEFAULT_CONFIG,
  PRESET_STABLE,
  PRESET_UNSTABLE,
  PRESET_SPEED_LIMIT,
  PRESET_AUTONOMOUS,
  PRESET_AGGRESSIVE,
  SIMULATION_PRESETS,
} from './SimulationConfig';

export { SeededRandom } from './SeededRandom';

export {
  computeAverageSpeed,
  computeDensity,
  computeFlow,
  computeSpeedVariance,
  computeCongestionFraction,
  computeAllMetrics,
} from './metrics';
export type { TrafficMetrics } from './metrics';
