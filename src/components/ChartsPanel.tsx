/**
 * Real-time Time-Series Analytics Panel.
 *
 * Displays three scientific time-series plots over simulated time:
 *   1. Average Speed (km/h) with desired speed v0 reference line
 *   2. Congested Vehicles (%) with congestion threshold indicator
 *   3. Traffic Flow (veh/h) derived from Q = ρ * v̄
 *
 * Engineered with Recharts, responsive layout, dark scientific theme,
 * and zero physics overhead.
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TimeSeriesPoint } from '../analytics/TimeSeriesCollector';
import { exportTimeSeriesCSV, downloadFile } from '../analytics/exportData';

export interface ChartsPanelProps {
  data: ReadonlyArray<TimeSeriesPoint>;
  v0: number; // Desired speed in m/s
  time: number;
}

type ActiveChartTab = 'all' | 'speed' | 'congestion' | 'flow';

export const ChartsPanel: React.FC<ChartsPanelProps> = ({
  data,
  v0,
  time,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveChartTab>('all');
  const v0Kmh = Math.round(v0 * 3.6);
  const congestionSpeedKmh = Math.round(v0 * 0.3 * 3.6);

  // Display empty notice if no data points yet
  if (data.length === 0) {
    return (
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
        }}
      >
        Collecting time-series data from simulation...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      {/* Top Header & Tab Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '12px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>📈</span> Time-Series Traffic Analytics
          </h2>
          <p
            style={{
              margin: '2px 0 0 0',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            Evolution of macroscopic traffic dynamics sampled strictly per simulated second (t_sim = {time.toFixed(1)}s)
          </p>
        </div>

        {/* Tab filters & CSV Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              background: '#131c2e',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid #334155',
            }}
          >
            <TabButton
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              label="Grid (All 3)"
            />
            <TabButton
              active={activeTab === 'speed'}
              onClick={() => setActiveTab('speed')}
              label="Speed"
            />
            <TabButton
              active={activeTab === 'congestion'}
              onClick={() => setActiveTab('congestion')}
              label="Congestion"
            />
            <TabButton
              active={activeTab === 'flow'}
              onClick={() => setActiveTab('flow')}
              label="Traffic Flow"
            />
          </div>

          <button
            onClick={() => {
              const csv = exportTimeSeriesCSV([...data]);
              downloadFile(csv, `trafficflow_timeseries_${Date.now()}.csv`);
            }}
            title="Export recorded time-series samples to CSV"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>📥</span> CSV
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            activeTab === 'all'
              ? 'repeat(auto-fit, minmax(340px, 1fr))'
              : '1fr',
          gap: '16px',
        }}
      >
        {/* 1. Average Speed Chart */}
        {(activeTab === 'all' || activeTab === 'speed') && (
          <ChartCard
            title="Average Vehicle Speed"
            unit="km/h"
            currentValue={
              data.length > 0 ? `${data[data.length - 1].avgSpeedKmh.toFixed(1)}` : '0'
            }
            color="#38bdf8"
            height={activeTab === 'all' ? 220 : 300}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data as unknown as Array<Record<string, unknown>>} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(t) => `${t}s`}
                />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, Math.max(v0Kmh + 10, 140)]} />
                <Tooltip content={<CustomTooltip unit="km/h" labelName="Speed" />} />
                {/* Desired speed v0 reference line */}
                <ReferenceLine
                  y={v0Kmh}
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  label={{ value: `v₀: ${v0Kmh}`, fill: '#64748b', fontSize: 10, position: 'right' }}
                />
                {/* Congestion threshold speed line */}
                <ReferenceLine
                  y={congestionSpeedKmh}
                  stroke="#ef4444"
                  strokeDasharray="2 2"
                  label={{ value: `30% v₀: ${congestionSpeedKmh}`, fill: '#ef4444', fontSize: 9, position: 'insideBottomRight' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgSpeedKmh"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* 2. Congestion Percentage Chart */}
        {(activeTab === 'all' || activeTab === 'congestion') && (
          <ChartCard
            title="Percentage of Congested Vehicles"
            unit="%"
            currentValue={
              data.length > 0 ? `${data[data.length - 1].congestionPct.toFixed(1)}` : '0'
            }
            color="#ef4444"
            height={activeTab === 'all' ? 220 : 300}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data as unknown as Array<Record<string, unknown>>} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(t) => `${t}s`}
                />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip unit="%" labelName="Congested" />} />
                <ReferenceLine
                  y={15}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{ value: 'Jam threshold (15%)', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }}
                />
                <Line
                  type="monotone"
                  dataKey="congestionPct"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* 3. Traffic Flow Chart */}
        {(activeTab === 'all' || activeTab === 'flow') && (
          <ChartCard
            title="Traffic Flow (Q)"
            unit="veh/h"
            currentValue={
              data.length > 0 ? `${data[data.length - 1].flowHourly.toLocaleString()}` : '0'
            }
            color="#34d399"
            height={activeTab === 'all' ? 220 : 300}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data as unknown as Array<Record<string, unknown>>} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(t) => `${t}s`}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  domain={[0, 'auto']}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
                />
                <Tooltip content={<CustomTooltip unit="veh/h" labelName="Flow Q" />} />
                <Line
                  type="monotone"
                  dataKey="flowHourly"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
};

interface ChartCardProps {
  title: string;
  unit: string;
  currentValue: string;
  color: string;
  height: number;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  unit,
  currentValue,
  color,
  height,
  children,
}) => {
  return (
    <div
      style={{
        background: '#131c2e',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '8px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#cbd5e1',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color,
            fontFamily: 'monospace',
          }}
        >
          {currentValue} {unit}
        </span>
      </div>
      <div style={{ width: '100%', height: `${height}px` }}>{children}</div>
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 10px',
      borderRadius: '4px',
      border: 'none',
      background: active ? '#3b82f6' : 'transparent',
      color: active ? '#ffffff' : '#94a3b8',
      fontWeight: 600,
      fontSize: '11px',
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
);

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{
    value?: number | string;
    color?: string;
  }>;
  label?: number;
  unit: string;
  labelName: string;
}> = ({ active, payload, label, unit, labelName }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          color: '#f8fafc',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ color: payload[0].color ?? '#f8fafc', fontWeight: 700 }}>
          Time: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{label}s</span>
        </div>
        <div style={{ color: payload[0].color, fontWeight: 700 }}>
          {labelName}: {payload[0].value} {unit}
        </div>
      </div>
    );
  }
  return null;
};
