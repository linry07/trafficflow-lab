/**
 * useExperiment — React hook managing background Web Worker simulation sweeps.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DensityExperimentConfig,
  DensityExperimentResults,
  ExperimentProgress,
} from '../experiments/ExperimentRunner';
import { WorkerInMessage, WorkerOutMessage } from '../experiments/experiment.worker';

export interface UseExperimentReturn {
  isRunning: boolean;
  progress: ExperimentProgress | null;
  results: DensityExperimentResults | null;
  error: string | null;
  startExperiment: (config: DensityExperimentConfig) => void;
  cancelExperiment: () => void;
  clearResults: () => void;
}

export function useExperiment(): UseExperimentReturn {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExperimentProgress | null>(null);
  const [results, setResults] = useState<DensityExperimentResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Terminate worker on component unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const cancelExperiment = useCallback(() => {
    if (workerRef.current && isRunning) {
      workerRef.current.postMessage({ type: 'CANCEL' } as WorkerInMessage);
      setIsRunning(false);
    }
  }, [isRunning]);

  const startExperiment = useCallback(
    (config: DensityExperimentConfig) => {
      // Terminate any existing worker
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      setError(null);
      setProgress(null);
      setIsRunning(true);

      try {
        // Instantiate modern Vite module worker
        const worker = new Worker(
          new URL('../experiments/experiment.worker.ts', import.meta.url),
          { type: 'module' },
        );
        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
          const msg = event.data;

          if (msg.type === 'PROGRESS') {
            setProgress(msg.payload);
          } else if (msg.type === 'COMPLETE') {
            setResults(msg.payload);
            setIsRunning(false);
            worker.terminate();
            workerRef.current = null;
          } else if (msg.type === 'ERROR') {
            setError(msg.payload);
            setIsRunning(false);
            worker.terminate();
            workerRef.current = null;
          }
        };

        worker.onerror = (err) => {
          setError(err.message || 'Worker thread execution error');
          setIsRunning(false);
          worker.terminate();
          workerRef.current = null;
        };

        worker.postMessage({ type: 'START', config } as WorkerInMessage);
      } catch (err: any) {
        setError(err?.message || 'Failed to spawn background experiment worker');
        setIsRunning(false);
      }
    },
    [],
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setProgress(null);
    setError(null);
  }, []);

  return {
    isRunning,
    progress,
    results,
    error,
    startExperiment,
    cancelExperiment,
    clearResults,
  };
}
