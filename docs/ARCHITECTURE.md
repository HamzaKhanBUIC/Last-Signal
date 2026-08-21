# THE LAST SIGNAL — TECHNICAL ARCHITECTURE

## 1. Directory Structure
```
Last-Signal/
├── assets/                  # Embedded data/icons/procedural presets
├── docs/                    # Architecture, design, bugs, taskboard, logs
│   ├── GAME_DESIGN.md
│   ├── ARCHITECTURE.md
│   ├── TASK_BOARD.md
│   ├── BUGS.md
│   └── AGENT_LOG.md
├── src/
│   ├── core/                # Core engine loops, input, event bus, game state
│   │   ├── Engine.js        # Main game loop, delta time, fixed step update
│   │   ├── InputManager.js  # Keyboard & mouse tracking, key rebinding, gamepad ready
│   │   ├── EventBus.js      # Decoupled publish/subscribe messaging
│   │   ├── GameState.js     # State machine: TITLE, INTRO, PLAYING, PAUSED, TERMINAL, GAMEOVER, VICTORY
│   │   └── Camera.js        # Smooth lerping 2D camera with screen-shake & zoom
│   ├── entities/            # Entity Component / OOP structures
│   │   ├── Entity.js        # Base entity with transform, collision box, active state
│   │   ├── Player.js        # Player controller, stamina, health, battery, noise emitter
│   │   ├── EnemyAI.js       # NEXUS-9 entity with A* navigation, perception cone, states
│   │   ├── Interactable.js  # Doors, Terminals, Fragments, Batteries, Medkits, Keycards
│   │   └── Particle.js      # Particle emitter for dust, sparks, glitch particles, blood
│   ├── world/               # World, map data, collision & raycasting
│   │   ├── MapData.js       # 2D Grid tilemap layout, rooms, walls, doors, spawn points
│   │   ├── LevelManager.js  # Tilemap loader, collision queries, room detection, fog of war
│   │   └── Pathfinding.js   # High-performance Grid A* algorithm with diagonal smoothing
│   ├── rendering/           # Graphics, Canvas 2D & Post-processing
│   │   ├── Renderer.js      # Main compositor: World -> Entities -> Lighting -> Particles -> PostFX
│   │   ├── LightingSystem.js# Dynamic 2D raycasting shadows, flashlight cone, ambient darkness
│   │   ├── SpriteGenerator.js# Procedural pixel-art sprite baker (Player, NEXUS-9, Tiles, Items)
│   │   └── PostProcessing.js# CRT scanlines, chromatic aberration, glitch shaders, vignette
│   ├── audio/               # Web Audio API Sound Engine
│   │   ├── SoundEngine.js   # Procedural sound synthesizer (ambient drone, footsteps, heartbeat, stingers)
│   │   └── AudioSynthesizer.js # Frequency modulated oscillators, noise buffers, spatial panning
│   ├── ui/                  # HUD, menus, terminal minigames, modals
│   │   ├── HUD.js           # Canvas & DOM HUD: health, battery, stamina, radar, fragment counter
│   │   ├── TerminalUI.js    # Interactive retro green/amber CRT terminal with minigames & lore
│   │   ├── MenuManager.js   # Start screen, Pause menu, Audio controls, Death/Win screens
│   │   └── DecryptionMinigame.js # Waveform / frequency alignment minigame for signal fragments
│   ├── utils/               # Math, geometry, timer, constants
│   │   ├── MathUtils.js     # Raycasting intersection, distance, lerp, clamp, angle helpers
│   │   └── Constants.js     # Physics, dimensions, color palettes, audio presets
│   └── main.js              # Application entry point, bootstrapping all subsystems
├── tests/                   # Automated unit & integration tests
│   ├── test-runner.js       # Standalone Node.js test runner
│   ├── math.test.js         # Math, geometry & raycast unit tests
│   ├── pathfinding.test.js  # A* pathfinding & obstacle avoidance tests
│   ├── game-state.test.js   # Inventory, fragment collection, win/loss state transition tests
│   └── ai-behavior.test.js  # Enemy perception, chase state, and damage tests
├── index.html               # Main HTML entry point with responsive styling & CRT canvas
├── style.css                # Polished retro-futuristic sci-fi UI styling
└── package.json             # Dev scripts and metadata
```

## 2. Subsystem Interaction & Event Flow
- **Engine Loop**: Fixed-tick 60Hz physics/AI simulation + decoupled render interpolation.
- **Event-Driven Communication**:
  - `PLAYER_MOVED`: Emits noise event with radius; `EnemyAI` registers acoustic stimulus.
  - `FLASHLIGHT_TOGGLED`: Adjusts `LightingSystem` visibility polygon and `EnemyAI` visual detection.
  - `FRAGMENT_COLLECTED`: Updates `GameState` objective counter, unlocks Comms Array stage, spawns lore stinger.
  - `ENTITY_PROXIMITY`: Triggers `PostProcessing` glitch aberration and `SoundEngine` heartbeat crescendo.
  - `INTERACTION_TRIGGERED`: Opens `TerminalUI` or toggles doors.

## 3. Rendering Pipeline
1. **Layer 0 (Background / Floor)**: Render floor tiles, grates, blood/oil decals.
2. **Layer 1 (Interactables & Props)**: Render doors, terminals, power conduits, signal fragments.
3. **Layer 2 (Entities)**: Render Player sprite, NEXUS-9 pulsating form, particles.
4. **Layer 3 (Dynamic Lighting & Shadow Mask)**: Raycast 2D visibility polygon from flashlight & station emergency lights onto an offscreen canvas; multiply blend mode over layers 0-2.
5. **Layer 4 (Walls & Roofs)**: High walls cast occlusion shadows onto floor layer.
6. **Layer 5 (Particles & Atmospheric Fog)**: Emits drifting dust motes, smoke, sparks.
7. **Layer 6 (Post-Processing & HUD)**: CRT scanlines, curvature, chromatic glitch, HUD text vitals.

## 4. Procedural Audio Architecture (Zero External Assets)
- Built entirely on native `AudioContext` with zero network latency.
- Dynamic Sub-Bass Drone: 55Hz detuned saw wave with resonant low-pass filter.
- Dynamic Heartbeat: Low-frequency sine sweep modulating tempo based on distance to NEXUS-9.
- Signal Geiger Counter: Filtered white noise pulses that increase in frequency when near a Signal Fragment.
- Sci-Fi Alarms & Screeches: Frequency-modulated oscillators with exponential decay.
- Footsteps & Door Servos: Bandpassed noise bursts and mechanical frequency sweeps.
