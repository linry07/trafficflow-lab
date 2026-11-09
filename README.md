# TrafficFlow Lab 🚦🔬

> **An interactive microscopic traffic simulator and computational experimentation platform for discovering emergent phantom traffic jams.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Tests-185%20Passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📌 Executive Summary

**TrafficFlow Lab** is a portfolio-grade, web-based computational laboratory designed to demonstrate and empirically investigate **emergent phantom traffic jams** (*jamitons*). 

Without traffic signals, lane drops, or vehicular accidents, uniform highway traffic spontaneously collapses into severe stop-and-go waves once vehicle density exceeds a critical threshold. Built upon the scientifically established **Intelligent Driver Model (IDM)**, TrafficFlow Lab pairs a zero-dependency 20 Hz semi-implicit physics engine with a multi-threaded **Automatic Experiment Discovery Engine** running in Web Workers.

```
+---------------------------------------------------------------------------------------------------+
|                                       TRAFFICFLOW LAB PLATFORM                                    |
+------------------------------------+----------------------------------+---------------------------+
|      Microscopic Physics Engine    |    Spatiotemporal Analytics      |  Headless Worker Engine   |
|   • Pure TypeScript, 0 DOM deps    |   • High-DPI Circular Highway    |  • Multi-seed Sweeps      |
|   • Intelligent Driver Model (IDM) |   • Space-Time (Kessel) Diagram  |  • Wilson 95% Score CIs   |
|   • Semi-implicit Euler (Δt=0.05s) |   • Time-series (Speed/Flow/Pct) |  • Empirical Discovery    |
|   • Periodic Ring L = 1,000m       |   • 4-Regime Jam Classification  |  • 1-Click Exact Replay   |
+------------------------------------+----------------------------------+---------------------------+
```

---

## 🔬 The Science of Phantom Traffic Jams

### 1. The Physical Phenomenon
In 2008, physicists at Nagoya University (Sugiyama et al.) placed 22 identical passenger cars on a 230-meter single-lane circular track and instructed all drivers to cruise at a constant 30 km/h with uniform headway. Despite these uniform conditions, small unavoidable variations in human reaction times caused slight braking fluctuations to amplify backward along the loop, spontaneously producing a severe stop-and-go shockwave within 40 seconds.

**TrafficFlow Lab** simulates this exact physical system on a closed circular ring ($L = 1000\text{ m}$) with periodic boundary conditions ($x \pmod L$). Because there are no highway entrances or exits, the total number of vehicles $N$ and the global density $\rho = N / L$ remain strictly conserved, isolating the non-linear collective dynamics.

### 2. The Intelligent Driver Model (IDM)
The longitudinal acceleration of each vehicle $i$ is governed by the continuous car-following model formulated by **Treiber, Hennecke, and Helbing (2000)**:

$$\dot{v}_i = a_{\text{max}} \left[ 1 - \left( \frac{v_i}{v_0} \right)^\delta - \left( \frac{s^*(v_i, \Delta v_i)}{s_i} \right)^2 \right]$$

Where the **dynamic effective desired gap** $s^*(v_i, \Delta v_i)$ is defined as:

$$s^*(v_i, \Delta v_i) = s_0 + v_i T + \frac{v_i \cdot \Delta v_i}{2 \sqrt{a_{\text{max}} \cdot b}}$$

#### Parameter Definitions & Physical Units
| Parameter | Symbol | Default Value | Physical Interpretation |
| :--- | :---: | :---: | :--- |
| **Desired Speed** | $v_0$ | $33.3\text{ m/s}$ ($120\text{ km/h}$) | Target cruising speed on an uninhibited, open highway. |
| **Standstill Distance** | $s_0$ | $2.0\text{ m}$ | Minimum bumper-to-bumper distance maintained in standstill traffic. |
| **Time Headway** | $T$ | $1.5\text{ s}$ | Safe time gap drivers maintain behind the leading vehicle ($s_{\text{headway}} = v \cdot T$). |
| **Maximum Acceleration** | $a$ | $1.0\text{ m/s}^2$ | Comfortable longitudinal acceleration from rest. |
| **Comfortable Deceleration** | $b$ | $3.0\text{ m/s}^2$ | Target braking magnitude during routine following maneuvers. |
| **Acceleration Exponent** | $\delta$ | $4$ | Controls how smoothly acceleration tapers off as speed approaches $v_0$. |
| **Approach Rate** | $\Delta v_i$ | $v_i - v_{\text{leader}}$ | Relative speed difference. Positive when catching up to a slower vehicle. |
| **Net Gap** | $s_i$ | $(x_{\text{leader}} - x_i \pmod L) - l_{\text{veh}}$ | Bumper-to-bumper clearance ($l_{\text{veh}} = 5\text{ m}$). |

---

### 3. String Instability & Backward Shockwaves

While individual vehicles are locally stable (a single driver smoothly decelerates behind a slowing leader), a vehicle platoon can become **string unstable** if disturbances grow in amplitude as they propagate upstream:

$$\| \delta v_{i+1} \|_{L_2} > \| \delta v_i \|_{L_2}$$

When vehicle density exceeds the critical threshold ($\rho > \rho_{\text{crit}}$), this string instability causes small perturbations (e.g., a 1-second brake tap) to trigger backward-traveling shockwaves.

#### The Backward Shockwave Velocity ($w$)
In the **Space-Time Diagram**, forward-moving vehicles trace positive worldline slopes ($\frac{dx}{dt} = v > 0$). However, the locus of congestion propagates upstream against the direction of travel at the characteristic wave speed:

$$w = \frac{\Delta Q}{\Delta \rho} \approx -15\text{ to } -20\text{ km/h}$$

Every vehicle moves forward, yet the traffic jam moves backward.

---

### 4. Macroscopic Fundamental Diagram ($Q = \rho \cdot \bar{v}$)
Traffic throughput (flow $Q$ in $\text{veh/h}$) is governed by the product of density ($\rho$ in $\text{veh/km}$) and space-mean speed ($\bar{v}$ in $\text{km/h}$):

$$Q = \rho \cdot \bar{v}$$

TrafficFlow Lab observes two distinct regimes:
1. **Free-Flow Regime ($\rho \le 25\text{ veh/km}$):** Speed remains high ($\approx 90\text{--}100\text{ km/h}$). Throughput increases linearly with density. Disturbances rapidly dissipate.
2. **Congested / Jammed Regime ($\rho \ge 30\text{ veh/km}$):** Beyond peak capacity ($Q \approx 1,586\text{ veh/h}$), emergent stop-and-go shockwaves force vehicles to brake to standstill, precipitating a **capacity drop**.

---

## 🛠️ Architecture & Engineering Highlights

```
src/
├── engine/                      # Zero-dependency, pure TypeScript physics
│   ├── IDMModel.ts              # Mathematical acceleration formulation & safety clamps
│   ├── Road.ts                  # Periodic boundary wrapping & bumper-to-bumper gap math
│   ├── Vehicle.ts               # Vehicle state data structures
│   ├── Simulation.ts            # Semi-implicit Euler integration & invariant guards
│   ├── SimulationConfig.ts      # Scientifically grounded presets & defaults
│   ├── SeededRandom.ts          # Mulberry32 32-bit deterministic PRNG
│   └── metrics.ts               # Macroscopic metrics (Q, rho, avg speed, variance)
├── analytics/                   # Spatial and temporal metrics collectors
│   ├── TimeSeriesCollector.ts   # Decoupled simulated-time sliding-window sampling
│   ├── SpaceTimeGrid.ts         # 100-bin spatial discretization & worldline trajectories
│   ├── CongestionDetector.ts    # 4-regime scientific jam classifier
│   └── exportData.ts            # RFC-4180 CSV & formatted JSON data exporter
├── experiments/                 # Automatic Experiment Discovery Engine
│   ├── Statistics.ts            # Wilson Score 95% Confidence Interval formulation
│   ├── ExperimentRunner.ts      # Multi-trial headless density sweep orchestrator
│   └── experiment.worker.ts     # Dedicated Web Worker offloading execution from UI thread
├── visualization/               # HTML5 Canvas rendering & color mapping
│   ├── RoadRenderer.ts          # Circular highway canvas rendering & distance ticks
│   ├── VehicleRenderer.ts       # Oriented capsules, headlights/taillights & halos
│   ├── SpaceTimePlot.ts         # Dual-mode space-time diagram (trajectories vs bins)
│   └── colorScale.ts            # Continuous green-amber-red velocity palette
├── components/                  # React dashboard components
│   ├── SimulationCanvas.tsx     # High-DPI, responsive canvas with ResizeObserver
│   ├── ControlPanel.tsx         # Playback, live params (v0, T), structural reset, presets
│   ├── MetricsPanel.tsx         # Real-time telemetry cards
│   ├── ChartsPanel.tsx          # Recharts real-time macroscopic time-series & CSV export
│   ├── SpaceTimePanel.tsx       # Spatiotemporal kymograph canvas controls
│   ├── ExperimentPanel.tsx      # Density sweep config, Wilson CI chart, replay table
│   └── ScienceGuideModal.tsx    # Interactive educational modal with equations & theory
└── hooks/
    ├── useAnimationLoop.ts      # Fixed-timestep accumulator (Δt = 0.05s) with background tab clamp
    ├── useSimulation.ts         # Lifecycle, live parameter updates & exact scenario replay
    └── useExperiment.ts         # Web Worker bridge for non-blocking parameter discovery
```

### Key Technical Achievements
1. **Zero-React Physics Engine:** The simulation engine has zero DOM or React dependencies. Headless simulation steps execute in pure memory at $> 4,300\times$ faster than real time ($35$ trials of $240\text{s}$ simulated time run in under $2\text{ seconds}$).
2. **Deterministic Reproducibility:** Mulberry32 32-bit PRNG guarantees that every run with the same seed and parameters produces bit-for-bit identical results across machines and environments.
3. **Decoupled Simulation & Animation Loop:** Integration uses a fixed $\Delta t = 0.05\text{s}$ ($20\text{ Hz}$) semi-implicit Euler scheme driven by a `requestAnimationFrame` accumulator with tab-unfocus delta clamping ($\le 0.25\text{s}$) and step caps ($\le 20\text{ steps/frame}$).
4. **4-Regime Congestion Detection with Debounced Hysteresis:** Distinguishes between `free-flow`, `transient-disturbance`, `uniformly-slow`, and `sustained-jam` by enforcing:
   - $120\text{s}$ warm-up exclusion (eliminates transient initialization artifacts).
   - Speed drop below $30\% v_0$ ($< 36\text{ km/h}$).
   - Persistence for $\ge 60$ contiguous simulated seconds with a $3.0\text{s}$ debounce grace period to avoid spurious resets during periodic wave oscillations.
   - Significant speed variance ($\sigma_v^2 \ge 3.0\text{ m}^2/\text{s}^2$) to distinguish stop-and-go waves from uniformly slow traffic.
5. **Statistical Rigor with Wilson Score Confidence Intervals & Common Random Numbers:**
   - Small-sample binomial proportions avoid inaccurate normal approximations ($p \pm 1.96 \sqrt{p(1-p)/n}$) by employing the asymmetric Wilson Score formulation:
     $$w_{\pm} = \frac{p + \frac{z^2}{2n} \pm z \sqrt{\frac{p(1-p)}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$
   - In deterministic simulations, the Wilson CI quantifies sampling uncertainty across independent micro-perturbation seeds (representing variations in initial vehicle spacings and driver speed perturbations).
   - Multi-density sweeps employ the **Common Random Numbers (CRN)** variance-reduction technique: the identical sequence of random seeds is reused across all density levels, guaranteeing that differences in jam probabilities arise strictly from density rather than seed selection.
6. **One-Click Scenario Replay:** Every trial evaluated in the headless Web Worker can be immediately loaded into the circular highway and space-time visualizer for exact, synchronous visual inspection.
7. **Production Data Export:** Full export capabilities allowing users to download CSV or JSON files of individual trials, density summary statistics, and active simulation time-series for external analysis in Python, R, or Excel.

---

## 📊 Empirical Findings & Critical Density Sweep

Running the **Automatic Experiment Discovery Engine** across 35 independent trials ($N = 15$ to $45$ vehicles, $L = 1000\text{m}$, 5 seeds per density):

| Density ($\text{veh/km}$) | Vehicles | Jam Probability | 95% Wilson Score CI | Mean Speed | Flow $Q$ ($\text{veh/h}$) | Mean Congestion |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **15.0** | 15 | **0%** | $[0.0\%, 43.4\%]$ | $92.8\text{ km/h}$ | 1,392 | 7.0% |
| **20.0** | 20 | **0%** | $[0.0\%, 43.4\%]$ | $77.8\text{ km/h}$ | 1,555 | 5.0% |
| **25.0** | 25 | **0%** | $[0.0\%, 43.4\%]$ | $63.1\text{ km/h}$ | 1,578 | 20.0% |
| **30.0** | 30 | **100%** | $[56.6\%, 100.0\%]$ | $52.8\text{ km/h}$ | 1,585 | 37.0% |
| **35.0** | 35 | **100%** | $[56.6\%, 100.0\%]$ | $45.3\text{ km/h}$ | 1,586 | 47.0% |
| **40.0** | 40 | **100%** | $[56.6\%, 100.0\%]$ | $39.7\text{ km/h}$ | 1,587 | 57.0% |
| **45.0** | 45 | **100%** | $[56.6\%, 100.0\%]$ | $34.0\text{ km/h}$ | 1,531 | 66.0% |

### Key Conclusions:
- **Phase Transition:** The critical density threshold is empirically estimated at **$27.5\text{ veh/km}$**. Below $25\text{ veh/km}$, perturbations reliably dissipate. Above $30\text{ veh/km}$, persistent stop-and-go waves form in 100% of trials.
- **Capacity Collapse:** Peak roadway throughput occurs at $30\text{--}35\text{ veh/km}$ ($Q \approx 1,586\text{ veh/h}$), collapsing to $1,531\text{ veh/h}$ at $45\text{ veh/km}$ as jam duration and speed variance grow.

---

## 🎮 Scenario Presets & Modeling Analysis

Explore parameter configurations directly using the **Scenario Presets** dropdown.

> [!NOTE]
> All presets model **homogeneous IDM fleets** on a closed $1000\text{m}$ ring (every vehicle follows standard single-leader IDM equations with identical parameters). They demonstrate fundamental car-following mechanics rather than heterogeneous traffic, dynamic closed-loop infrastructure, or multi-vehicle communications.

1. **🟢 Stable Baseline ($15\text{ cars}$):** Sparse traffic ($\rho = 15\text{ veh/km}$, headway $66.7\text{m}$) where local decelerations smoothly dissipate.
2. **🔴 Unstable Baseline ($40\text{ cars}$):** Heavy traffic ($\rho = 40\text{ veh/km}$, headway $25.0\text{m}$) where small disturbances amplify into persistent backward stop-and-go waves.
3. **🟡 Reduced Speed Limit Scenario (Static $v_0 = 80\text{ km/h}$, $35\text{ cars}$):**
   - *Physical Insight:* Lowering desired cruising speed reduces the IDM desired headway distance ($s^* = s_0 + v T$), stabilizing string dynamics and dampening stop-and-go waves without altering vehicle count.
   - *Engineering Scope:* This scenario models a uniform static speed reduction, not a dynamic closed-loop Variable Speed Limit (VSL) feedback system.
4. **🤖 Idealized Low Headway ($T = 0.8\text{s}$, $35\text{ cars}$):**
   - *Physical Insight:* Simulates idealized fast-reacting automated longitudinal control by reducing IDM time headway from $1.5\text{s}$ to $0.8\text{s}$, permitting stable traffic at higher velocities ($\approx 99\text{ km/h}$) on the closed ring.
   - *Engineering Scope:* Uses standard single-leader IDM car-following without Vehicle-to-Vehicle (V2V), Cooperative Adaptive Cruise Control (CACC), or multi-vehicle lookahead.
5. **⚡ Aggressive / Tailgating ($30\text{ cars}$, $v_0 = 140\text{ km/h}$, $T = 0.7\text{s}$, $s_0 = 1.0\text{m}$):**
   - *Human Factors Insight:* Reduced safety margins ($s_0 = 1.0\text{m}$) and tight headway combined with high speed lead to sudden, severe deceleration shockwaves upon disturbance.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** $\ge 18.0.0$
- **npm** $\ge 9.0.0$

### Installation
```bash
# Clone repository
git clone https://github.com/ryanlin07/trafficflow-lab.git
cd trafficflow-lab

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to interact with the simulation.

### Running Test Suite
TrafficFlow Lab includes **185 comprehensive unit and integration tests** validating numerical integration, physics invariants, collision avoidance, and statistical estimators:
```bash
npm test
```

### Production Build
```bash
npm run build
```
Generates optimized static bundles in `dist/` with automated vendor chunk splitting (`vendor-react`, `vendor-recharts`, and dedicated Web Worker chunk).

---

## 📜 Invariant & Safety Guarantees

Every step of TrafficFlow Lab enforces strict physical invariants:
- **No-Collision Guarantee:** Net bumper-to-bumper gaps $s \ge 0$ are guaranteed via both IDM deceleration and a secondary post-step gap safety clamp.
- **Speed Bounds:** Vehicle speeds are strictly clamped $v \ge 0$.
- **Periodic Spatial Monotonicity:** Vehicles remain strictly sorted around the circle, accounting for origin crossing at $x = 0 \equiv L$.
- **Timestep Stability:** Semi-implicit Euler integration maintains numerical stability across timesteps $0.01\text{s} \le \Delta t \le 0.1\text{s}$.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
