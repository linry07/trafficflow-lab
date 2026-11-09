/**
 * ScienceGuideModal — Interactive Educational Guide for TrafficFlow Lab.
 *
 * Provides a rigorous, scientifically grounded explanation of:
 *   - Emergent phantom traffic jams (Sugiyama et al., 2008)
 *   - The Intelligent Driver Model (Treiber, Hennecke, Helbing, 2000)
 *   - String instability & backward shockwave propagation
 *   - The Macroscopic Fundamental Diagram (Q = ρ * v̄)
 *   - Traffic interventions (Variable Speed Limits, CAV platooning)
 */

import React, { useState } from 'react';

export interface ScienceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideSection =
  | 'overview'
  | 'idm-model'
  | 'string-instability'
  | 'fundamental-diagram'
  | 'interventions';

export const ScienceGuideModal: React.FC<ScienceGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<GuideSection>('overview');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 9, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          maxWidth: '860px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#131c2e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📚</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                Traffic Science &amp; Physics Guide
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Mathematical foundations of microscopic traffic flow and emergent phantom jams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1e293b',
            background: '#0b1120',
            overflowX: 'auto',
          }}
        >
          <NavTab
            label="1. Phantom Jams"
            active={activeSection === 'overview'}
            onClick={() => setActiveSection('overview')}
          />
          <NavTab
            label="2. IDM Mathematics"
            active={activeSection === 'idm-model'}
            onClick={() => setActiveSection('idm-model')}
          />
          <NavTab
            label="3. String Instability"
            active={activeSection === 'string-instability'}
            onClick={() => setActiveSection('string-instability')}
          />
          <NavTab
            label="4. Fundamental Diagram"
            active={activeSection === 'fundamental-diagram'}
            onClick={() => setActiveSection('fundamental-diagram')}
          />
          <NavTab
            label="5. Policy Interventions"
            active={activeSection === 'interventions'}
            onClick={() => setActiveSection('interventions')}
          />
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            fontSize: '13px',
            lineHeight: 1.7,
            color: '#cbd5e1',
          }}
        >
          {activeSection === 'overview' && (
            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '16px' }}>
                The Mystery of "Jamitons": Traffic Jams from Nothing
              </h3>
              <p>
                Every driver has experienced a phantom traffic jam: on a straight highway with no construction,
                no lane closures, and no vehicle collisions, traffic abruptly halts to a dead stop. Minutes later,
                the highway clears, leaving no trace of what caused the stoppage.
              </p>
              <div
                style={{
                  background: 'rgba(2, 132, 199, 0.1)',
                  borderLeft: '4px solid #0284c7',
                  padding: '12px 16px',
                  borderRadius: '4px',
                  margin: '16px 0',
                }}
              >
                <strong style={{ color: '#38bdf8' }}>The 2008 Nagoya Experiment (Sugiyama et al.):</strong>
                <p style={{ margin: '6px 0 0 0' }}>
                  Physicists placed 22 identical passenger cars on a 230-meter single-lane circular track and asked
                  drivers to maintain a steady 30 km/h speed with constant headway. Despite uniform instructions,
                  tiny variations in reaction times caused small braking pulses to amplify backward along the loop,
                  spontaneously producing a persistent stop-and-go shockwave within 40 seconds.
                </p>
              </div>
              <p>
                <strong>TrafficFlow Lab</strong> models this exact physical system on a 1,000-meter closed ring.
                Because the circular road has periodic boundary conditions with no exits or entrances, it isolates
                the pure non-linear dynamics of driver-to-driver interaction without external boundary noise.
              </p>
            </div>
          )}

          {activeSection === 'idm-model' && (
            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '16px' }}>
                The Intelligent Driver Model (IDM)
              </h3>
              <p>
                Formulated by <em>Treiber, Hennecke, and Helbing (2000)</em>, the IDM is the benchmark continuous
                microscopic car-following model in transportation science. It combines a free-flow acceleration tendency
                with an interaction braking term that penalizes closing in on a vehicle ahead.
              </p>

              {/* Equation Box */}
              <div
                style={{
                  background: '#131c2e',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '16px',
                  margin: '16px 0',
                  fontFamily: 'monospace',
                  color: '#38bdf8',
                  fontSize: '13px',
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '6px' }}>ACCELERATION EQUATION:</div>
                <div>a(s, v, Δv) = a_max · [ 1 - (v / v₀)^δ - (s*(v, Δv) / s)² ]</div>
                <div style={{ height: '8px' }} />
                <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '6px' }}>EFFECTIVE DESIRED GAP:</div>
                <div>s*(v, Δv) = s₀ + v · T + (v · Δv) / (2 · √(a_max · b))</div>
              </div>

              <h4 style={{ color: '#f8fafc', margin: '14px 0 6px 0', fontSize: '14px' }}>Parameter Breakdown:</h4>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li><strong>v₀ (Desired Speed):</strong> Target velocity on an open highway (default: 120 km/h = 33.3 m/s).</li>
                <li><strong>s₀ (Standstill Distance):</strong> Minimum bumper-to-bumper gap when vehicles are completely stopped (default: 2.0 m).</li>
                <li><strong>T (Safety Time Headway):</strong> Time gap drivers want to maintain to their leader (default: 1.5 s). At speed v, this adds a distance of v·T.</li>
                <li><strong>a_max (Comfortable Acceleration):</strong> Maximum acceleration from standstill (default: 1.0 m/s²).</li>
                <li><strong>b (Comfortable Deceleration):</strong> Target braking magnitude during normal following (default: 3.0 m/s²).</li>
                <li><strong>Δv (Approach Rate):</strong> Relative velocity Δv = v_follower - v_leader. Positive when catching up to a slower leader.</li>
              </ul>
            </div>
          )}

          {activeSection === 'string-instability' && (
            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '16px' }}>
                String Instability &amp; Backward Wave Propagation
              </h3>
              <p>
                A traffic stream is <strong>locally stable</strong> if a single vehicle can smoothly follow another without colliding.
                However, it is <strong>string unstable</strong> if a minor disturbance (e.g., a driver tapping their brakes for 1 second)
                amplifies in magnitude as it propagates upstream from vehicle to vehicle:
              </p>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '14px',
                  margin: '14px 0',
                }}
              >
                <div style={{ fontWeight: 700, color: '#fca5a5' }}>
                  String Instability Condition (Lyapunov L₂-norm Growth):
                </div>
                <div style={{ fontFamily: 'monospace', color: '#fecaca', margin: '6px 0' }}>
                  || δv_{'{'}i+1{'}'} || &gt; || δv_i ||
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                  When vehicle density exceeds the critical threshold (typically ~27.5 veh/km on our 1,000m track),
                  the interaction term dominates the damping term, turning the perturbation into a self-sustaining shockwave.
                </p>
              </div>

              <h4 style={{ color: '#f8fafc', margin: '14px 0 6px 0', fontSize: '14px' }}>
                Why Do Jams Move Backward? (Characteristic Wave Speed w)
              </h4>
              <p>
                In the Space-Time diagram, vehicle worldlines (green/yellow lines) always tilt forward because every vehicle travels in the forward direction (dx/dt &gt; 0).
                However, the <em>region of congestion</em> (the red stripe) slopes backward across space over time.
              </p>
              <p>
                This occurs because vehicles entering the rear of the jam must brake, while vehicles at the front are accelerating away.
                In classical Lighthill-Whitham-Richards (LWR) shockwave theory, the shock speed is:
              </p>
              <div
                style={{
                  background: '#131c2e',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontFamily: 'monospace',
                  color: '#34d399',
                  display: 'inline-block',
                }}
              >
                w = ΔQ / Δρ ≈ -15 to -20 km/h
              </div>
              <p style={{ marginTop: '10px' }}>
                The negative sign confirms that the jam wavefront propagates upstream against the direction of travel!
              </p>
            </div>
          )}

          {activeSection === 'fundamental-diagram' && (
            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '16px' }}>
                The Macroscopic Fundamental Diagram (MFD)
              </h3>
              <p>
                The fundamental relationship of transportation engineering connects traffic flow (throughput <em>Q</em> in veh/h),
                density (<em>ρ</em> in veh/km), and space-mean speed (<em>v̄</em> in km/h):
              </p>

              <div
                style={{
                  background: '#131c2e',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  margin: '12px 0',
                  fontFamily: 'monospace',
                  color: '#f8fafc',
                  fontSize: '14px',
                }}
              >
                Q = ρ · v̄
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '16px 0' }}>
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: '4px' }}>
                    1. Free-Flow Regime (ρ &lt; ρ_crit)
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                    Vehicles travel near desired speed v₀. As density increases, flow Q rises almost linearly: more vehicles pass the observer per hour.
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                    2. Congested Regime (ρ &gt; ρ_crit)
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                    Beyond critical capacity (peak throughput ~1,586 veh/h at ~30 veh/km), stop-and-go waves emerge. Average speed collapses faster than density increases, precipitating a <strong>capacity drop</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'interventions' && (
            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '16px' }}>
                Engineering &amp; Policy Interventions
              </h3>
              <p>
                How do traffic engineers prevent phantom jams without constructing additional lanes?
                Test these interventions directly in <strong>TrafficFlow Lab</strong> using the Scenario Presets menu:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '14px 0' }}>
                <div
                  style={{
                    background: '#131c2e',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                    🟡 Variable Speed Limits (VSL): Lowering v₀ at High Density
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                    Counter-intuitively, reducing the highway speed limit from 120 km/h to 80 km/h when density reaches 35 veh/km
                    <strong> prevents traffic jams from forming</strong>. Because desired gap is s* = s₀ + v·T, a lower speed
                    significantly shortens required headway and eliminates emergency over-braking, smoothing the flow and preserving capacity.
                  </p>
                </div>

                <div
                  style={{
                    background: '#131c2e',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                    🤖 Connected &amp; Autonomous Vehicles (CAV Platooning)
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                    Autonomous vehicles communicate via V2V (Vehicle-to-Vehicle) and have near-zero electronic reaction delay.
                    Setting safe headway to T = 0.8s allows 35–45 vehicles to travel at full highway speed without string instability,
                    effectively doubling roadway capacity without adding asphalt.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#131c2e',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#3b82f6',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

const NavTab: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px 18px',
      background: active ? '#1e293b' : 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent',
      color: active ? '#ffffff' : '#94a3b8',
      fontSize: '12px',
      fontWeight: active ? 700 : 500,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.15s ease',
    }}
  >
    {label}
  </button>
);
