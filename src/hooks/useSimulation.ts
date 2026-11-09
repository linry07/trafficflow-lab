/**
 * Custom React hook for controlling the traffic simulation.
 *
 * Encapsulates the Simulation engine, playback state, live parameter updates,
 * preset management, perturbation triggers, and spatiotemporal analytics.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Simulation,
  SimulationState,
  SimulationConfig,
  DEFAULT_CONFIG,
  PresetKey,
  SIMULATION_PRESETS,
} from '../engine';
import {
  TimeSeriesCollector,
  TimeSeriesPoint,
  SpaceTimeGrid,
  SpaceTimeSlice,
} from '../analytics';
import { PerturbationSchedule } from '../experiments/ExperimentRunner';
import { useAnimationLoop } from './useAnimationLoop';

export interface UseSimulationReturn {
  /** Current state snapshot (vehicles, metrics, time, stepCount) */
  state: SimulationState;
  /** Active configuration */
  config: SimulationConfig;
  /** Draft configuration for parameters requiring a reset (vehicleCount, seed) */
  pendingConfig: SimulationConfig;
  /** Whether draft parameters differ from active configuration */
  isResetNeeded: boolean;
  /** Playback status */
  isRunning: boolean;
  /** Speed multiplier (1, 2, 5) */
  speedMultiplier: number;
  /** Currently highlighted vehicle ID (for perturbation feedback) */
  highlightedVehicleId: number | null;
  /** Recorded time-series analytics samples */
  timeSeriesData: ReadonlyArray<TimeSeriesPoint>;
  /** Recorded spatiotemporal slices for the space-time diagram */
  spaceTimeSlices: ReadonlyArray<SpaceTimeSlice>;
  /** Currently configured space-time time window in seconds */
  spaceTimeWindow: number;
  /** Actions */
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeedMultiplier: (speed: number) => void;
  reset: (customConfig?: SimulationConfig) => void;
  applyPreset: (preset: PresetKey) => void;
  updateLiveParam: (key: 'v0' | 'T', value: number) => void;
  setPendingVehicleCount: (count: number) => void;
  setPendingSeed: (seed: number) => void;
  applyPendingChanges: () => void;
  perturbTraffic: (vehicleIndex?: number, factor?: number) => void;
  setSpaceTimeWindow: (seconds: number) => void;
  replayScenario: (
    targetConfig: SimulationConfig,
    perturbation: PerturbationSchedule | null,
  ) => void;
}

export function useSimulation(
  initialConfig: SimulationConfig = DEFAULT_CONFIG,
): UseSimulationReturn {
  // Underlying pure simulation engine instance
  const simRef = useRef<Simulation>(new Simulation(initialConfig));

  // Scheduled perturbation for scenario replay
  const scheduledPerturbationRef = useRef<PerturbationSchedule | null>(null);
  const perturbationFiredRef = useRef<boolean>(false);

  // Analytics collectors (decoupled from rendering frames)
  const collectorRef = useRef<TimeSeriesCollector>(
    new TimeSeriesCollector({ sampleInterval: 0.5, maxDuration: 120 }),
  );
  const [spaceTimeWindow, setSpaceTimeWindowState] = useState<number>(60);
  const spaceTimeGridRef = useRef<SpaceTimeGrid>(
    new SpaceTimeGrid({
      roadLength: initialConfig.roadLength,
      sampleInterval: 0.25,
      maxDuration: 60,
    }),
  );

  // Current simulation state exposed to React
  const [state, setState] = useState<SimulationState>(() =>
    simRef.current.getState(),
  );

  // Analytics data exposed to React
  const [timeSeriesData, setTimeSeriesData] = useState<
    ReadonlyArray<TimeSeriesPoint>
  >([]);
  const [spaceTimeSlices, setSpaceTimeSlices] = useState<
    ReadonlyArray<SpaceTimeSlice>
  >([]);

  // Active configuration
  const [config, setConfig] = useState<SimulationConfig>(initialConfig);

  // Pending configuration for settings requiring reset
  const [pendingConfig, setPendingConfig] =
    useState<SimulationConfig>(initialConfig);

  // Playback control state
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Perturbation visual indicator
  const [highlightedVehicleId, setHighlightedVehicleId] = useState<
    number | null
  >(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  // Record initial state at t=0
  useEffect(() => {
    const initialState = simRef.current.getState();
    collectorRef.current.record(0, initialState.metrics);
    spaceTimeGridRef.current.record(0, initialState.vehicles);
    setTimeSeriesData([...collectorRef.current.getPoints()]);
    setSpaceTimeSlices([...spaceTimeGridRef.current.getSlices()]);
  }, []);

  // Animation loop callbacks
  const handleStep = useCallback((dt: number) => {
    const prevTime = simRef.current.getTime();

    // Check scheduled perturbation for reproducible scenario replay
    if (
      scheduledPerturbationRef.current &&
      !perturbationFiredRef.current &&
      prevTime >= scheduledPerturbationRef.current.time - 1e-6
    ) {
      const p = scheduledPerturbationRef.current;
      simRef.current.perturbVehicle(p.vehicleIndex, p.factor);
      perturbationFiredRef.current = true;
      setHighlightedVehicleId(0);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedVehicleId(null);
      }, 3000);
    }

    simRef.current.step(dt);
    const time = simRef.current.getTime();
    const currentState = simRef.current.getState();

    // Sample into analytics collectors strictly on simulated time intervals
    collectorRef.current.record(time, currentState.metrics);
    spaceTimeGridRef.current.record(time, currentState.vehicles);
  }, []);

  const handleRender = useCallback(() => {
    setState(simRef.current.getState());
    setTimeSeriesData([...collectorRef.current.getPoints()]);
    setSpaceTimeSlices([...spaceTimeGridRef.current.getSlices()]);
  }, []);

  useAnimationLoop({
    onStep: handleStep,
    onRender: handleRender,
    isRunning,
    speedMultiplier,
    fixedDt: config.dt,
  });

  // Playback actions
  const play = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const togglePlay = useCallback(() => setIsRunning((prev) => !prev), []);

  // Reset simulation
  const reset = useCallback(
    (customConfig?: SimulationConfig) => {
      const targetConfig = customConfig || pendingConfig;
      simRef.current.reset(targetConfig);
      collectorRef.current.clear();
      spaceTimeGridRef.current.clear();

      setConfig({ ...targetConfig, idm: { ...targetConfig.idm } });
      setPendingConfig({ ...targetConfig, idm: { ...targetConfig.idm } });

      const freshState = simRef.current.getState();
      collectorRef.current.record(0, freshState.metrics);
      spaceTimeGridRef.current.record(0, freshState.vehicles);

      setState(freshState);
      setTimeSeriesData([...collectorRef.current.getPoints()]);
      setSpaceTimeSlices([...spaceTimeGridRef.current.getSlices()]);
      setHighlightedVehicleId(null);
    },
    [pendingConfig],
  );

  // Apply simulation preset
  const applyPreset = useCallback(
    (preset: PresetKey) => {
      const presetEntry = SIMULATION_PRESETS[preset];
      if (presetEntry) {
        reset(presetEntry.config);
      }
    },
    [reset],
  );

  // Live parameter adjustments (v0, T)
  const updateLiveParam = useCallback(
    (key: 'v0' | 'T', value: number) => {
      simRef.current.updateIDMParams({ [key]: value });
      const updatedConfig: SimulationConfig = {
        ...config,
        idm: { ...config.idm, [key]: value },
      };
      setConfig(updatedConfig);
      setPendingConfig((prev) => ({
        ...prev,
        idm: { ...prev.idm, [key]: value },
      }));
      // Update state snapshot immediately
      setState(simRef.current.getState());
    },
    [config],
  );

  // Structural parameters requiring reset
  const setPendingVehicleCount = useCallback((vehicleCount: number) => {
    setPendingConfig((prev) => ({
      ...prev,
      vehicleCount: Math.max(2, Math.min(100, Math.round(vehicleCount))),
    }));
  }, []);

  const setPendingSeed = useCallback((seed: number) => {
    setPendingConfig((prev) => ({
      ...prev,
      seed: Math.round(seed),
    }));
  }, []);

  const applyPendingChanges = useCallback(() => {
    reset(pendingConfig);
  }, [reset, pendingConfig]);

  // Traffic perturbation
  const perturbTraffic = useCallback(
    (vehicleIndex: number = 0, factor: number = 0.25) => {
      simRef.current.perturbVehicle(vehicleIndex, factor);
      const snapshot = simRef.current.getState();
      const targetVehicle = snapshot.vehicles[vehicleIndex];

      if (targetVehicle) {
        setHighlightedVehicleId(targetVehicle.id);
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = window.setTimeout(() => {
          setHighlightedVehicleId(null);
        }, 3000);
      }

      setState(snapshot);
    },
    [],
  );

  const setSpaceTimeWindow = useCallback((seconds: number) => {
    setSpaceTimeWindowState(seconds);
    spaceTimeGridRef.current = new SpaceTimeGrid({
      roadLength: config.roadLength,
      sampleInterval: 0.25,
      maxDuration: seconds,
    });
  }, [config.roadLength]);

  const replayScenario = useCallback(
    (
      targetConfig: SimulationConfig,
      perturbation: PerturbationSchedule | null,
    ) => {
      scheduledPerturbationRef.current = perturbation;
      perturbationFiredRef.current = false;
      reset(targetConfig);
      setIsRunning(true);
    },
    [reset],
  );

  const isResetNeeded =
    pendingConfig.vehicleCount !== config.vehicleCount ||
    pendingConfig.seed !== config.seed;

  return {
    state,
    config,
    pendingConfig,
    isResetNeeded,
    isRunning,
    speedMultiplier,
    highlightedVehicleId,
    timeSeriesData,
    spaceTimeSlices,
    spaceTimeWindow,
    play,
    pause,
    togglePlay,
    setSpeedMultiplier,
    reset,
    applyPreset,
    updateLiveParam,
    setPendingVehicleCount,
    setPendingSeed,
    applyPendingChanges,
    perturbTraffic,
    setSpaceTimeWindow,
    replayScenario,
  };
}
