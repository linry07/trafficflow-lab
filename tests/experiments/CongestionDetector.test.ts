import { describe, it, expect } from 'vitest';
import { CongestionDetector } from '../../src/analytics/CongestionDetector';
import { TrafficMetrics } from '../../src/engine/metrics';

describe('CongestionDetector — Scientific Regime Classification', () => {
  const detector = new CongestionDetector({
    v0: 33.3, // ~120 km/h
    warmupDuration: 120, // 120s
    minJamDuration: 60, // 60s
  });

  const createSample = (time: number, speed: number, variance: number, congestion: number) => ({
    time,
    metrics: {
      averageSpeed: speed,
      density: 0.03,
      flow: (speed * 0.03),
      speedVariance: variance,
      congestionFraction: congestion,
    } as TrafficMetrics,
  });

  it('classifies free-flowing traffic correctly', () => {
    // 200 seconds of free flowing traffic (v = 30 m/s, zero congestion)
    const history = [];
    for (let t = 0; t <= 200; t += 1.0) {
      history.push(createSample(t, 30.0, 0.2, 0.0));
    }

    const result = detector.analyze(history);
    expect(result.regime).toBe('free-flow');
    expect(result.isSustainedJam).toBe(false);
    expect(result.maxCongestionFraction).toBe(0);
    expect(result.sustainedJamDuration).toBe(0);
  });

  it('distinguishes a transient braking disturbance from a sustained jam', () => {
    // Disturbance occurs at t=130s, persists for 20s, then dissipates by t=150s
    const history = [];
    for (let t = 0; t <= 240; t += 1.0) {
      if (t >= 130 && t <= 150) {
        // Temporary braking wave (20s duration)
        history.push(createSample(t, 15.0, 10.0, 0.35));
      } else {
        history.push(createSample(t, 28.0, 0.5, 0.0));
      }
    }

    const result = detector.analyze(history);
    // Transient disturbance detected, but NOT a sustained jam because duration (20s) < 60s
    expect(result.regime).toBe('transient-disturbance');
    expect(result.isSustainedJam).toBe(false);
    expect(result.sustainedJamDuration).toBeGreaterThanOrEqual(20);
    expect(result.sustainedJamDuration).toBeLessThan(30);
    expect(result.maxCongestionFraction).toBe(0.35);
  });

  it('distinguishes uniformly slow traffic from stop-and-go waves', () => {
    // Low average speed (v = 8 m/s, < 40% v0), but variance is near zero (everyone crawls together)
    // Low variance indicates absence of stop-and-go waves
    const history = [];
    for (let t = 0; t <= 240; t += 1.0) {
      history.push(createSample(t, 8.0, 0.2, 0.05));
    }

    const result = detector.analyze(history);
    expect(result.regime).toBe('uniformly-slow');
    expect(result.isSustainedJam).toBe(false);
  });

  it('identifies persistent stop-and-go waves as a sustained traffic jam', () => {
    // Post-warmup (t >= 120s), high congestion (30%) AND high variance (8.0 (m/s)²) persist for 80s
    const history = [];
    for (let t = 0; t <= 240; t += 1.0) {
      if (t < 120) {
        // Warmup period
        history.push(createSample(t, 25.0, 1.0, 0.0));
      } else if (t >= 130 && t <= 210) {
        // 80s of sustained stop-and-go waves
        history.push(createSample(t, 12.0, 8.5, 0.30));
      } else {
        history.push(createSample(t, 25.0, 1.0, 0.0));
      }
    }

    const result = detector.analyze(history);
    expect(result.regime).toBe('sustained-jam');
    expect(result.isSustainedJam).toBe(true);
    expect(result.sustainedJamDuration).toBeGreaterThanOrEqual(60);
    expect(result.maxCongestionFraction).toBe(0.30);
  });

  it('correctly excludes transients that occur during the warmup period', () => {
    // Congestion only occurs during the first 100 seconds (before t=120s warmup cutoff)
    const history = [];
    for (let t = 0; t <= 200; t += 1.0) {
      if (t < 100) {
        history.push(createSample(t, 5.0, 12.0, 0.50)); // Heavy initial transient
      } else {
        history.push(createSample(t, 30.0, 0.2, 0.0)); // Settled free flow
      }
    }

    const result = detector.analyze(history);
    // Because post-warmup traffic is free-flowing, warmup congestion is ignored
    expect(result.isSustainedJam).toBe(false);
    expect(result.regime).toBe('free-flow');
    expect(result.maxCongestionFraction).toBe(0);
  });

  it('debounces brief momentary fluctuations during a sustained wave without prematurely resetting the timer', () => {
    // 70 seconds total wave from t=130 to t=200, but with a 1-second dip at t=160
    const history = [];
    for (let t = 0; t <= 240; t += 1.0) {
      if (t >= 130 && t <= 200) {
        if (t === 160) {
          // 1-second brief fluctuation below threshold
          history.push(createSample(t, 20.0, 2.5, 0.10));
        } else {
          // Active stop-and-go wave
          history.push(createSample(t, 12.0, 8.0, 0.30));
        }
      } else {
        history.push(createSample(t, 28.0, 0.5, 0.0));
      }
    }

    const result = detector.analyze(history);
    // The brief 1s fluctuation should be debounced by the 3s grace period
    expect(result.isSustainedJam).toBe(true);
    expect(result.regime).toBe('sustained-jam');
    expect(result.sustainedJamDuration).toBeGreaterThanOrEqual(60);
  });
});
