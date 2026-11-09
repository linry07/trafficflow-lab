import { describe, it, expect } from 'vitest';
import {
  getSpeedCategory,
  getSpeedColor,
  getSpeedColorInfo,
} from '../../src/visualization/colorScale';

describe('colorScale — getSpeedCategory', () => {
  const v0 = 33.3; // ~120 km/h

  it('classifies stopped or crawl speed as congested (<= 30% v0)', () => {
    expect(getSpeedCategory(0, v0)).toBe('congested');
    expect(getSpeedCategory(v0 * 0.15, v0)).toBe('congested');
    expect(getSpeedCategory(v0 * 0.30, v0)).toBe('congested');
  });

  it('classifies mid-speed as slowing (0.30 v0 < v < 0.75 v0)', () => {
    expect(getSpeedCategory(v0 * 0.35, v0)).toBe('slowing');
    expect(getSpeedCategory(v0 * 0.50, v0)).toBe('slowing');
    expect(getSpeedCategory(v0 * 0.74, v0)).toBe('slowing');
  });

  it('classifies near v0 or above as free-flow (>= 0.75 v0)', () => {
    expect(getSpeedCategory(v0 * 0.75, v0)).toBe('free-flow');
    expect(getSpeedCategory(v0 * 0.95, v0)).toBe('free-flow');
    expect(getSpeedCategory(v0, v0)).toBe('free-flow');
    expect(getSpeedCategory(v0 * 1.2, v0)).toBe('free-flow');
  });

  it('handles negative or zero v0 safely', () => {
    expect(getSpeedCategory(10, 0)).toBe('congested');
    expect(getSpeedCategory(10, -5)).toBe('congested');
  });
});

describe('colorScale — getSpeedColor', () => {
  const v0 = 30;

  it('returns valid 7-character hex colors', () => {
    const testSpeeds = [0, 5, 10, 15, 20, 25, 30, 35];
    for (const speed of testSpeeds) {
      const color = getSpeedColor(speed, v0);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('returns reddish tones at speed 0', () => {
    const color = getSpeedColor(0, v0).toLowerCase();
    // In #ef4444, R (ef=239) is much higher than G (44=68) and B (44=68)
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    expect(r).toBeGreaterThan(200);
    expect(r).toBeGreaterThan(g * 2);
  });

  it('returns greenish tones at full speed v0', () => {
    const color = getSpeedColor(v0, v0).toLowerCase();
    // Green channel should dominate
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    expect(g).toBeGreaterThan(150);
    expect(g).toBeGreaterThan(r);
  });
});

describe('colorScale — getSpeedColorInfo', () => {
  it('returns synchronized color, category, and ratio', () => {
    const info = getSpeedColorInfo(15, 30);
    expect(info.ratio).toBeCloseTo(0.5);
    expect(info.category).toBe('slowing');
    expect(info.color).toBe(getSpeedColor(15, 30));
  });
});
