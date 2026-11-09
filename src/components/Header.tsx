/**
 * Application header component.
 *
 * Provides a clean scientific dashboard title, descriptive subtitle,
 * and technical metadata badges highlighting key physical parameters.
 */

import React from 'react';

export interface HeaderProps {
  seed: number;
  roadLength: number;
  fixedDt: number;
  isRunning: boolean;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  seed,
  roadLength,
  fixedDt,
  isRunning,
  onOpenGuide,
}) => {
  return (
    <header className="app-header">
      {/* Title & Tagline Group */}
      <div className="header-brand-group">
        <span className="header-logo-badge" aria-hidden="true">
          🚦
        </span>
        <div className="header-text-group">
          <div className="header-title-row">
            <h1 className="header-app-title">TrafficFlow Lab</h1>
            <span className="header-engine-pill">IDM Engine</span>
          </div>
          <p className="header-tagline">
            Microscopic Simulation of Emergent Phantom Traffic Jams on a Circular Highway
          </p>
        </div>
      </div>

      {/* Actions & Compact Metadata Group */}
      <div className="header-actions-group">
        {/* Compact Metadata Chip with Hover Tooltip */}
        <div
          className="header-tech-chip"
          title={`Numerical integration: Semi-implicit Euler scheme (Δt = ${fixedDt}s, 20 Hz)\nBoundary: Periodic closed loop (L = ${roadLength}m)\nDeterministic PRNG Seed: #${seed}`}
        >
          <span className="chip-label">Loop</span>
          <span>{roadLength}m</span>
          <span style={{ color: '#475569' }}>·</span>
          <span className="chip-label">Δt</span>
          <span>{fixedDt}s</span>
          <span style={{ color: '#475569' }}>·</span>
          <span className="chip-label">Seed</span>
          <span>#{seed}</span>
        </div>

        {/* Live Simulation Status Indicator */}
        <div
          className={`header-status-badge ${isRunning ? 'running' : 'paused'}`}
          aria-live="polite"
        >
          <span className="header-status-dot" />
          <span>{isRunning ? 'RUNNING' : 'PAUSED'}</span>
        </div>

        {/* Science Guide Button */}
        <button
          onClick={onOpenGuide}
          className="header-guide-btn"
          title="Open Science & Physics Guide"
        >
          <span aria-hidden="true">📚</span>
          <span>Science Guide</span>
        </button>
      </div>
    </header>
  );
};
