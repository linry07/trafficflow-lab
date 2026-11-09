import { describe, it, expect } from 'vitest';
import {
  computeAllMetrics,
  computeDensity,
} from '../../src/engine/metrics';
import { createVehicle } from '../../src/engine/Vehicle';

describe('Traffic Engineering Metrics & Unit Conversions', () => {
  const roadLength = 1000; // meters = 1.0 km

  it('correctly converts m/s to km/h (factor 3.6)', () => {
    const speedMs = 33.3; // ~120 km/h
    const speedKmh = speedMs * 3.6;
    expect(speedKmh).toBeCloseTo(119.88, 1);
  });

  it('correctly converts density from veh/m to veh/km (factor 1000)', () => {
    const densityVehPerM = computeDensity(30, roadLength); // 30 veh / 1000 m = 0.03 veh/m
    const densityVehPerKm = densityVehPerM * 1000;
    expect(densityVehPerKm).toBe(30); // 30 vehicles per 1 km
  });

  it('satisfies macroscopic traffic flow equation Q = ρ * v̄ in both SI and traffic engineering units', () => {
    // 30 vehicles traveling at 25 m/s (~90 km/h) on a 1000m road
    const vehicles = Array.from({ length: 30 }, (_, i) =>
      createVehicle(i, i * 30, 25),
    );
    const metrics = computeAllMetrics(vehicles, roadLength, 33.3);

    // In SI units: Q (veh/s) = ρ (veh/m) * v̄ (m/s)
    expect(metrics.flow).toBeCloseTo(metrics.density * metrics.averageSpeed, 8);

    // In traffic engineering units:
    // Q_hourly (veh/h) = Density (veh/km) * AvgSpeed (km/h)
    const densityPerKm = metrics.density * 1000;
    const avgSpeedKmh = metrics.averageSpeed * 3.6;
    const flowHourly = densityPerKm * avgSpeedKmh;

    // Verify consistency: Q_hourly = Q_SI * 3600
    expect(flowHourly).toBeCloseTo(metrics.flow * 3600, 5);
    expect(flowHourly).toBeCloseTo(30 * 90, 5); // 2700 veh/h
  });

  it('computes congestion percentage accurately', () => {
    // 10 vehicles: 3 traveling at 5 m/s (< 30% of 33.3m/s), 7 at 30 m/s
    const vehicles = [
      ...Array.from({ length: 3 }, (_, i) => createVehicle(i, i * 30, 5)),
      ...Array.from({ length: 7 }, (_, i) => createVehicle(i + 3, (i + 3) * 30, 30)),
    ];
    const metrics = computeAllMetrics(vehicles, roadLength, 33.3);
    const congestionPct = metrics.congestionFraction * 100;

    expect(congestionPct).toBeCloseTo(30.0, 1);
  });
});
