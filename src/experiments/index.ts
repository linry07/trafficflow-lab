export { ExperimentRunner } from './ExperimentRunner';
export type {
  TrialConfig,
  TrialResult,
  DensityGroupResult,
  CriticalDensityWindow,
  DensityExperimentConfig,
  DensityExperimentResults,
  ExperimentProgress,
  PerturbationSchedule,
} from './ExperimentRunner';

export {
  computeWilsonInterval,
  computeMeanAndStdDev,
} from './Statistics';
export type { ConfidenceInterval } from './Statistics';

export { ExperimentWorkerManager } from './ExperimentWorkerManager';
export type {
  ExperimentWorkerCallbacks,
  WorkerFactory,
} from './ExperimentWorkerManager';
