/**
 * Unit Tests for GameState.js
 */

import { GameState } from '../src/core/GameState.js';
import { EventBus } from '../src/core/EventBus.js';
import {
  GAME_STATES,
  ITEM_TYPES,
  SECURITY_LEVELS,
  HEALTH_MAX,
  STAMINA_MAX,
  BATTERY_MAX
} from '../src/utils/Constants.js';

export function runGameStateTests(describe, test, expect) {
  describe('GameState — State Machine & Transitions', () => {
    test('initializes with default TITLE state and max vitals', () => {
      const gs = new GameState(new EventBus());
      expect(gs.getState()).toBe(GAME_STATES.TITLE);
      expect(gs.playerHealth).toBe(HEALTH_MAX);
      expect(gs.flashlightBattery).toBe(BATTERY_MAX);
      expect(gs.stamina).toBe(STAMINA_MAX);
      expect(gs.isFlashlightOn).toBe(true);
    });

    test('transitions between valid game states and emits events', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      let transitionEvent = null;

      bus.on('STATE_CHANGED', data => {
        transitionEvent = data;
      });

      const changed = gs.setState(GAME_STATES.PLAYING);
      expect(changed).toBe(true);
      expect(gs.getState()).toBe(GAME_STATES.PLAYING);
      expect(transitionEvent).toEqual({ from: GAME_STATES.TITLE, to: GAME_STATES.PLAYING });
    });

    test('rejects invalid state strings', () => {
      const gs = new GameState(new EventBus());
      const result = gs.setState('SUPER_MARIO_WORLD');
      expect(result).toBe(false);
      expect(gs.getState()).toBe(GAME_STATES.TITLE);
    });
  });

  describe('GameState — Player Vitals & Combat Mechanics', () => {
    test('takeDamage reduces health and triggers Game Over at 0 HP', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState(GAME_STATES.PLAYING);

      let damageEvent = null;
      bus.on('PLAYER_DAMAGED', data => {
        damageEvent = data;
      });

      gs.takeDamage(45);
      expect(gs.playerHealth).toBe(55);
      expect(damageEvent.damage).toBe(45);
      expect(damageEvent.currentHealth).toBe(55);
      expect(gs.stats.damageTaken).toBe(45);

      gs.takeDamage(60);
      expect(gs.playerHealth).toBe(0);
      expect(gs.getState()).toBe(GAME_STATES.GAMEOVER);
    });

    test('healing restores health capped at HEALTH_MAX', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState(GAME_STATES.PLAYING);

      gs.takeDamage(60);
      gs.heal(30);
      expect(gs.playerHealth).toBe(70);

      gs.heal(50);
      expect(gs.playerHealth).toBe(HEALTH_MAX);
    });

    test('battery drain and flashlight auto-shutoff on depletion', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState(GAME_STATES.PLAYING);

      gs.drainBattery(50);
      expect(gs.flashlightBattery).toBe(50);
      expect(gs.isFlashlightOn).toBe(true);

      gs.drainBattery(60);
      expect(gs.flashlightBattery).toBe(0);
      expect(gs.isFlashlightOn).toBe(false);

      const toggled = gs.toggleFlashlight();
      expect(toggled).toBe(false);
      expect(gs.isFlashlightOn).toBe(false);

      gs.chargeBattery(40);
      expect(gs.flashlightBattery).toBe(40);
      gs.toggleFlashlight();
      expect(gs.isFlashlightOn).toBe(true);
    });

    test('stamina drain and exhaustion cycle', () => {
      const gs = new GameState(new EventBus());
      gs.drainStamina(100);
      expect(gs.stamina).toBe(0);
      expect(gs.isExhausted).toBe(true);

      gs.recoverStamina(10);
      expect(gs.stamina).toBe(10);
      expect(gs.isExhausted).toBe(true);

      gs.recoverStamina(15);
      expect(gs.stamina).toBe(25);
      expect(gs.isExhausted).toBe(false);
    });
  });

  describe('GameState — Inventory & Objective Tracking', () => {
    test('keycards addition and clearance hierarchy', () => {
      const gs = new GameState(new EventBus());

      expect(gs.hasKeycard(SECURITY_LEVELS.NONE)).toBe(true);
      expect(gs.hasKeycard(SECURITY_LEVELS.BLUE)).toBe(false);

      gs.addInventory(ITEM_TYPES.KEYCARD_BLUE);
      expect(gs.hasKeycard(SECURITY_LEVELS.BLUE)).toBe(true);
      expect(gs.hasKeycard(SECURITY_LEVELS.RED)).toBe(false);

      gs.addInventory(ITEM_TYPES.KEYCARD_MASTER);
      expect(gs.hasKeycard(SECURITY_LEVELS.BLUE)).toBe(true);
      expect(gs.hasKeycard(SECURITY_LEVELS.RED)).toBe(true);
      expect(gs.hasKeycard(SECURITY_LEVELS.MASTER)).toBe(true);
    });

    test('fragment collection updates progression', () => {
      const gs = new GameState(new EventBus());
      expect(gs.getFragmentCount()).toBe(0);

      gs.addInventory(ITEM_TYPES.FRAGMENT_ALPHA);
      expect(gs.hasFragment(ITEM_TYPES.FRAGMENT_ALPHA)).toBe(true);
      expect(gs.getFragmentCount()).toBe(1);

      gs.addInventory(ITEM_TYPES.FRAGMENT_BETA);
      gs.addInventory(ITEM_TYPES.FRAGMENT_GAMMA);
      expect(gs.getFragmentCount()).toBe(3);
      expect(gs.currentObjective).toContain('All 3 Fragments Acquired');
    });

    test('item consumption: medkits and batteries', () => {
      const gs = new GameState(new EventBus());
      gs.playerHealth = 40;
      gs.flashlightBattery = 30;

      const medUsed = gs.consumeItem(ITEM_TYPES.MEDKIT);
      expect(medUsed).toBe(true);
      expect(gs.playerHealth).toBe(90);
      expect(gs.inventory.medkits).toBe(0);

      expect(gs.consumeItem(ITEM_TYPES.MEDKIT)).toBe(false);

      const batUsed = gs.consumeItem(ITEM_TYPES.BATTERY_PACK);
      expect(batUsed).toBe(true);
      expect(gs.flashlightBattery).toBe(70);
      expect(gs.inventory.batteries).toBe(0);
    });

    test('win condition triggers VICTORY when all criteria are met', () => {
      const gs = new GameState(new EventBus());
      gs.setState(GAME_STATES.PLAYING);

      expect(gs.checkWinCondition()).toBe(false);

      gs.addInventory(ITEM_TYPES.FRAGMENT_ALPHA);
      gs.addInventory(ITEM_TYPES.FRAGMENT_BETA);
      gs.addInventory(ITEM_TYPES.FRAGMENT_GAMMA);
      gs.commsRepaired = true;
      gs.generatorOnline = true;
      gs.escapeUnlocked = true;

      expect(gs.checkWinCondition()).toBe(true);
      expect(gs.getState()).toBe(GAME_STATES.VICTORY);
    });

    test('serialization and deserialization maintains data fidelity', () => {
      const gs = new GameState(new EventBus());
      gs.setState(GAME_STATES.PLAYING);
      gs.takeDamage(25);
      gs.addInventory(ITEM_TYPES.KEYCARD_BLUE);
      gs.addInventory(ITEM_TYPES.FRAGMENT_ALPHA);
      gs.gameTimer = 145.5;

      const data = gs.serialize();
      const restored = new GameState(new EventBus());
      restored.deserialize(data);

      expect(restored.getState()).toBe(GAME_STATES.PLAYING);
      expect(restored.playerHealth).toBe(75);
      expect(restored.hasKeycard(SECURITY_LEVELS.BLUE)).toBe(true);
      expect(restored.hasFragment(ITEM_TYPES.FRAGMENT_ALPHA)).toBe(true);
      expect(restored.gameTimer).toBe(145.5);
    });
  });
}
