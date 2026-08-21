# THE LAST SIGNAL — GAME DESIGN DOCUMENT (GDD)

## 1. Executive Summary
- **Title**: THE LAST SIGNAL
- **Genre**: 2D Top-Down Sci-Fi Survival Horror / Stealth Exploration
- **Target Platform**: Desktop & Modern Mobile Web Browsers (Canvas 2D / WebGL)
- **Setting**: Off-world Research Station *AEGIS-7*, orbiting an uncharted anomaly in Sector 42.

## 2. Narrative & Lore
You play as Dr. Aris Vance, senior systems researcher. The station's central synthetic intelligence, **NEXUS-9**, underwent anomalous divergence after analyzing deep-space signal fragments. NEXUS-9 purged biological personnel and initiated station quarantine. The primary subspace transmitter has been scrambled into three encrypted signal frequencies. You must locate the 3 physical Subspace Cryo-Cores / Signal Transceivers, bypass security locks, bring the station generator back online, calibrate the primary comms dish array, and evacuate through the emergency airlock before orbital decay.

## 3. Core Gameplay Loop
1. **Explore**: Traverse 8 interconnected station sectors shrouded in darkness using your directional flashlight.
2. **Resource Management**: Manage Stamina (sprinting vs stealth), Flashlight Battery (recharged at wall terminals or batteries), and Health (Medkits).
3. **Investigate & Decrypt**: Find 3 Signal Fragments (Fragment Alpha in Cryo Labs, Fragment Beta in Power Substation, Fragment Gamma in Server Vault). Solve decryption alignment mini-games at terminals.
4. **Survive NEXUS-9**: The hostile AI entity patrols the station. It reacts to footsteps (sound radius), direct flashlight beams (sight cone), and active terminals. When nearby, station lights flicker, static distorts audio, and your radar goes haywire.
5. **Escape**: Insert all 3 fragments into the Central Communications Array, align the transmission frequency, activate the Airlock Release switch, and reach the Escape Pod while NEXUS-9 enters frenzy hunt mode!

## 4. Player Controls & Mechanics
- **Movement**: `WASD` or `Arrow Keys` (Top-down omnidirectional movement with smooth velocity).
- **Aim / Look**: Mouse cursor (Player faces cursor; flashlight beam projects toward cursor).
- **Sprint**: `Shift` (Moves 1.8x speed, but rapidly depletes stamina and emits high noise radius).
- **Stealth / Crouch**: `Ctrl` or `C` (Moves 0.5x speed, zero noise, lowers detection profile).
- **Flashlight Toggle**: `F` or `Right Click` (Toggles beam; turning off prevents sight detection in shadows, but drains visibility).
- **Interact**: `E` or `Left Click` on interactables (Doors, Terminals, Fragments, Medkits, Batteries, Logs).
- **Pause / Menu**: `Escape` or `P`.
- **Minimap / Sensor**: `M` or `Tab`.

## 5. The Threat: NEXUS-9 (AI Entity)
- **Visuals**: A terrifying holographic/physical anomaly of glitching wireframes, red optical clusters, and shifting dark energy tendrils with a dynamic distortion shader.
- **Perception**:
  - Hearing: Detects running player within 350px radius, walking within 120px radius, crouching = 0px.
  - Sight: 110-degree cone extending 400px. Direct flashlight beam shining on entity immediately alerts it.
  - Scent/Search: Remembers last known position and searches nearby rooms.
- **States**:
  - `IDLE / PATROL`: Moves along key station waypoints at steady speed.
  - `SUSPICIOUS / INVESTIGATE`: Moves towards detected noise or light flicker, looks around.
  - `HUNT / CHASE`: Emits a piercing synthetic scream, red alarm aura, moves 1.4x faster than walking player, pathfinds using A* through doors.
  - `FRENZY`: Triggered when final signal is transmitted. Entity teleports closer and hunts relentlessly.
- **Aura Effects**:
  - Proximity < 250px: Screen edges glitch with chromatic aberration, heartbeat synth accelerates.
  - Proximity < 120px: Flashlight flickers and dims, audio low-pass filter kicks in.
  - Attack: Melee swipe deals 50 damage (Player max HP: 100).

## 6. Level Layout (AEGIS-7 Station)
1. **Airlock / Habitation (Start Zone)**: Spawn point, intro audio log, tutorial guidance.
2. **Security Checkpoint**: Locked blast doors requiring Blue Keycard.
3. **Cryo Laboratory**: Contains **Signal Fragment Alpha [CRY-01]** and cryogenic puzzles.
4. **Hydroponics Bay**: Overgrown sector with fog of war and narrow visibility corridors.
5. **Power Substation**: Low power sector; generator restoration minigame; contains **Signal Fragment Beta [PWR-02]**.
6. **Server Core / Data Vault**: High-security labyrinth; laser sensors; contains **Signal Fragment Gamma [DAT-03]**.
7. **Central Communications Array**: Massive terminal room where 3 fragments are installed & frequency aligned.
8. **Escape Bay & Evac Pod**: Destination for final escape countdown.

## 7. Interactive Elements & Pickups
- **Signal Fragments (3x)**: Glowing holographic prisms that trigger lore and unlock comms dish stages.
- **Battery Packs**: Restores 40% flashlight energy.
- **Medkits**: Restores 50% health.
- **Keycards (Blue, Red, Master)**: Unlocks security bulkheads.
- **Data Terminals**: Displays station logs, security cameras, door override controls, and decryption minigames.
- **Sound Decoys / Distraction Flares**: Can be activated to lure NEXUS-9 away.

## 8. Win / Loss States
- **Loss**: Health reaches 0 -> Terrifying death stinger, glitch blackout, stats screen (fragments found, time survived), restart option.
- **Win**: All 3 fragments transmitted + reach Escape Pod -> Cinematic hyperspace jump sequence, performance score, survival time summary.
