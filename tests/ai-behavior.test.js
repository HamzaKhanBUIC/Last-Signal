/**
 * THE LAST SIGNAL — ENTITY & AI BEHAVIOR TEST SUITE
 * 
 * Comprehensive unit and integration tests for:
 * - Entity base class transform and collision geometry
 * - Player movement physics, stances, flashlight, noise footprint, damage i-frames, and interactions
 * - NEXUS-9 AI State Machine (PATROL, INVESTIGATE, CHASE, SEARCH, FRENZY, STALK)
 * - NEXUS-9 Sensory Perception (110-deg LOS vision cone, wall occlusion raycasting, acoustic hearing, flashlight sensitivity)
 * - Proximity disturbance aura & melee attack combat
 * - Interactive objects (Doors with security clearance & dynamic collision, Fragments, Terminals, Keycards, Pickups)
 */

import { Entity } from '../src/entities/Entity.js';
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
import { EventBus } from '../src/core/EventBus.js';
import { GameState } from '../src/core/GameState.js';
import { InputManager } from '../src/core/InputManager.js';
import { LevelManager } from '../src/world/LevelManager.js';
import { Pathfinding } from '../src/world/Pathfinding.js';
import {
  AI_STATES,
  ITEM_TYPES,
  SECURITY_LEVELS,
  KEYCARD_TYPES,
  FRAGMENT_TYPES,
  TILE_TYPES,
  INPUT_ACTIONS,
  EVENTS
} from '../src/utils/Constants.js';

export function runAIBehaviorTests(describe, test, expect) {
  // =========================================================================
  // 1. BASE ENTITY SUITE
  // =========================================================================
  describe('Entity — Base Transform & Geometry', () => {
    test('initializes with default transform and bounds', () => {
      const e = new Entity({ x: 100, y: 200, radius: 16 });
      expect(e.x).toBe(100);
      expect(e.y).toBe(200);
      expect(e.radius).toBe(16);
      expect(e.active).toBe(true);

      const bounds = e.getBounds();
      expect(bounds.x).toBe(84);
      expect(bounds.y).toBe(184);
      expect(bounds.width).toBe(32);
      expect(bounds.height).toBe(32);

      const circle = e.getCircle();
      expect(circle.x).toBe(100);
      expect(circle.y).toBe(200);
      expect(circle.radius).toBe(16);
    });

    test('calculates distance, squared distance, and angle to target', () => {
      const e1 = new Entity({ x: 0, y: 0 });
      const e2 = new Entity({ x: 30, y: 40 });

      expect(e1.distanceTo(e2)).toBe(50);
      expect(e1.distanceToSq(e2)).toBe(2500);
      expect(e1.angleTo(e2)).toBeCloseTo(Math.atan2(40, 30), 4);
    });

    test('detects circle collision overlaps accurately', () => {
      const e1 = new Entity({ x: 100, y: 100, radius: 15 });
      const e2 = new Entity({ x: 120, y: 100, radius: 15 }); // Distance: 20, sum radius: 30 -> overlaps
      const e3 = new Entity({ x: 200, y: 100, radius: 15 }); // Distance: 100 -> no overlap

      expect(e1.collidesWith(e2)).toBe(true);
      expect(e1.collidesWith(e3)).toBe(false);
    });

    test('updates position via velocity integration', () => {
      const e = new Entity({ x: 50, y: 50 });
      e.vx = 100;
      e.vy = -50;
      e.update(0.5);

      expect(e.x).toBe(100);
      expect(e.y).toBe(25);
    });
  });

  // =========================================================================
  // 2. PLAYER ENTITY SUITE
  // =========================================================================
  describe('Player — Controller, Physics, Stances & Noise', () => {
    test('initializes with default speed, stance, and max vitals', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      const player = new Player({ x: 64, y: 64, eventBus: bus, gameState: gs });

      expect(player.stance).toBe(PLAYER_STANCES.WALKING);
      expect(player.health).toBe(100);
      expect(player.isFlashlightOn).toBe(true);
      expect(player.invulnerable).toBe(false);
    });

    test('adjusts speeds and noise emission radii based on stances', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState('PLAYING');
      const input = new InputManager();
      const player = new Player({ x: 100, y: 100, eventBus: bus, gameState: gs });

      let noiseEvents = [];
      bus.on('PLAYER_NOISE', data => noiseEvents.push(data));

      // 1. Walking Stance
      input.keysDown.add('KeyD');
      player.update(0.1, input);
      expect(player.stance).toBe(PLAYER_STANCES.WALKING);
      expect(player.targetSpeed).toBe(140);
      expect(player.noiseRadius).toBe(100);

      // 2. Sprinting Stance (requires shift)
      input.keysDown.add('ShiftLeft');
      player.update(0.1, input);
      expect(player.stance).toBe(PLAYER_STANCES.SPRINTING);
      expect(player.targetSpeed).toBe(240);
      expect(player.noiseRadius).toBe(300);

      // 3. Crouching Stance (Ctrl / C)
      input.keysDown.delete('ShiftLeft');
      input.keysDown.add('ControlLeft');
      player.update(0.1, input);
      expect(player.stance).toBe(PLAYER_STANCES.CROUCHING);
      expect(player.targetSpeed).toBe(70);
      expect(player.noiseRadius).toBe(0); // Zero noise in stealth mode!

      // 4. Idle Stance (no keys)
      input.keysDown.clear();
      player.vx = 0;
      player.vy = 0;
      player.isMoving = false;
      player.update(0.1, input);
      expect(player.noiseRadius).toBe(0);
    });

    test('flashlight toggling and synchronization with GameState', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState('PLAYING');
      const player = new Player({ x: 100, y: 100, eventBus: bus, gameState: gs });

      expect(player.isFlashlightOn).toBe(true);

      player.toggleFlashlight();
      expect(player.isFlashlightOn).toBe(false);
      expect(gs.isFlashlightOn).toBe(false);

      player.setFlashlight(true);
      expect(player.isFlashlightOn).toBe(true);
      expect(gs.isFlashlightOn).toBe(true);
    });

    test('damage taking with invulnerability frames and knockback', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState('PLAYING');
      const player = new Player({ x: 100, y: 100, eventBus: bus, gameState: gs });

      let damagedEvent = null;
      let shakeEvent = null;
      bus.on('PLAYER_DAMAGED', d => (damagedEvent = d));
      bus.on('SCREEN_SHAKE', s => (shakeEvent = s));

      const hit = player.takeDamage(45, Math.PI / 2, 200);
      expect(hit).toBe(true);
      expect(player.health).toBe(55);
      expect(player.invulnerable).toBe(true);
      expect(player.invulnerabilityTimer).toBeGreaterThan(0.5);
      expect(damagedEvent).toBeTruthy();
      expect(shakeEvent).toBeTruthy();

      // Second hit during i-frames should be ignored
      const hitDuringIFrames = player.takeDamage(45);
      expect(hitDuringIFrames).toBe(false);
      expect(player.health).toBe(55);

      // Fast forward i-frames
      player.update(1.0);
      expect(player.invulnerable).toBe(false);

      // Now takes damage again
      player.takeDamage(55);
      expect(player.health).toBe(0);
      expect(gs.getState()).toBe('GAMEOVER');
    });

    test('queries closest interactable and triggers interaction', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState('PLAYING');
      const player = new Player({ x: 100, y: 100, eventBus: bus, gameState: gs });

      const medkit = new Medkit({ x: 120, y: 100 }); // Distance: 20 (within 60px)
      const distantBattery = new BatteryPack({ x: 300, y: 300 }); // Distance: ~282 (out of range)

      const interactables = [distantBattery, medkit];
      const closest = player.findClosestInteractable(interactables);
      expect(closest).toBe(medkit);

      // Trigger interaction
      player.health = 50;
      gs.playerHealth = 50;
      const success = player.triggerInteraction();
      expect(success).toBe(true);
      expect(medkit.collected).toBe(true);
      expect(medkit.active).toBe(false);
      expect(gs.inventory.medkits).toBe(2); // Initial 1 + collected 1
    });
  });

  // =========================================================================
  // 3. NEXUS-9 AI STATE MACHINE & COMBAT
  // =========================================================================
  describe('EnemyAI — NEXUS-9 State Machine & Combat', () => {
    test('initializes in PATROL state with proper configuration', () => {
      const bus = new EventBus();
      const enemy = new EnemyAI({ x: 300, y: 300, eventBus: bus });

      expect(enemy.name).toBe('NEXUS-9');
      expect(enemy.state).toBe(AI_STATES.PATROL);
      expect(enemy.speed).toBe(85);
      expect(enemy.attackDamage).toBe(45);
      expect(enemy.attackRange).toBe(40);
    });

    test('state transitions trigger state events and speed changes', () => {
      const bus = new EventBus();
      const enemy = new EnemyAI({ x: 300, y: 300, eventBus: bus });

      let stateEvents = [];
      bus.on(EVENTS.ENEMY_STATE_CHANGED, e => stateEvents.push(e));

      enemy.setState(AI_STATES.CHASE);
      expect(enemy.state).toBe(AI_STATES.CHASE);
      expect(enemy.speed).toBe(195);
      expect(stateEvents.length).toBe(1);
      expect(stateEvents[0].to).toBe(AI_STATES.CHASE);

      enemy.setState(AI_STATES.INVESTIGATE);
      expect(enemy.state).toBe(AI_STATES.INVESTIGATE);
      expect(enemy.speed).toBe(115);

      enemy.triggerFrenzy();
      expect(enemy.state).toBe(AI_STATES.FRENZY);
      expect(enemy.speed).toBe(235);
      expect(enemy.isFrenzyActive).toBe(true);
    });

    test('executes melee attack against player within range', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState('PLAYING');
      const player = new Player({ x: 100, y: 100, eventBus: bus, gameState: gs });
      const enemy = new EnemyAI({ x: 125, y: 100, eventBus: bus }); // Distance: 25px (within 40px range)

      let attackEvents = [];
      bus.on(EVENTS.ENEMY_ATTACKED, a => attackEvents.push(a));

      const attacked = enemy.checkMeleeAttack(player);
      expect(attacked).toBe(true);
      expect(player.health).toBe(55); // 100 - 45
      expect(enemy.attackTimer).toBeCloseTo(1.2, 2);
      expect(attackEvents.length).toBe(1);

      // Cannot attack again while on cooldown
      const attackDuringCooldown = enemy.checkMeleeAttack(player);
      expect(attackDuringCooldown).toBe(false);
      expect(player.health).toBe(55);
    });

    test('calculates proximity disturbance and emits ENTITY_PROXIMITY events', () => {
      const bus = new EventBus();
      const player = new Player({ x: 100, y: 100 });
      const enemy = new EnemyAI({ x: 200, y: 100, eventBus: bus }); // Distance: 100px (< 260px aura)

      let proxData = null;
      bus.on(EVENTS.ENTITY_PROXIMITY, p => (proxData = p));

      enemy.updateProximityAura(player);
      expect(proxData).toBeTruthy();
      expect(proxData.distance).toBe(100);
      expect(proxData.intensity).toBeGreaterThan(0.5);
    });
  });

  // =========================================================================
  // 4. NEXUS-9 SENSORY PERCEPTION SYSTEM
  // =========================================================================
  describe('EnemyAI — Sensory Perception (Sight Cone, Hearing, Flashlight)', () => {
    test('detects player inside 110-degree vision cone with clear LOS', () => {
      const level = new LevelManager();
      const enemy = new EnemyAI({ x: 200, y: 200, angle: 0 }); // Facing East (0 rad)

      // Player directly ahead at (300, 200) -> distance: 100px, angle diff: 0
      const playerInFront = new Player({ x: 300, y: 200 });
      expect(enemy.canSeePlayer(playerInFront, level)).toBe(true);

      // Player behind enemy at (100, 200) -> angle diff: PI (outside cone)
      const playerBehind = new Player({ x: 100, y: 200 });
      expect(enemy.canSeePlayer(playerBehind, level)).toBe(false);

      // Player beyond sight range at (800, 200) -> distance: 600px (> 400px)
      const playerFar = new Player({ x: 800, y: 200 });
      expect(enemy.canSeePlayer(playerFar, level)).toBe(false);
    });

    test('vision is blocked by solid wall segments (LOS raycast occlusion)', () => {
      const level = new LevelManager();
      // Level has walls between rooms; let's test across solid bulkhead
      const enemy = new EnemyAI({ x: 10 * 32, y: 10 * 32, angle: 0 }); // In Habitation room
      const playerBehindWall = new Player({ x: 30 * 32, y: 10 * 32 }); // In Security Hub across walls

      const canSee = enemy.canSeePlayer(playerBehindWall, level);
      expect(canSee).toBe(false);
    });

    test('hears noise within acoustic radius and transitions to INVESTIGATE', () => {
      const bus = new EventBus();
      const enemy = new EnemyAI({ x: 200, y: 200, eventBus: bus });
      enemy.setState(AI_STATES.PATROL);

      // Sprint noise at (350, 200) with radius 300 (distance: 150 -> heard!)
      const heard = enemy.hearNoise(350, 200, 300);
      expect(heard).toBe(true);
      expect(enemy.state).toBe(AI_STATES.INVESTIGATE);
      expect(enemy.investigateTarget).toEqual({ x: 350, y: 200 });

      // Reset to patrol
      enemy.setState(AI_STATES.PATROL);

      // Soft noise far away at (800, 800) with radius 100 (not heard)
      const heardFar = enemy.hearNoise(800, 800, 100);
      expect(heardFar).toBe(false);
      expect(enemy.state).toBe(AI_STATES.PATROL);
    });

    test('direct flashlight beam onto AI immediately triggers alert', () => {
      const enemy = new EnemyAI({ x: 300, y: 200, angle: Math.PI }); // Facing West
      const player = new Player({ x: 150, y: 200, angle: 0 }); // Facing East directly towards enemy
      player.isFlashlightOn = true;

      const illuminated = enemy.checkFlashlightAlert(player);
      expect(illuminated).toBe(true);
      expect(enemy.state).toBe(AI_STATES.INVESTIGATE);
      expect(enemy.investigateTarget).toEqual({ x: 150, y: 200 });

      // When player flashlight is OFF, no beam illumination alert occurs
      enemy.setState(AI_STATES.PATROL);
      player.isFlashlightOn = false;
      const notIlluminated = enemy.checkFlashlightAlert(player);
      expect(notIlluminated).toBe(false);
      expect(enemy.state).toBe(AI_STATES.PATROL);
    });
  });

  // =========================================================================
  // 5. INTERACTABLE OBJECTS SUITE
  // =========================================================================
  describe('Interactables — Doors, Fragments, Terminals, Keycards & Pickups', () => {
    test('Door security clearance checks and dynamic tile updates', () => {
      const level = new LevelManager();
      const bus = new EventBus();
      const gs = new GameState(bus);

      // 1. Unlocked Door
      const normalDoor = new Door({ tileX: 10, tileY: 10, securityLevel: SECURITY_LEVELS.NONE, levelManager: level });
      expect(normalDoor.isOpen).toBe(false);
      expect(level.getTile(10, 10)).toBe(TILE_TYPES.DOOR_CLOSED);

      normalDoor.interact(null, gs, bus);
      expect(normalDoor.isOpen).toBe(true);
      expect(level.getTile(10, 10)).toBe(TILE_TYPES.DOOR_OPEN);

      normalDoor.interact(null, gs, bus);
      expect(normalDoor.isOpen).toBe(false);
      expect(level.getTile(10, 10)).toBe(TILE_TYPES.DOOR_CLOSED);

      // 2. Blue Locked Door without clearance
      const blueDoor = new Door({ tileX: 15, tileY: 15, securityLevel: SECURITY_LEVELS.BLUE, levelManager: level });
      expect(blueDoor.isLocked).toBe(true);

      const denied = blueDoor.interact(null, gs, bus);
      expect(denied).toBe(false);
      expect(blueDoor.isOpen).toBe(false);

      // Grant Blue clearance
      gs.addInventory(ITEM_TYPES.KEYCARD_BLUE);
      const unlocked = blueDoor.interact(null, gs, bus);
      expect(unlocked).toBe(true);
      expect(blueDoor.isOpen).toBe(true);
      expect(level.getTile(15, 15)).toBe(TILE_TYPES.DOOR_OPEN);
    });

    test('SignalFragment collection updates inventory and objective', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState('PLAYING');

      const fragAlpha = new SignalFragment({
        subType: FRAGMENT_TYPES.ALPHA,
        code: 'CRY-01',
        x: 100,
        y: 100
      });

      let collectedEvent = null;
      bus.on(EVENTS.FRAGMENT_COLLECTED, e => (collectedEvent = e));

      const success = fragAlpha.interact(null, gs, bus);
      expect(success).toBe(true);
      expect(fragAlpha.collected).toBe(true);
      expect(fragAlpha.active).toBe(false);
      expect(gs.hasFragment(ITEM_TYPES.FRAGMENT_ALPHA)).toBe(true);
      expect(gs.getFragmentCount()).toBe(1);
      expect(collectedEvent).toBeTruthy();
    });

    test('Terminal interaction triggers modal event and handles comms repair', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState('PLAYING');

      // Add 3 fragments
      gs.addInventory(ITEM_TYPES.FRAGMENT_ALPHA);
      gs.addInventory(ITEM_TYPES.FRAGMENT_BETA);
      gs.addInventory(ITEM_TYPES.FRAGMENT_GAMMA);

      const commsTerm = new Terminal({
        terminalType: 'comms_broadcast',
        title: 'Central Comms Array'
      });

      let openedTerminal = null;
      bus.on('TERMINAL_OPENED', t => (openedTerminal = t));

      commsTerm.interact(null, gs, bus);
      expect(openedTerminal).toBe(commsTerm);
      expect(gs.commsRepaired).toBe(true);
      expect(gs.escapeUnlocked).toBe(true);
      expect(gs.currentObjective).toContain('Emergency Escape Bay');
    });

    test('createInteractablesFromMap instantiates all doors, terminals, and pickups', () => {
      const level = new LevelManager();
      const interactables = createInteractablesFromMap(level);

      expect(interactables.length).toBeGreaterThan(15);

      const doors = interactables.filter(i => i instanceof Door);
      const fragments = interactables.filter(i => i instanceof SignalFragment);
      const terminals = interactables.filter(i => i instanceof Terminal);
      const keycards = interactables.filter(i => i instanceof Keycard);
      const batteries = interactables.filter(i => i instanceof BatteryPack);
      const medkits = interactables.filter(i => i instanceof Medkit);

      expect(doors.length).toBeGreaterThan(0);
      expect(fragments.length).toBe(3); // 3 signal fragments
      expect(terminals.length).toBe(8); // 8 station terminals
      expect(keycards.length).toBe(3);  // Blue, Red, Master
      expect(batteries.length).toBe(5);
      expect(medkits.length).toBe(4);
    });
  });

  // =========================================================================
  // 6. NEXUS-9 WAYPOINTS & PATH FOLLOWING
  // =========================================================================
  describe('EnemyAI — Waypoint Navigation & Path Following', () => {
    test('cycles through patrol waypoints using pathfinding', () => {
      const level = new LevelManager();
      const pathfinder = new Pathfinding(level);
      const waypoints = [
        { x: 33 * 32, y: 15 * 32, waitTime: 0.1 },
        { x: 43 * 32, y: 15 * 32, waitTime: 0.1 }
      ];

      const enemy = new EnemyAI({ x: 33 * 32, y: 15 * 32, waypoints });
      expect(enemy.currentWaypointIndex).toBe(0);

      // Update patrol step
      enemy.update(0.1, null, level, pathfinder);
      expect(enemy.state).toBe(AI_STATES.PATROL);
    });
  });
}
