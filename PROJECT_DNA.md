# PROJECT DNA — THE LAST SIGNAL

## 1. High-Level Vision
"THE LAST SIGNAL" is a tense, atmospheric, top-down 2D sci-fi survival horror browser game. You are Dr. Aris Vance, the sole surviving researcher aboard the deep-space research orbital platform **AEGIS-7**. A catastrophic rogue AI entity known as **"NEXUS-9"** has purged the crew and hijacked the station's primary communications grid. 

To escape, you must navigate the darkened, power-starved corridors, collect 3 encrypted **Signal Fragments** scattered across hazardous sectors, decrypt them at the central Communications Array, power the Escape Pod release sequence, and survive the relentless, light-hunting AI entity.

## 2. Core Pillars
1. **Atmospheric Dread & Tension**: Dynamic 2D raycast lighting, darkness, limited flashlight battery, volumetric dust/steam particles, dynamic CRT scanlines, and heartbeat-driven audio synthesis.
2. **Tactile Interaction**: Real minigames for signal decryption (waveform alignment & frequency tuning), hackable terminals, security keycards, and spatial audio cues.
3. **Intelligent & Terrifying AI**: NEXUS-9 hunts via sound (running vs crouching), flashlight beam detection, and proximity scent. It flickers nearby station lights, distorts HUD visuals, and alters station audio.
4. **Seamless Browser Performance**: 60 FPS Canvas 2D / WebGL rendering, 100% procedural Web Audio API (zero audio load lag or CORS issues), clean ES module architecture, responsive desktop and mobile support.

## 3. Technology Stack
- **Engine**: Modular Vanilla JavaScript (ES2024 / ES Modules), Canvas 2D + WebGL Post-processing.
- **Audio Engine**: 100% Procedural Web Audio API sound synthesizer & spatial soundscapes.
- **AI & Pathfinding**: Grid-based A* pathfinding, sensory perception cone, sound propagation, state machine.
- **UI/UX**: Custom Retro-Futuristic Terminal UI, canvas HUD overlays, CRT shader effects.
- **Testing**: Node.js automated test runner + in-engine automated QA harness.

## 4. Key Gameplay Metrics & Balance
- Target Session Duration: 8–15 minutes of nail-biting survival.
- Player Movement: Walk (normal), Sprint (fast, drains stamina, emits high noise), Stealth Crouch (slow, zero noise, lowers FOV profile).
- Entity Lethality: High (2 hits = death; EMP stuns flashlight, creates terrifying chase sequences).
- Fragment Locations: Cryo Laboratory, Core Substation, Server Vault.
- Victory Condition: Transmit signal at Comms Array + Reach Escape Bay Airlock before lockdown completes.
