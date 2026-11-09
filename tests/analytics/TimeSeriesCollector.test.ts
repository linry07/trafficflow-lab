import { describe, it, expect } from 'vitest';
import { TimeSeriesCollector } from '../../src/analytics/TimeSeriesCollector';
import { TrafficMetrics } from '../../src/engine/metrics';

describe('TimeSeriesCollector', () => {
  const mockMetrics: TrafficMetrics = {
    averageSpeed: 25.0, // 25 m/s = 90 km/h
    density: 0.03, // 0.03 veh/m = 30 veh/km
    flow: 0.75, // 0.75 veh/s = 2700 veh/h
    speedVariance: 2.5,
    congestionFraction: 0.1, // 10%
  };

  it('records initial point at time 0', () => {
    const collector = new TimeSeriesCollector({ sampleInterval: 0.5, maxDuration: 60 });
    const recorded = collector.record(0, mockMetrics);

    expect(recorded).toBe(true);
    expect(collector.count).toBe(1);

    const pt = collector.getLatestPoint()!;
    expect(pt.time).toBe(0);
    expect(pt.avgSpeedKmh).toBe(90);
    expect(pt.avgSpeedMs).toBe(25);
    expect(pt.densityPerKm).toBe(30);
    expect(pt.flowHourly).toBe(2700);
    expect(pt.congestionPct).toBe(10);
  });

  it('samples strictly based on simulated time, rejecting sub-interval steps', () => {
    const collector = new TimeSeriesCollector({ sampleInterval: 0.5 });
    collector.record(0, mockMetrics);

    // Sub-interval calls (e.g. physics steps at dt = 0.05s) should NOT add points
    expect(collector.record(0.05, mockMetrics)).toBe(false);
    expect(collector.record(0.10, mockMetrics)).toBe(false);
    expect(collector.record(0.45, mockMetrics)).toBe(false);
    expect(collector.count).toBe(1);

    // Once simulated time reaches or exceeds 0.5s, records a point
    expect(collector.record(0.50, mockMetrics)).toBe(true);
    expect(collector.count).toBe(2);

    expect(collector.record(0.55, mockMetrics)).toBe(false);
    expect(collector.record(1.00, mockMetrics)).toBe(true);
    expect(collector.count).toBe(3);
  });

  it('enforces bounded memory retention over sliding maxDuration window', () => {
    const maxDuration = 10; // retain 10 seconds of simulated time
    const collector = new TimeSeriesCollector({ sampleInterval: 1.0, maxDuration });

    // Record from t = 0 to t = 20 (21 points)
    for (let t = 0; t <= 20; t += 1.0) {
      collector.record(t, mockMetrics);
    }

    // Points older than t = 20 - 10 = 10 should be evicted
    const points = collector.getPoints();
    expect(points.length).toBeLessThanOrEqual(12);
    expect(points[0].time).toBeGreaterThanOrEqual(10);
    expect(collector.getLatestPoint()!.time).toBe(20);
    expect(collector.duration).toBeLessThanOrEqual(maxDuration + 0.1);
  });

  it('resets and clears history completely on simulation reset', () => {
    const collector = new TimeSeriesCollector();
    collector.record(0, mockMetrics);
    collector.record(0.5, mockMetrics);
    collector.record(1.0, mockMetrics);
    expect(collector.count).toBe(3);

    collector.clear();
    expect(collector.count).toBe(0);
    expect(collector.getLatestPoint()).toBeNull();

    // After clear, can record fresh from t = 0 again
    collector.record(0, mockMetrics);
    expect(collector.count).toBe(1);
    expect(collector.getLatestPoint()!.time).toBe(0);
  });

  it('is independent of rendering frame rate or execution speed', () => {
    // 10 seconds of simulated time sampled every 1.0s produces exactly 11 points (0..10)
    // regardless of whether simulated in 200 physics steps (dt=0.05) or 1000 steps (dt=0.01)
    const collectorA = new TimeSeriesCollector({ sampleInterval: 1.0 });
    for (let t = 0; t <= 10.001; t += 0.05) {
      collectorA.record(Math.round(t * 100) / 100, mockMetrics);
    }

    const collectorB = new TimeSeriesCollector({ sampleInterval: 1.0 });
    for (let t = 0; t <= 10.001; t += 0.01) {
      collectorB.record(Math.round(t * 100) / 100, mockMetrics);
    }

    expect(collectorA.count).toBe(collectorB.count);
    expect(collectorA.count).toBe(11);
    for (let i = 0; i < collectorA.count; i++) {
      expect(collectorA.getPoints()[i].time).toBe(collectorB.getPoints()[i].time);
    }
  });
});
