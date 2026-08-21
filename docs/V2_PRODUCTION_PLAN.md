# V2.0 PRODUCTION PLAN & ARCHITECTURE — THE LAST SIGNAL
**Professional Extended Edition**  
**Lead Game Director, Principal Engineer & Production Orchestrator**  
**Baseline**: 139/139 Tests Passing (100%) | 60 FPS HTML5 Canvas / Web Audio Engine

---

## 1. Executive Vision & Studio Quality Goals

THE LAST SIGNAL v2.0 elevates the game from a tactical survival prototype into a commercial-grade indie horror experience. Every system in v2.0 is designed around **pacing, agency, tension, and organic world feedback**.

### Core Tenets of v2.0
1. **Surveillance as Tactical Risk/Reward**: CCTV system allows scouting corridors, but feed degradation, glitching, and electromagnetic blindness prevent omniscience.
2. **Diegetic Tension Escalation**: Procedural Station PA announcements, 6-tier threat levels, and an adaptive Horror Event Director that orchestrates corridor brownouts, airlock seals, and distant mechanical groans.
3. **Predatory AI with Memory & Deception**: NEXUS-9 feigns withdrawal, investigates hiding alcoves upon elevated suspicion, tracks lead velocities, and bypasses via maintenance grates.
4. **Resilient Production Infrastructure**: Standard Gamepad API polling, schema-validated Checkpoint/Save architecture, and deterministic automated QA test expansion.

---

## 2. Comprehensive Subsystem Health & Gap Analysis

| Domain | Baseline Health | V2.0 Production Enhancements |
| :--- | :--- | :--- |
| **Surveillance (CCTV)** | Absent | **`CCTVUI` & `CCTVTerminal`**: 8-camera tactical feeds with dynamic CRT static, corrupted channel states, scanline telemetry, and NEXUS-9 interference fields. |
| **Audio & Atmosphere** | 100% Procedural Web Audio | **`StationPASystem`**: Formant-synthesized diegetic PA announcements (quarantine warnings, power outages, lockdown alerts) + high-priority radio stinger chimes. |
| **Pacing & Tension** | Linear progression | **`EventDirector` & `ThreatEscalation`**: 6-tier facility threat model (`0: NORMAL` to `5: CRITICAL_FAILURE`) driving dynamic corridor blackouts, steam vent bursts, and false sensor echoes. |
| **Enemy AI (NEXUS-9)** | FSM + Predictive Chase | **Predatory Search & Stalking**: Suspicion accumulation, false withdrawal / double-back tactics, locker scent tracking, and environmental hazard awareness. |
| **Input & Gamepad** | Keyboard / Mouse / Touch | **Full Gamepad API Integration**: Dual-analog stick navigation, tactile shoulder button triggers, d-pad tactical inventory shortcuts. |
| **State Persistence** | Transient in-memory | **`SaveSystem`**: Checkpoint auto-saving, cryptographic schema validation, local storage persistence, and objective/vitals state restoration. |
| **Automated QA** | 139 Unit/Integration tests | **Expanded Test Matrix**: Comprehensive test suites for CCTV, PA system, Event Director, Threat Escalation, Save System, and Gamepad abstractions. |

---

## 3. V2.0 Implementation Roadmap & Dependency Graph

```
+-----------------------------------------------------------------------------------+
| SPRINT 1: ARCHITECTURAL FOUNDATION & DATA SCHEMAS                                  |
| - Constants: Threat levels, CCTV channels, PA prompts, Save schemas               |
| - SaveSystem: LocalStorage serialization & schema validation                      |
| - InputManager: Gamepad API polling & button mapping                              |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| SPRINT 2: SURVEILLANCE & AUDIO DIRECTOR SYSTEMS                                    |
| - CCTVUI: Multi-channel security terminal & CRT feeds with camera switching       |
| - StationPASystem: Procedural phonetic voice synthesizer & chime stinger          |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| SPRINT 3: PACING, THREAT ESCALATION & PREDATORY AI PASS                            |
| - ThreatSystem: 6-tier facility escalation (0 to 5) linked to GameState           |
| - EventDirector: Dynamic environmental director (blackouts, steam, door locks)    |
| - EnemyAI: Stalking pass, false withdrawal, locker searching, hazard avoidance    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| SPRINT 4: INTEGRATION, POLISH & REGRESSION QA                                      |
| - Engine & HUD: CCTV trigger bindings, Save/Load integration, PA triggers        |
| - Automated Testing: New test suites in tests/ for all V2.0 systems               |
| - Browser Playtesting: Chrome DevTools verification, zero console errors          |
+-----------------------------------------------------------------------------------+
```
