/**
 * THE LAST SIGNAL — COMPREHENSIVE GAMEPLAY SIMULATION TEST SUITE
 * 
 * End-to-end headless simulation of the complete game playthrough and survival mechanics:
 * 
 * 1. Full Game Playthrough (Habitation Spawn -> Escape Pod Victory):
 *    - Subsystem initialization (Engine, Player, EnemyAI, LevelManager, GameState, Interactables, Particles, SoundEngine)
 *    - Starting new game in PLAYING state
 *    - Exploration & Movement from Habitation (Sector 1) to Security Hub (Sector 2)
 *    - Collecting Blue Keycard and unlocking Blue Blast Doors
 *    - Navigating Cryo Labs (Sector 3) and extracting Signal Fragment Alpha [CRY-01]
 *    - Navigating Hydroponics (Sector 4) to Power Substation (Sector 5)
 *    - Collecting Red Keycard and rebooting Reactor Breakers at terminal TERM-PWR-01
 *    - Extracting Signal Fragment Beta [PWR-02]
 *    - Navigating Server Core (Sector 6), collecting Master Keycard & Signal Fragment Gamma [DAT-03]
 *    - Navigating Central Comms Array (Sector 7), opening terminal TERM-COMMS-01
 *    - Executing DecryptionMinigame for all 3 Signal Fragments (Alpha, Beta, Gamma)
 *    - Transmitting Subspace Broadcast, unlocking Escape Bay and triggering NEXUS-9 Frenzy mode
 *    - Navigating Emergency Escape Bay (Sector 8), launching Escape Pod at TERM-ESC-01
 *    - Verifying VICTORY state transition, statistics, and objective completions
 * 
 * 2. Failure & Survival Edge Cases:
 *    - NEXUS-9 acoustic tracking when player sprints vs silent crouching
 *    - Damage taking, invulnerability frames, knockback, and GAMEOVER state transition on 0 HP
 *    - Flashlight battery consumption over time, auto-off upon depletion, and recharge lockout
 *    - Stamina exhaustion cycle: rapid sprint drain, exhaustion lockout, and hysteresis threshold recovery
 */

import { Engine } from '../src/core/Engine.js';
import { GameState } from '../src/core/GameState.js';
import { EventBus } from '../src/core/EventBus.js';
import { Camera } from '../src/core/Camera.js';
import { InputManager } from '../src/core/InputManager.js';
import { Player, PLAYER_STANCES } from '../src/entities/Player.js';
import { EnemyAI } from '../src/entities/EnemyAI.js';
import {
  Interactable,
  Door,
  SignalFragment,
  Keycard,
  Terminal,
  BatteryPack,
  Medkit,
  createInteractablesFromMap
} from '../src/entities/Interactable.js';
import { ParticleSystem } from '../src/entities/Particle.js';
import { SoundEngine } from '../src/audio/SoundEngine.js';
import { LevelManager } from '../src/world/LevelManager.js';
import { Pathfinding } from '../src/world/Pathfinding.js';
import { DecryptionMinigame } from '../src/ui/DecryptionMinigame.js';
import { TerminalUI } from '../src/ui/TerminalUI.js';
import { HUD } from '../src/ui/HUD.js';
import { MenuManager } from '../src/ui/MenuManager.js';
import { Renderer } from '../src/rendering/Renderer.js';
import { LightingSystem } from '../src/rendering/LightingSystem.js';
import { SpriteGenerator } from '../src/rendering/SpriteGenerator.js';
import { createOffscreenCanvas } from '../src/rendering/CanvasUtils.js';
import {
  GAME_STATES,
  AI_STATES,
  ITEM_TYPES,
  SECURITY_LEVELS,
  KEYCARD_TYPES,
  FRAGMENT_TYPES,
  TILE_TYPES,
  TILE_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HEALTH_MAX,
  STAMINA_MAX,
  BATTERY_MAX,
  EVENTS
} from '../src/utils/Constants.js';
import { distance } from '../src/utils/MathUtils.js';

export function runGameplaySimulationTests(describe, test, expect) {
  // =========================================================================
  // SUITE 1: END-TO-END GAMEPLAY PLAYTHROUGH SIMULATION
  // =========================================================================
  describe('Gameplay Simulation — Full Playthrough (Spawn to Victory)', () => {
    // Shared simulation ecosystem across progressive playthrough steps
    let eventBus;
    let gameState;
    let level;
    let pathfinding;
    let player;
    let enemy;
    let interactables;
    let particles;
    let soundEngine;
    let decryptionMinigame;
    let terminalUI;
    let hud;
    let engine;

    test('Step 1: Subsystems Initialization & Game Session Boot in Habitation Spawn', () => {
      // 1. Initialize core event and world systems
      eventBus = new EventBus();
      gameState = new GameState(eventBus);
      level = new LevelManager();
      pathfinding = new Pathfinding(level);
      soundEngine = new SoundEngine();
      particles = new ParticleSystem(400);

      // 2. Initialize interactive entities
      const spawn = level.getPlayerSpawn();
      const enemySpawn = level.getEnemySpawn();

      player = new Player({
        x: spawn.x,
        y: spawn.y,
        eventBus,
        gameState
      });

      enemy = new EnemyAI({
        x: enemySpawn.x,
        y: enemySpawn.y,
        eventBus,
        waypoints: level.getEnemyWaypoints()
      });

      interactables = createInteractablesFromMap(level);

      // 3. Initialize UI & Minigame modules
      decryptionMinigame = new DecryptionMinigame({ audio: soundEngine, eventBus });
      terminalUI = new TerminalUI({
        audio: soundEngine,
        eventBus,
        gameState,
        decryptionMinigame
      });
      hud = new HUD(eventBus);

      // 4. Initialize Engine Core with offscreen mock canvas
      const canvas = createOffscreenCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      engine = new Engine(canvas);

      // Replace engine subsystems with shared instances
      engine.eventBus = eventBus;
      engine.gameState = gameState;
      engine.level = level;
      engine.pathfinding = pathfinding;
      engine.audio = soundEngine;

      engine.init({
        HUD: hud,
        TerminalUI: terminalUI,
        DecryptionMinigame: decryptionMinigame
      });

      // Start new game session
      engine.startNewGame({
        player,
        enemy,
        interactables,
        particles
      });

      // Verify Initial State
      expect(gameState.getState()).toBe(GAME_STATES.PLAYING);
      expect(player.health).toBe(HEALTH_MAX);
      expect(player.isFlashlightOn).toBe(true);
      expect(gameState.flashlightBattery).toBe(BATTERY_MAX);
      expect(gameState.stamina).toBe(STAMINA_MAX);
      expect(gameState.getFragmentCount()).toBe(0);
      expect(gameState.getDecryptedFragmentCount()).toBe(0);
      expect(gameState.generatorOnline).toBe(false);
      expect(gameState.commsRepaired).toBe(false);
      expect(gameState.escapeUnlocked).toBe(false);

      // Verify Entity placement
      expect(player.x).toBe(spawn.x);
      expect(player.y).toBe(spawn.y);
      expect(enemy.state).toBe(AI_STATES.PATROL);
      expect(interactables.length).toBeGreaterThan(20);

      // Verify initial objective
      expect(gameState.currentObjective).toContain('Fragment Alpha');
    });

    test('Step 2: Collect Blue Keycard & Unlock Cryo Blast Door', () => {
      // Find Blue Keycard in Security Sector (tileX: 26, tileY: 7 -> 848, 240)
      const blueKeycard = interactables.find(
        i => i instanceof Keycard && (i.level === KEYCARD_TYPES.BLUE || i.level === 'blue')
      );
      expect(blueKeycard).toBeTruthy();
      expect(blueKeycard.collected).toBe(false);

      // Simulate player moving to Blue Keycard location
      player.x = blueKeycard.x;
      player.y = blueKeycard.y;

      // Collect keycard
      const closest = player.findClosestInteractable(interactables);
      expect(closest).toBe(blueKeycard);

      const collected = player.triggerInteraction();
      expect(collected).toBe(true);
      expect(blueKeycard.collected).toBe(true);
      expect(blueKeycard.active).toBe(false);
      expect(gameState.hasKeycard(SECURITY_LEVELS.BLUE)).toBe(true);

      // Locate Blue Blast Door at boundary between Security and Cryo (tileX: 45, tileY: 15)
      const blueDoor = interactables.find(
        i => i instanceof Door && i.tileX === 45 && i.tileY === 15
      );
      expect(blueDoor).toBeTruthy();
      expect(blueDoor.securityLevel).toBe(SECURITY_LEVELS.BLUE);
      expect(blueDoor.isOpen).toBe(false);

      // Move player to door and unlock it using Blue Keycard clearance
      player.x = blueDoor.x;
      player.y = blueDoor.y;

      const doorOpened = blueDoor.interact(player, gameState, eventBus);
      expect(doorOpened).toBe(true);
      expect(blueDoor.isOpen).toBe(true);
      expect(blueDoor.isLocked).toBe(false);
      expect(level.getTile(45, 15)).toBe(TILE_TYPES.DOOR_OPEN);
    });

    test('Step 3: Navigate Cryo Labs & Extract Signal Fragment Alpha [CRY-01]', () => {
      // Locate Fragment Alpha in Cryo Labs (tileX: 54, tileY: 8 -> 1744, 272)
      const fragAlpha = interactables.find(
        i => i instanceof SignalFragment && (i.subType === FRAGMENT_TYPES.ALPHA || i.code === 'CRY-01')
      );
      expect(fragAlpha).toBeTruthy();
      expect(fragAlpha.collected).toBe(false);

      // Simulate player movement through unlocked Cryo sector to Fragment Alpha
      player.x = fragAlpha.x;
      player.y = fragAlpha.y;

      const closest = player.findClosestInteractable(interactables);
      expect(closest).toBe(fragAlpha);

      // Extract Fragment Alpha
      const extracted = player.triggerInteraction();
      expect(extracted).toBe(true);
      expect(fragAlpha.collected).toBe(true);
      expect(fragAlpha.active).toBe(false);

      // Verify GameState progression
      expect(gameState.hasFragment(ITEM_TYPES.FRAGMENT_ALPHA)).toBe(true);
      expect(gameState.getFragmentCount()).toBe(1);
      expect(gameState.currentObjective).toContain('Fragment Beta');
    });

    test('Step 4: Navigate to Power Substation, Collect Red Keycard & Reboot Reactor Breakers', () => {
      // Locate Red Engineering Keycard in Power Substation (tileX: 46, tileY: 44)
      const redKeycard = interactables.find(
        i => i instanceof Keycard && (i.level === KEYCARD_TYPES.RED || i.level === 'red')
      );
      expect(redKeycard).toBeTruthy();
      expect(redKeycard.collected).toBe(false);

      // Move player to Red Keycard and collect it
      player.x = redKeycard.x;
      player.y = redKeycard.y;
      player.findClosestInteractable(interactables);
      player.triggerInteraction();

      expect(redKeycard.collected).toBe(true);
      expect(gameState.hasKeycard(SECURITY_LEVELS.RED)).toBe(true);

      // Locate Reactor Substation Terminal TERM-PWR-01 (tileX: 50, tileY: 46)
      const pwrTerminal = interactables.find(
        i => i instanceof Terminal && (i.id === 'TERM-PWR-01' || i.terminalType === 'generator_restart')
      );
      expect(pwrTerminal).toBeTruthy();

      // Move player to power terminal
      player.x = pwrTerminal.x;
      player.y = pwrTerminal.y;

      // Open terminal
      pwrTerminal.interact(player, gameState, eventBus);

      expect(terminalUI.isOpen).toBe(true);
      expect(gameState.getState()).toBe(GAME_STATES.TERMINAL);

      // Fast-forward boot sequence
      terminalUI.update(0.6);
      expect(terminalUI.currentScreen).toBe('REACTOR');

      // Simulate engaging all 4 reactor breaker switches: [Turbine, Coolant, Magnetic, Plasma]
      expect(terminalUI.areAllBreakersOnline()).toBe(false);
      for (let i = 0; i < terminalUI.breakers.length; i++) {
        if (!terminalUI.breakers[i].state) {
          terminalUI.toggleBreaker(i);
        }
      }

      expect(terminalUI.areAllBreakersOnline()).toBe(true);
      expect(gameState.generatorOnline).toBe(true);

      // Close terminal and return to PLAYING
      terminalUI.close();
      expect(terminalUI.isOpen).toBe(false);
      expect(gameState.getState()).toBe(GAME_STATES.PLAYING);
    });

    test('Step 5: Extract Signal Fragment Beta [PWR-02] in Reactor Core', () => {
      // Locate Fragment Beta in Power Substation (tileX: 58, tileY: 56)
      const fragBeta = interactables.find(
        i => i instanceof SignalFragment && (i.subType === FRAGMENT_TYPES.BETA || i.code === 'PWR-02')
      );
      expect(fragBeta).toBeTruthy();
      expect(fragBeta.collected).toBe(false);

      // Move player to Fragment Beta
      player.x = fragBeta.x;
      player.y = fragBeta.y;
      player.findClosestInteractable(interactables);
      player.triggerInteraction();

      expect(fragBeta.collected).toBe(true);
      expect(gameState.hasFragment(ITEM_TYPES.FRAGMENT_BETA)).toBe(true);
      expect(gameState.getFragmentCount()).toBe(2);
      expect(gameState.currentObjective).toContain('Fragment Gamma');
    });

    test('Step 6: Navigate Server Core, Unlock Red Bulkhead, Collect Master Keycard & Fragment Gamma [DAT-03]', () => {
      // Locate Red Blast Door guarding Server Core
      const redDoor = interactables.find(
        i => i instanceof Door && (i.securityLevel === SECURITY_LEVELS.RED || i.securityLevel === 'RED' || (i.tileX === 21 && i.tileY === 44))
      );
      expect(redDoor).toBeTruthy();
      expect(redDoor.securityLevel).toBe(SECURITY_LEVELS.RED);

      // Move player to Red Door and unlock with Red Clearance
      player.x = redDoor.x;
      player.y = redDoor.y;
      const opened = redDoor.interact(player, gameState, eventBus);
      expect(opened).toBe(true);
      expect(redDoor.isOpen).toBe(true);

      // Locate Master Command Keycard in Server Core (tileX: 10, tileY: 46)
      const masterKeycard = interactables.find(
        i => i instanceof Keycard && (i.level === KEYCARD_TYPES.MASTER || i.level === 'master')
      );
      expect(masterKeycard).toBeTruthy();

      player.x = masterKeycard.x;
      player.y = masterKeycard.y;
      player.findClosestInteractable(interactables);
      player.triggerInteraction();

      expect(masterKeycard.collected).toBe(true);
      expect(gameState.hasKeycard(SECURITY_LEVELS.MASTER)).toBe(true);

      // Locate Fragment Gamma in deep Data Vault (tileX: 6, tileY: 56)
      const fragGamma = interactables.find(
        i => i instanceof SignalFragment && (i.subType === FRAGMENT_TYPES.GAMMA || i.code === 'DAT-03')
      );
      expect(fragGamma).toBeTruthy();

      player.x = fragGamma.x;
      player.y = fragGamma.y;
      player.findClosestInteractable(interactables);
      player.triggerInteraction();

      expect(fragGamma.collected).toBe(true);
      expect(gameState.hasFragment(ITEM_TYPES.FRAGMENT_GAMMA)).toBe(true);
      expect(gameState.getFragmentCount()).toBe(3);
      expect(gameState.currentObjective).toContain('All 3 Fragments Acquired');
    });

    test('Step 7: Central Comms Array — Oscilloscope Decryption of Alpha, Beta, Gamma', () => {
      // Locate Comms Console TERM-COMMS-01 (tileX: 33, tileY: 28)
      const commsTerminal = interactables.find(
        i => i instanceof Terminal && (i.id === 'TERM-COMMS-01' || i.terminalType === 'comms_broadcast')
      );
      expect(commsTerminal).toBeTruthy();

      player.x = commsTerminal.x;
      player.y = commsTerminal.y;

      // Open Comms Console
      commsTerminal.interact(player, gameState, eventBus);
      expect(terminalUI.isOpen).toBe(true);
      terminalUI.update(0.6); // Finish boot sequence
      expect(terminalUI.currentScreen).toBe('COMMS');

      // 1. Decrypt Fragment Alpha via DecryptionMinigame
      terminalUI.launchDecryption('FRAGMENT_ALPHA');
      expect(decryptionMinigame.active).toBe(true);
      expect(decryptionMinigame.fragmentType).toBe('FRAGMENT_ALPHA');

      // Tune player wave to match target resonance
      decryptionMinigame.player.freq = decryptionMinigame.target.freq;
      decryptionMinigame.player.amp = decryptionMinigame.target.amp;
      decryptionMinigame.player.phase = decryptionMinigame.target.phase;
      decryptionMinigame.syncSliders();

      const resonanceAlpha = decryptionMinigame.calculateResonance();
      expect(resonanceAlpha).toBeGreaterThanOrEqual(0.95);

      const lockAlpha = decryptionMinigame.attemptLock();
      expect(lockAlpha).toBe(true);
      expect(decryptionMinigame.isLocked).toBe(true);

      // Advance minigame timer to trigger onCompleteCallback
      decryptionMinigame.update(2.0);
      expect(decryptionMinigame.active).toBe(false);
      expect(gameState.isFragmentDecrypted('FRAGMENT_ALPHA')).toBe(true);

      // 2. Decrypt Fragment Beta
      terminalUI.launchDecryption('FRAGMENT_BETA');
      expect(decryptionMinigame.active).toBe(true);
      decryptionMinigame.player.freq = decryptionMinigame.target.freq;
      decryptionMinigame.player.amp = decryptionMinigame.target.amp;
      decryptionMinigame.player.phase = decryptionMinigame.target.phase;
      decryptionMinigame.syncSliders();

      const resonanceBeta = decryptionMinigame.calculateResonance();
      expect(resonanceBeta).toBeGreaterThanOrEqual(0.95);
      expect(decryptionMinigame.attemptLock()).toBe(true);

      decryptionMinigame.update(2.0);
      expect(decryptionMinigame.active).toBe(false);
      expect(gameState.isFragmentDecrypted('FRAGMENT_BETA')).toBe(true);

      // 3. Decrypt Fragment Gamma
      terminalUI.launchDecryption('FRAGMENT_GAMMA');
      expect(decryptionMinigame.active).toBe(true);
      decryptionMinigame.player.freq = decryptionMinigame.target.freq;
      decryptionMinigame.player.amp = decryptionMinigame.target.amp;
      decryptionMinigame.player.phase = decryptionMinigame.target.phase;
      decryptionMinigame.syncSliders();

      const resonanceGamma = decryptionMinigame.calculateResonance();
      expect(resonanceGamma).toBeGreaterThanOrEqual(0.95);
      expect(decryptionMinigame.attemptLock()).toBe(true);

      decryptionMinigame.update(2.0);
      expect(decryptionMinigame.active).toBe(false);
      expect(gameState.isFragmentDecrypted('FRAGMENT_GAMMA')).toBe(true);

      // Verify all 3 fragments are fully decrypted
      expect(gameState.getDecryptedFragmentCount()).toBe(3);
    });

    test('Step 8: Broadcast Subspace Transmission & Trigger NEXUS-9 Frenzy State', () => {
      let broadcastSent = false;
      eventBus.on('BROADCAST_SENT', () => (broadcastSent = true));

      // Transmit unified subspace signal from Comms Terminal
      terminalUI.transmitFinalBroadcast();

      expect(broadcastSent).toBe(true);
      expect(gameState.commsRepaired).toBe(true);
      expect(gameState.escapeUnlocked).toBe(true);
      expect(gameState.currentObjective).toContain('ESCAPE BAY');

      // AI responds to subspace broadcast by entering FRENZY overdrive hunt
      enemy.triggerFrenzy();
      expect(enemy.isFrenzyActive).toBe(true);
      expect(enemy.state).toBe(AI_STATES.FRENZY);
      expect(enemy.speed).toBe(235); // Max pursuit speed

      terminalUI.close();
      expect(gameState.getState()).toBe(GAME_STATES.PLAYING);
    });

    test('Step 9: Evacuate to Emergency Escape Bay, Launch Escape Pod & Achieve Victory', () => {
      // Advance game timer to simulate elapsed playthrough time
      gameState.update(45.0);

      // Locate Escape Pod Terminal TERM-ESC-01 (tileX: 11, tileY: 27)
      const escapeTerminal = interactables.find(
        i => i instanceof Terminal && (i.id === 'TERM-ESC-01' || i.terminalType === 'escape_launch')
      );
      expect(escapeTerminal).toBeTruthy();

      // Move player to Escape Pod Berth
      player.x = escapeTerminal.x;
      player.y = escapeTerminal.y;

      // Verify win criteria are all satisfied
      expect(gameState.getFragmentCount()).toBe(3);
      expect(gameState.commsRepaired).toBe(true);
      expect(gameState.generatorOnline).toBe(true);
      expect(gameState.escapeUnlocked).toBe(true);

      // Launch escape pod
      let victoryObjectiveCompleted = false;
      eventBus.on(EVENTS.OBJECTIVE_COMPLETED, data => {
        if (data.objective === 'Station Evacuated') victoryObjectiveCompleted = true;
      });

      const winSuccess = gameState.checkWinCondition();
      expect(winSuccess).toBe(true);
      expect(gameState.getState()).toBe(GAME_STATES.VICTORY);
      expect(victoryObjectiveCompleted).toBe(true);

      // Verify Final Victory Statistics Summary
      const summary = gameState.getSummaryStats();
      expect(summary.fragmentsCollected).toBe('3/3');
      expect(summary.fragmentsDecrypted).toBe('3/3');
      expect(summary.fragmentsFound).toBe(3);
      expect(summary.timeSurvived).toBeGreaterThan(0);
      expect(typeof summary.timeFormatted).toBe('string');
      expect(summary.itemsCollected).toBeGreaterThanOrEqual(6); // 3 frags + 3 keycards
    });
  });

  // =========================================================================
  // SUITE 2: SIMULATION OF FAILURE MODES & SURVIVAL EDGE CASES
  // =========================================================================
  describe('Gameplay Simulation — Failure Modes & Survival Edge Cases', () => {
    test('Acoustic Perception: NEXUS-9 tracks sprint footsteps, ignores crouch stealth', () => {
      const bus = new EventBus();
      const enemy = new EnemyAI({ x: 500, y: 500, eventBus: bus });
      enemy.setState(AI_STATES.PATROL);

      // 1. Sprinting Footsteps: distance = 200px, sprint noise radius = 300px -> Heard!
      const heardSprint = enemy.hearNoise(650, 500, 300);
      expect(heardSprint).toBe(true);
      expect(enemy.state).toBe(AI_STATES.INVESTIGATE);
      expect(enemy.investigateTarget).toEqual({ x: 650, y: 500 });

      // Reset to patrol
      enemy.setState(AI_STATES.PATROL);

      // 2. Crouching / Stealth: noise radius = 0px -> Not Heard!
      const heardCrouch = enemy.hearNoise(520, 500, 0);
      expect(heardCrouch).toBe(false);
      expect(enemy.state).toBe(AI_STATES.PATROL);

      // 3. Walking beyond acoustic range: distance = 250px, walk radius = 100px -> Not Heard!
      const heardFarWalk = enemy.hearNoise(750, 500, 100);
      expect(heardFarWalk).toBe(false);
      expect(enemy.state).toBe(AI_STATES.PATROL);
    });

    test('Combat & Mortality: Damage taking, i-frames, and GAMEOVER state transition on 0 HP', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState(GAME_STATES.PLAYING);

      const player = new Player({ x: 100, y: 100, eventBus: bus, gameState: gs });
      let playerDiedEvent = null;
      bus.on(EVENTS.PLAYER_DIED, data => (playerDiedEvent = data));

      // Hit 1: 45 Damage
      player.takeDamage(45);
      expect(player.health).toBe(55);
      expect(gs.playerHealth).toBe(55);
      expect(player.invulnerable).toBe(true);

      // Hit 2: Attempt attack during invulnerability frames (should be blocked)
      const blockedHit = player.takeDamage(45);
      expect(blockedHit).toBe(false);
      expect(player.health).toBe(55);

      // Advance i-frame duration
      player.update(1.0);
      expect(player.invulnerable).toBe(false);

      // Hit 3: Fatal damage (60 dmg against 55 HP)
      player.takeDamage(60);
      expect(player.health).toBe(0);
      expect(gs.playerHealth).toBe(0);
      expect(gs.getState()).toBe(GAME_STATES.GAMEOVER);
      expect(playerDiedEvent).toBeTruthy();

      // Additional damage after Game Over must be ignored
      player.takeDamage(50);
      expect(player.health).toBe(0);
      expect(gs.stats.damageTaken).toBe(105); // 45 + 60
    });

    test('Flashlight Resource: Depletion over time, auto-off, and recharge restoration', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState(GAME_STATES.PLAYING);

      let flashlightEvent = null;
      bus.on(EVENTS.FLASHLIGHT_TOGGLED, data => (flashlightEvent = data));

      expect(gs.isFlashlightOn).toBe(true);
      expect(gs.flashlightBattery).toBe(100);

      // Drain battery partially
      gs.drainBattery(40);
      expect(gs.flashlightBattery).toBe(60);
      expect(gs.isFlashlightOn).toBe(true);

      // Drain remaining battery to 0
      gs.drainBattery(70);
      expect(gs.flashlightBattery).toBe(0);
      expect(gs.isFlashlightOn).toBe(false);
      expect(flashlightEvent.isOn).toBe(false);
      expect(flashlightEvent.reason).toBe('battery_depleted');

      // Attempting to turn ON dead flashlight should fail
      const toggleAttempt = gs.toggleFlashlight();
      expect(toggleAttempt).toBe(false);
      expect(gs.isFlashlightOn).toBe(false);

      // Use Battery Pack pickup to restore +40 energy
      gs.consumeItem(ITEM_TYPES.BATTERY_PACK);
      expect(gs.flashlightBattery).toBe(40);

      // Now flashlight can be turned back ON
      const restoredToggle = gs.toggleFlashlight();
      expect(restoredToggle).toBe(true);
      expect(gs.isFlashlightOn).toBe(true);
    });

    test('Stamina Mechanics: Sprint depletion, exhaustion lockout, and hysteresis recovery threshold', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState(GAME_STATES.PLAYING);

      expect(gs.stamina).toBe(STAMINA_MAX); // 100
      expect(gs.isExhausted).toBe(false);

      // Rapid sprint drain to 0
      gs.drainStamina(100);
      expect(gs.stamina).toBe(0);
      expect(gs.isExhausted).toBe(true);

      // Partial recovery below exhaustion threshold (threshold is 20)
      gs.recoverStamina(12);
      expect(gs.stamina).toBe(12);
      expect(gs.isExhausted).toBe(true); // Still locked out of sprinting!

      // Recovery crosses threshold >= 20
      gs.recoverStamina(15);
      expect(gs.stamina).toBe(27);
      expect(gs.isExhausted).toBe(false); // Exhaustion cleared!
    });
  });
}
