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
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        background: '#0b1120',
        borderBottom: '1px solid #1e293b',
        gap: '16px',
      }}
    >
      {/* Title & Subtitle */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              fontSize: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #3b82f6 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.4)',
            }}
          >
            🚦
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#f8fafc',
            }}
          >
            TrafficFlow Lab
          </h1>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
            }}
          >
            IDM Engine
          </span>
        </div>
        <p
          style={{
            margin: '4px 0 0 42px',
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          Microscopic Simulation of Emergent Phantom Traffic Jams on a Circular Highway
        </p>
      </div>

      {/* Scientific Metadata Badges */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Badge label="Highway" value={`${roadLength}m loop`} />
        <Badge label="Timestep" value={`Δt = ${fixedDt}s`} />
        <Badge label="Solver" value="Semi-implicit Euler" />
        <Badge label="Seed" value={`#${seed}`} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: isRunning
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(245, 158, 11, 0.1)',
            border: isRunning
              ? '1px solid rgba(34, 197, 94, 0.3)'
              : '1px solid rgba(245, 158, 11, 0.3)',
            color: isRunning ? '#4ade80' : '#fbbf24',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isRunning ? '#22c55e' : '#f59e0b',
            }}
          />
          {isRunning ? 'RUNNING' : 'PAUSED'}
        </div>
        <button
          onClick={onOpenGuide}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '6px',
            border: '1px solid #0284c7',
            background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
            color: '#f0f9ff',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
            transition: 'all 0.15s ease',
          }}
        >
          <span>📚</span> Science Guide
        </button>
      </div>
    </header>
  );
};

const Badge: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      padding: '4px 10px',
      borderRadius: '6px',
      background: '#131c2e',
      border: '1px solid #1e293b',
      fontSize: '11px',
      color: '#cbd5e1',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}
  >
    <span style={{ color: '#64748b' }}>{label}:</span>
    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
  </div>
);
