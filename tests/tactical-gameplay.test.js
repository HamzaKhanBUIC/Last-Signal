/**
 * THE LAST SIGNAL — TACTICAL GAMEPLAY & STEALTH MECHANICS TEST SUITE
 * Tests Hiding Spots, Sonic Decoy Distraction, EMP Surge Stun, and Environmental Hazards.
 */

import { EventBus } from '../src/core/EventBus.js';
import { GameState } from '../src/core/GameState.js';
import { Player } from '../src/entities/Player.js';
import { EnemyAI } from '../src/entities/EnemyAI.js';
import {
  HidingSpot,
  SonicDecoy,
  HazardZone,
  SonicDecoyPickup,
  EMPChargePickup
} from '../src/entities/Interactable.js';
import { LevelManager } from '../src/world/LevelManager.js';
import {
  GAME_STATES,
  AI_STATES,
  ITEM_TYPES,
  EVENTS
} from '../src/utils/Constants.js';

export function runTacticalGameplayTests(describe, test, expect) {
  describe('Tactical Mechanics — Concealment, Decoys, EMP & Hazards', () => {
    test('HidingSpot: Player can hide in locker, zeroing velocity and concealing from AI LOS', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      gameState.setState(GAME_STATES.PLAYING);

      const player = new Player({ x: 100, y: 100, eventBus, gameState });
      const enemy = new EnemyAI({ x: 200, y: 100, eventBus });
      const locker = new HidingSpot({ id: 'test-locker-1', x: 100, y: 100 });

      expect(player.isHiding).toBe(false);
      expect(locker.isOccupied).toBe(false);

      // Player interacts to hide in locker
      let hiddenEventFired = false;
      eventBus.on('PLAYER_HIDDEN', () => (hiddenEventFired = true));

      locker.interact(player, gameState, eventBus);

      expect(player.isHiding).toBe(true);
      expect(locker.isOccupied).toBe(true);
      expect(hiddenEventFired).toBe(true);

      // AI vision check: Player in locker is concealed
      const canSee = enemy.canSeePlayer(player);
      expect(canSee).toBe(false);

      // Player exits locker
      let unhiddenEventFired = false;
      eventBus.on('PLAYER_UNHIDDEN', () => (unhiddenEventFired = true));

      locker.interact(player, gameState, eventBus);

      expect(player.isHiding).toBe(false);
      expect(locker.isOccupied).toBe(false);
      expect(unhiddenEventFired).toBe(true);
    });

    test('SonicDecoy: Emits periodic acoustic pulses and lures AI to investigate', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      gameState.setState(GAME_STATES.PLAYING);

      const enemy = new EnemyAI({ x: 300, y: 300, eventBus });
      enemy.setEventBus(eventBus);

      const decoy = new SonicDecoy({ x: 150, y: 150, eventBus });

      let noiseHeard = false;
      eventBus.on('NOISE_EMITTED', (data) => {
        if (data.source === 'decoy') noiseHeard = true;
      });

      // Update decoy past pulse interval (0.8s)
      decoy.update(0.85, null, gameState, eventBus);

      expect(noiseHeard).toBe(true);
      expect(enemy.state).toBe(AI_STATES.INVESTIGATE);
      expect(enemy.investigateTarget).toEqual({ x: 150, y: 150 });
    });

    test('EMP Surge: Discharging EMP stuns NEXUS-9 for 4.5s and drains battery/charge', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      gameState.setState(GAME_STATES.PLAYING);

      const player = new Player({ x: 200, y: 200, eventBus, gameState });
      const enemy = new EnemyAI({ x: 250, y: 200, eventBus });
      enemy.setEventBus(eventBus);

      expect(gameState.inventory.empCharges).toBe(1);
      expect(enemy.isStunned).toBe(false);

      // Player triggers EMP
      player.dischargeEMP();

      expect(gameState.inventory.empCharges).toBe(0);
      expect(enemy.isStunned).toBe(true);
      expect(enemy.stunTimer).toBeCloseTo(4.5, 1);
      expect(enemy.speed).toBe(0);

      // Advance time while stunned
      enemy.update(2.0, player);
      expect(enemy.isStunned).toBe(true);

      // Advance past stun timer
      enemy.update(3.0, player);
      expect(enemy.isStunned).toBe(false);
      expect(enemy.state).toBe(AI_STATES.INVESTIGATE);
    });

    test('HazardZone: Electric arcs deal damage and cryo leaks reduce player speed and stamina', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      gameState.setState(GAME_STATES.PLAYING);

      const player = new Player({ x: 300, y: 300, eventBus, gameState });

      const electricHazard = new HazardZone({
        id: 'hz-elec',
        hazardType: 'electric',
        x: 300,
        y: 300,
        radius: 40
      });

      const initialHp = player.health;
      electricHazard.update(1.2, player, gameState, eventBus);

      expect(player.health).toBeLessThan(initialHp);

      // Test Cryo hazard
      const cryoHazard = new HazardZone({
        id: 'hz-cryo',
        hazardType: 'cryo',
        x: 300,
        y: 300,
        radius: 40
      });

      const initialStamina = gameState.stamina;
      cryoHazard.update(0.6, player, gameState, eventBus);

      expect(player.speedMultiplier).toBeLessThan(1.0);
      expect(gameState.stamina).toBeLessThan(initialStamina);
    });

    test('Tactical Pickups: Collecting Decoys and EMP charges increments GameState inventory', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      gameState.reset();

      const decoyPickup = new SonicDecoyPickup({ id: 'p-decoy', x: 50, y: 50 });
      const empPickup = new EMPChargePickup({ id: 'p-emp', x: 60, y: 60 });

      const prevDecoys = gameState.inventory.decoys;
      const prevEmp = gameState.inventory.empCharges;

      decoyPickup.interact(null, gameState, eventBus);
      empPickup.interact(null, gameState, eventBus);

      expect(gameState.inventory.decoys).toBe(prevDecoys + 1);
      expect(gameState.inventory.empCharges).toBe(prevEmp + 1);
      expect(decoyPickup.collected).toBe(true);
      expect(empPickup.collected).toBe(true);
    });
  });
}
