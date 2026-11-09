/**
 * experiment.worker.ts — Dedicated Web Worker for background simulation sweeps.
 *
 * Runs headless simulation sweeps completely off the UI thread so the browser
 * canvas rendering, UI controls, and user interactions stay fluid at 60fps.
 */

import {
  ExperimentRunner,
  DensityExperimentConfig,
  ExperimentProgress,
  DensityExperimentResults,
} from './ExperimentRunner';

export type WorkerInMessage =
  | { type: 'START'; config: DensityExperimentConfig }
  | { type: 'CANCEL' };

export type WorkerOutMessage =
  | { type: 'PROGRESS'; payload: ExperimentProgress }
  | { type: 'COMPLETE'; payload: DensityExperimentResults }
  | { type: 'ERROR'; payload: string };

let isCancelled = false;

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const message = event.data;

  if (message.type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (message.type === 'START') {
    isCancelled = false;

    try {
      const results = ExperimentRunner.runDensitySweep(
        message.config,
        (progress) => {
          self.postMessage({ type: 'PROGRESS', payload: progress } as WorkerOutMessage);
        },
        () => isCancelled,
      );

      self.postMessage({ type: 'COMPLETE', payload: results } as WorkerOutMessage);
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        payload: err?.message || 'Unknown experiment worker error',
      } as WorkerOutMessage);
    }
  }
};
