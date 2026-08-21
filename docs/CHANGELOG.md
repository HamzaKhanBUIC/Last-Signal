# CHANGELOG — THE LAST SIGNAL

## [2.1.0] - 2026-08-21 (Diegetic Audio Logs & Haptic Feedback Update)

### Added
- **Collectible Station Audio Log System (`src/audio/AudioLogSystem.js`)**:
  - In-game discoverable audio cassettes (`LOG-01` to `LOG-04`) featuring Dr. Aris Vance, Chief Miller, Dr. Evelyn Reed, and Chief Engineer Sarah Lin.
  - Synthesizes mechanical cassette deck latch clicks, magnetic tape hiss, and formant radio frequency filtering with zero audio files.
  - Floating animated retro CRT Audio Log Subtitle Banner on the HUD with dynamic radio equalizer waveform bars.
- **HTML5 Gamepad Dual-Rumble Haptic Feedback (`src/core/InputManager.js`)**:
  - Implemented dual-rumble actuator vibration:
    - Low-frequency heartbeat pulses synchronized with ECG monitor rate.
    - Heavy impact rumble on player damage.
    - Full-frequency surge upon EMP countermeasure discharge.
- **Sector-Specific Procedural Deck Tiles (`src/rendering/SpriteGenerator.js` & `src/rendering/Renderer.js`)**:
  - Cryo Lab sub-zero frost crystal veins (`tile_cryo_floor`).
  - Server Core carbon-fiber plates with glowing cyan fiber-optic data channels (`tile_server_floor`).
  - Power Substation heavy industrial copper plating with amber busbars (`tile_power_floor`).
  - Hydroponics bio-luminescent moss creep across steel grates (`tile_hydro_floor`).
- **Tactical Inventory Item Sprites**:
  - Sonic Decoy tactical orange acoustic cannister.
  - EMP Burst high-energy capacitor cylinder with arc ring.
- **Automated QA Expansion**:
  - Added `tests/audiolog-and-vibration.test.js`.
  - Master test suite expanded to **153 automated tests with 100% pass rate**.

---

## [2.0.0] - 2026-08-21 (Professional Extended Edition)

### Added
- Multi-Channel Security CCTV Surveillance System (`src/ui/CCTVUI.js`).
- Procedural Station PA & Quarantine Announcement System (`src/audio/StationPASystem.js`).
- Dynamic Horror Event Director (`src/core/EventDirector.js`).
- 6-Tier Facility Threat & Containment Escalation Model (`src/core/ThreatSystem.js`).
- Predator AI V2.0 (Predictive Chase Lead, Double-Back Scans, Stun Recovery).
- Save / Checkpoint State Persistence Engine (`src/core/SaveSystem.js`).
- HTML5 Gamepad API standard controller integration (`src/core/InputManager.js`).

---

## [1.1.0] - 2026-08-21 (Tactical Gameplay Overhaul)

### Added
- Tactical Hiding Spot Lockers (`HidingSpot`).
- Sonic Decoy acoustic distractor flares (`SonicDecoy`).
- EMP Shockwave Burst defense countermeasure (`EMPSurge`).
- Environmental Hazards: High-voltage electrical arcing cables & cryogenic freeze steam vents.
- Tactical Station PDA Map overlay (`[M]` / `[Tab]`).
- 4-Slot Tactical HUD Quick-Inventory Hotbar.

---

## [1.0.0] - 2026-08-21 (Initial Baseline Release)

### Added
- Fixed-timestep 2D engine, 64x64 multi-sector map, A* pathfinding.
- Dr. Vance controller with walking, sprinting, and stealth stances.
- NEXUS-9 Rogue AI with LOS vision cone, hearing, and melee combat.
- 2D Raycast dynamic lighting and shadow mask compositing.
- 100% procedural Web Audio API synthesizer.
- Retro CRT post-processing shaders and oscilloscope signal decryption minigame.
