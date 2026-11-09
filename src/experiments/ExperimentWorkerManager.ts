/**
 * ExperimentWorkerManager — Robust lifecycle manager for headless simulation Web Workers.
 *
 * Guarantees:
 *   1. Immediate cancellation: Terminates the worker thread immediately using worker.terminate()
 *      to halt synchronous CPU execution without waiting for the event loop.
 *   2. Generational isolation (runId): Drops all stale in-flight messages from canceled or superseded workers.
 *   3. Clean restartability: Automatically spawns a fresh worker instance on subsequent runs.
 *   4. Safe resource disposal: Cleans up references and terminates active workers on unmount.
 */

import {
  DensityExperimentConfig,
  DensityExperimentResults,
  ExperimentProgress,
} from './ExperimentRunner';
import { WorkerInMessage, WorkerOutMessage } from './experiment.worker';

export interface ExperimentWorkerCallbacks {
  onProgress: (progress: ExperimentProgress) => void;
  onComplete: (results: DensityExperimentResults) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

export type WorkerFactory = () => Worker;

export const defaultWorkerFactory: WorkerFactory = () => {
  return new Worker(
    new URL('./experiment.worker.ts', import.meta.url),
    { type: 'module' },
  );
};

export class ExperimentWorkerManager {
  private worker: Worker | null = null;
  private runId: number = 0;
  private workerFactory: WorkerFactory;

  constructor(workerFactory: WorkerFactory = defaultWorkerFactory) {
    this.workerFactory = workerFactory;
  }

  /**
   * Whether an experiment worker is currently running.
   */
  public isRunning(): boolean {
    return this.worker !== null;
  }

  /**
   * Launch a density sweep on a background worker.
   */
  public start(
    config: DensityExperimentConfig,
    callbacks: ExperimentWorkerCallbacks,
  ): void {
    // 1. Terminate any existing worker to prevent background zombie executions
    this.cancel();

    // 2. Increment run generation
    this.runId++;
    const currentRunId = this.runId;

    try {
      const worker = this.workerFactory();
      this.worker = worker;

      worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        // Discard stale messages from a previous or canceled execution session
        if (this.runId !== currentRunId || this.worker !== worker) {
          return;
        }

        const msg = event.data;
        if (msg.type === 'PROGRESS') {
          callbacks.onProgress(msg.payload);
        } else if (msg.type === 'COMPLETE') {
          this.cleanupWorker(worker);
          callbacks.onComplete(msg.payload);
        } else if (msg.type === 'ERROR') {
          this.cleanupWorker(worker);
          callbacks.onError(msg.payload);
        }
      };

      worker.onerror = (err) => {
        if (this.runId !== currentRunId || this.worker !== worker) {
          return;
        }
        this.cleanupWorker(worker);
        callbacks.onError(err.message || 'Worker thread execution error');
      };

      worker.postMessage({ type: 'START', config } as WorkerInMessage);
    } catch (err: any) {
      this.cleanupWorker(null);
      callbacks.onError(err?.message || 'Failed to spawn background experiment worker');
    }
  }

  /**
   * Immediately cancel the currently executing experiment.
   * Calls worker.terminate() to abort execution instantly.
   */
  public cancel(callbacks?: { onCancel?: () => void }): void {
    // Invalidate the generation so any in-flight messages are dropped
    this.runId++;

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignore if already terminated
      }
      this.worker = null;
    }

    if (callbacks?.onCancel) {
      callbacks.onCancel();
    }
  }

  /**
   * Dispose of worker resources permanently.
   */
  public dispose(): void {
    this.cancel();
  }

  private cleanupWorker(worker: Worker | null): void {
    if (worker) {
      try {
        worker.terminate();
      } catch {
        // Ignore
      }
    }
    if (this.worker === worker) {
      this.worker = null;
    }
  }
}
