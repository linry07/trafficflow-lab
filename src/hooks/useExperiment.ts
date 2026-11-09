/**
 * useExperiment — React hook managing background Web Worker simulation sweeps.
 *
 * Utilises ExperimentWorkerManager to ensure immediate thread termination on cancellation,
 * rejection of stale messages, and clean worker recreation.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DensityExperimentConfig,
  DensityExperimentResults,
  ExperimentProgress,
} from '../experiments/ExperimentRunner';
import { ExperimentWorkerManager } from '../experiments/ExperimentWorkerManager';

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

  const managerRef = useRef<ExperimentWorkerManager | null>(null);

  // Lazy-initialize worker manager
  if (!managerRef.current) {
    managerRef.current = new ExperimentWorkerManager();
  }

  // Terminate worker on component unmount
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      if (manager) {
        manager.dispose();
      }
    };
  }, []);

  const cancelExperiment = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.cancel({
        onCancel: () => {
          setIsRunning(false);
          setProgress(null);
        },
      });
    }
  }, []);

  const startExperiment = useCallback(
    (config: DensityExperimentConfig) => {
      setError(null);
      setProgress(null);
      setIsRunning(true);

      if (managerRef.current) {
        managerRef.current.start(config, {
          onProgress: (prog) => setProgress(prog),
          onComplete: (res) => {
            setResults(res);
            setIsRunning(false);
          },
          onError: (err) => {
            setError(err);
            setIsRunning(false);
          },
        });
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
