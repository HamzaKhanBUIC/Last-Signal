# CHANGELOG — THE LAST SIGNAL

## [2.0.0] - 2026-08-21 (Professional Extended Edition)

### Added
- **Multi-Channel Security CCTV Surveillance System (`src/ui/CCTVUI.js`)**:
  - 8-camera tactical feeds (`CAM-01` to `CAM-08`) covering all major station sectors.
  - Interactive camera selector with keyboard (`[A]/[D]`, `[1-8]`) and mouse navigation.
  - Real-time CRT scanlines, timestamp telemetry, and live recording badges.
  - Dynamic electromagnetic interference and corrupted feeds when NEXUS-9 is in the camera's sector.
- **Procedural Station PA & Quarantine Announcement System (`src/audio/StationPASystem.js`)**:
  - Synthesizes two-tone radio chime stingers and formant-modulated speech audio bursts in Web Audio API with zero external audio assets.
  - Contextual broadcasts triggered on containment breaches, grid instability, reactor online, threat escalation, and facility purge countdowns.
- **Dynamic Horror Event Director (`src/core/EventDirector.js`)**:
  - Adaptive 6-tier horror pacing state machine (`CALM`, `UNEASE`, `SUSPICION`, `THREAT`, `CHASE`, `RECOVERY`).
  - Dynamic environmental horror events: corridor lighting brownouts, distant structural hull impacts, cryogenic steam releases, and false acoustic echoes.
- **Facility Threat & Containment Escalation Model (`src/core/ThreatSystem.js`)**:
  - 6-tier progression (`LEVEL_0_NORMAL` to `LEVEL_5_CRITICAL_FAILURE`) modulating station alert status, PA broadcasts, lighting flicker frequency, and AI pursuit aggression.
- **Predator AI V2.0 Enhancements (`src/entities/EnemyAI.js`)**:
  - Predictive velocity lead intercept targeting during `CHASE`.
  - Tactical double-back 180° sweep scanning during `SEARCH` to intercept operators exiting lockers.
  - EMP shockwave stun recovery cycle (`stun(4.5)`).
- **Save / Checkpoint State Persistence (`src/core/SaveSystem.js`)**:
  - Schema-validated checkpoint serialization with 32-bit checksum verification.
  - LocalStorage caching and in-memory test harness fallbacks.
- **HTML5 Gamepad API Integration (`src/core/InputManager.js`)**:
  - Standard Gamepad API polling, deadzone filtering, and seamless analog stick vector normalization.
- **Master Automated QA Expansion**:
  - Added `tests/v2-systems.test.js` and `tests/ai-predator-pass.test.js`.
  - Total test count expanded to **149 automated tests with 100% pass rate**.

---

## [1.1.0] - 2026-08-21 (Tactical Gameplay Overhaul)

### Added
- Tactical Hiding Spot Lockers (`HidingSpot`, `[E]` interact).
- Sonic Decoy acoustic distractor flares (`SonicDecoy`, `[3]` hotkey).
- EMP Shockwave Burst defense countermeasure (`[4]` hotkey).
- Environmental Hazards: High-voltage electrical arcing cables & cryogenic freeze steam vents.
- Tactical Station PDA Map overlay (`[M]` / `[Tab]`).
- 4-Slot Tactical HUD Quick-Inventory Hotbar.

---

## [1.0.0] - 2026-08-21 (Initial Baseline Release)

### Added
- Core fixed-timestep engine, 64x64 multi-sector map, A* pathfinding.
- Player controller with walking/sprinting/crouching stances.
- NEXUS-9 Rogue AI with LOS vision cone, hearing, and melee attacks.
- Dynamic 2D raycast lighting and shadow mask compositing.
- 100% procedural Web Audio synthesizer and sound engine.
- Retro CRT post-processing shaders.
- Terminals, door overrides, 4-breaker reactor puzzle, and oscilloscope signal decryption minigame.
- Headless gameplay simulation test suite (134 tests).
