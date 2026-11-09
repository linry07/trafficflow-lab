import { describe, it, expect, vi } from 'vitest';
import { ExperimentWorkerManager } from '../../src/experiments/ExperimentWorkerManager';
import { DensitySweepResults } from '../../src/experiments/ExperimentRunner';

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  postedMessages: unknown[] = [];

  postMessage(message: unknown) {
    this.postedMessages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  simulateMessage(data: unknown) {
    if (!this.terminated && this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  simulateError(message: string) {
    if (!this.terminated && this.onerror) {
      this.onerror({ message } as ErrorEvent);
    }
  }
}

describe('ExperimentWorkerManager — Cancellation, Generational Isolation & Restart', () => {
  it('terminates active worker immediately on cancel()', () => {
    let mockWorker: MockWorker | null = null;
    const factory = () => {
      mockWorker = new MockWorker();
      return mockWorker as unknown as Worker;
    };

    const manager = new ExperimentWorkerManager(factory);
    expect(manager.isRunning()).toBe(false);

    let canceled = false;
    manager.start(
      { minVehicles: 15, maxVehicles: 30 },
      {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      },
    );

    expect(manager.isRunning()).toBe(true);
    expect(mockWorker).not.toBeNull();
    expect(mockWorker!.terminated).toBe(false);
    expect(mockWorker!.postedMessages).toHaveLength(1);
    expect(mockWorker!.postedMessages[0].type).toBe('START');

    // Cancel
    manager.cancel({
      onCancel: () => {
        canceled = true;
      },
    });

    expect(mockWorker!.terminated).toBe(true);
    expect(manager.isRunning()).toBe(false);
    expect(canceled).toBe(true);
  });

  it('drops stale completion messages from a canceled worker instance', () => {
    let mockWorker: MockWorker | null = null;
    const factory = () => {
      mockWorker = new MockWorker();
      return mockWorker as unknown as Worker;
    };

    const manager = new ExperimentWorkerManager(factory);
    const onComplete = vi.fn();
    const onProgress = vi.fn();

    manager.start(
      { minVehicles: 15, maxVehicles: 30 },
      {
        onProgress,
        onComplete,
        onError: vi.fn(),
      },
    );

    const worker1 = mockWorker!;
    manager.cancel();

    // Stale complete message arriving after cancellation
    worker1.simulateMessage({
      type: 'COMPLETE',
      payload: {
        config: {},
        groups: [],
        totalTrialsCompleted: 20,
        executionDurationMs: 500,
      },
    });

    // onComplete must NOT have been called
    expect(onComplete).not.toHaveBeenCalled();
    expect(manager.isRunning()).toBe(false);
  });

  it('allows starting and completing a new experiment after canceling an earlier one', () => {
    const createdWorkers: MockWorker[] = [];
    const factory = () => {
      const w = new MockWorker();
      createdWorkers.push(w);
      return w as unknown as Worker;
    };

    const manager = new ExperimentWorkerManager(factory);
    const onComplete1 = vi.fn();
    const onComplete2 = vi.fn();

    // Run 1
    manager.start({ minVehicles: 15, maxVehicles: 25 }, {
      onProgress: vi.fn(),
      onComplete: onComplete1,
      onError: vi.fn(),
    });
    expect(createdWorkers).toHaveLength(1);
    const worker1 = createdWorkers[0];

    manager.cancel();
    expect(worker1.terminated).toBe(true);
    expect(manager.isRunning()).toBe(false);

    // Run 2
    manager.start({ minVehicles: 20, maxVehicles: 40 }, {
      onProgress: vi.fn(),
      onComplete: onComplete2,
      onError: vi.fn(),
    });
    expect(createdWorkers).toHaveLength(2);
    const worker2 = createdWorkers[1];
    expect(worker2.terminated).toBe(false);
    expect(manager.isRunning()).toBe(true);

    // Run 2 completes
    const mockPayload: DensitySweepResults = {
      config: {
        minVehicles: 10,
        maxVehicles: 30,
        stepVehicles: 10,
        trialsPerCount: 5,
        duration: 30,
        warmupDuration: 10,
        roadLength: 1000,
        vehicleLength: 5,
        idm: { v0: 33.3, s0: 2, T: 1.5, a: 1, b: 3, delta: 4 },
        dt: 0.05,
        perturbation: null,
      },
      groups: [],
      totalTrialsCompleted: 10,
      estimatedTransitionWindow: null,
      executionDurationMs: 400,
    };
    worker2.simulateMessage({
      type: 'COMPLETE',
      payload: mockPayload,
    });

    expect(onComplete1).not.toHaveBeenCalled();
    expect(onComplete2).toHaveBeenCalledWith(mockPayload);
    expect(manager.isRunning()).toBe(false);
    expect(worker2.terminated).toBe(true);
  });
});
