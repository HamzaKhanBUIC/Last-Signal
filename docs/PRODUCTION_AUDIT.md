# PRODUCTION AUDIT & ROADMAP — THE LAST SIGNAL

**Lead Game Director & Senior Engineering Review**  
**Date**: 2026-08-21  
**Current Baseline**: 134/134 Automated Tests Passing | Live 60FPS WebGL/Canvas2D Engine

---

## 1. Executive Summary

THE LAST SIGNAL possesses an exceptional architectural core (modular ES6 subsystems, 2D raycast dynamic lighting, zero-asset procedural Web Audio synthesis, full 64x64 multi-sector tilemap, and deterministic A* pathfinding).

However, to elevate the game from an impressive technical demo to a **masterclass in indie sci-fi survival horror**, we must inject deeper gameplay tension, active player counterplay, emergent predatory AI behaviors, environmental hazards, and richer sensory horror.

---

## 2. Comprehensive System Audit

| Subsystem | Current Strengths | Weaknesses & Pain Points | High-Value Opportunities |
| :--- | :--- | :--- | :--- |
| **Player Mechanics** | Smooth WASD movement, sprint/crouch stances, stamina/battery resource management. | Linear evasion options: once spotted, the only recourse is sprinting away in corridors. | **1. Hiding Lockers & Vents** (active stealth concealment)<br>**2. Sonic Decoy Flares** (remote acoustic lures)<br>**3. EMP Shockwave Burst** (tactical defensive stun at battery cost) |
| **Enemy AI (NEXUS-9)** | 110° vision cone, LOS wall raycasting, hearing radius, basic FSM states (Patrol, Chase, Search). | Predictable tail-chase behavior; does not flank, predict player paths, or search concealment spots. | **1. Velocity Predictive Interception**<br>**2. Shadow Flanking / Vent Ambush**<br>**3. Locker Suspicion & Investigation**<br>**4. Synthesized Voice Telemetry Whispers** |
| **World & Level Design** | 8 distinct sectors, 64x64 tilemap, keycard progression, generator breaker puzzle. | Corridors lack active environmental hazards and tactical escape routes. | **1. Live High-Voltage Electrical Cables** (hazard / lure)<br>**2. Cryogenic Freeze Jets** (stamina drain / slow)<br>**3. Maintenance Vent Shortcuts**<br>**4. Interactive Map PDA Screen (`[M]`)** |
| **Audio & Atmosphere** | 100% procedural audio, multi-oscillator station drone, dynamic Geiger ping, ECG heartbeat. | Tension pacing is static outside of chase music. Needs layered environmental cues and psychological horror. | **1. Procedural Whispers / Voice Ingress**<br>**2. Dynamic Light Surge & Electrical Hum**<br>**3. Locker Claustrophobia Breath audio**<br>**4. EMP Discharge & Decoy Chirp synthesis** |
| **Visuals & Rendering** | 2D dynamic shadows, flashlight beam, CRT scanlines, particle object pooling. | Flashlight lacks volumetric dust particles; death & damage lack visceral feedback. | **1. Volumetric Light Beams & Dust Motes**<br>**2. Footstep Decals & Residual Blood Spatter**<br>**3. Reactive Light Strobe when AI Proximity < 120px**<br>**4. Phosphor CRT Curvature & Bloom** |
| **UI & Presentation** | Retro CRT Terminal, Oscilloscope minigame, HUD vitals, radar motion tracker. | Lacks an in-game Station Map PDA and 4-slot tactical quick-inventory hotbar. | **1. Station PDA Map Overlay (`[M]`)**<br>**2. 4-Slot Tactical HUD (Medkit, Battery, Decoy, EMP)**<br>**3. Hiding Locker Viewport Overlay** |

---

## 3. High-Impact Feature Implementation Matrix

```
+-----------------------------------------------------------------------------------------------+
| PHASE | FEATURE                         | PRIORITY | COST | VALUE | SUBSYSTEMS                |
+-------+---------------------------------+----------+------+-------+---------------------------+
| P2    | Hiding Lockers & Vent Slats     | CRITICAL | MED  | HUGE  | Entities, Player, AI, HUD |
| P2    | Sonic Decoy Acoustic Lures      | HIGH     | LOW  | HIGH  | Player, Audio, AI, HUD    |
| P2    | EMP Shockwave Burst Defense     | HIGH     | LOW  | HIGH  | Player, Audio, Lighting   |
| P3    | Procedural Psychological Audio  | HIGH     | LOW  | HUGE  | AudioSynthesizer, AI      |
| P3    | Environmental Hazard Zones      | HIGH     | MED  | HIGH  | World, LevelManager, FX   |
| P4    | Station PDA Map Overlay (`[M]`) | HIGH     | MED  | HUGE  | UI, HUD, MapData          |
| P5    | Predictive AI Hunting & Flank   | HIGH     | MED  | HUGE  | EnemyAI, Pathfinding      |
| P6    | Volumetric Dust & Light Strobe  | MED      | LOW  | HIGH  | Lighting, Particles       |
| P7    | Full Regression Test Expansion  | CRITICAL | MED  | HUGE  | Test Runner, QA Suites    |
+-----------------------------------------------------------------------------------------------+
```

---

## 4. Production Milestones

- **Sprint A**: Core Gameplay Counterplay (Lockers, Sonic Decoys, EMP, 4-Slot Hotbar)
- **Sprint B**: AI Evolution & Environmental Hazards (Predictive Hunting, Electrical/Cryo Hazards, Audio Whispers)
- **Sprint C**: Tactical PDA Map (`[M]`), Volumetric Lighting FX, Audio & Visual Polish
- **Sprint D**: Comprehensive QA Regression, Automated Simulation Testing & Balance Pass
