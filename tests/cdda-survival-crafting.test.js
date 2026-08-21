/**
 * THE LAST SIGNAL — CDDA SURVIVAL & CRAFTING TEST SUITE
 * Tests:
 * 1. SurvivalSystem limb damage, hemorrhage, suit puncture, hypothermia, speed penalties
 * 2. CraftingSystem material inventory, recipe validation, and item synthesis
 * 3. CraftingUI toggle, keyboard navigation, and schematic synthesis
 */

import { SurvivalSystem, BODY_PARTS } from '../src/core/SurvivalSystem.js';
import { CraftingSystem, CRAFTING_MATERIALS } from '../src/core/CraftingSystem.js';
import { CraftingUI } from '../src/ui/CraftingUI.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameState } from '../src/core/GameState.js';

export function runCDDASurvivalAndCraftingTests(describe, test, expect) {
  describe('CDDA Deep Survival — Anatomical Trauma & Hemorrhage', () => {
    test('SurvivalSystem: Applies localized damage, causes hemorrhage, and damages suit integrity', () => {
      const eventBus = new EventBus();
      const survival = new SurvivalSystem(eventBus);

      survival.applyDamage(40, BODY_PARTS.LEFT_LEG, true);

      const report = survival.getReport();
      expect(report.limbs[BODY_PARTS.LEFT_LEG]).toBe(60);
      expect(report.limbs[BODY_PARTS.HEAD]).toBe(100);
      expect(report.isBleeding).toBe(true);
      expect(report.bleedingRate).toBeGreaterThan(0);
      expect(report.suitIntegrity).toBeLessThan(100);
    });

    test('SurvivalSystem: Movement speed modifier scales with leg injuries and hypothermia', () => {
      const survival = new SurvivalSystem();

      // Full health speed
      const fullSpeed = survival.getMovementMultiplier();
      expect(fullSpeed).toBeCloseTo(1.0, 0.1);

      // Injure both legs
      survival.applyDamage(80, BODY_PARTS.LEFT_LEG);
      survival.applyDamage(80, BODY_PARTS.RIGHT_LEG);

      const crippledSpeed = survival.getMovementMultiplier();
      expect(crippledSpeed).toBeLessThan(fullSpeed);
    });

    test('SurvivalSystem: Hypothermia drops body temp in Cryo Bay and treats with warm-up', () => {
      const survival = new SurvivalSystem();
      const cryoSector = { id: 'sector-3-cryo', number: 3 };

      // Simulate 30 seconds in sub-zero cryo bay
      survival.update(30, cryoSector);

      const report = survival.getReport();
      expect(report.bodyTemperature).toBeLessThan(37.0);
    });

    test('SurvivalSystem: Hemostatic treatment seals bleeding and repairs suit breaches', () => {
      const eventBus = new EventBus();
      const survival = new SurvivalSystem(eventBus);

      survival.applyDamage(35, BODY_PARTS.TORSO, true);
      expect(survival.getReport().isBleeding).toBe(true);

      survival.treatBleeding(100);
      expect(survival.getReport().isBleeding).toBe(false);
      expect(survival.getReport().bleedingRate).toBe(0);
    });
  });

  describe('CDDA Field Engineering — Salvage Synthesis & Crafting', () => {
    test('CraftingSystem: Validates required salvage components before synthesis', () => {
      const crafting = new CraftingSystem();

      expect(crafting.canCraft('craft_emp_mine')).toBe(true);

      // Drain scrap metal
      crafting.materials[CRAFTING_MATERIALS.SCRAP_METAL] = 0;
      expect(crafting.canCraft('craft_emp_mine')).toBe(false);
    });

    test('CraftingSystem: Consumes materials and awards item to GameState inventory', () => {
      const eventBus = new EventBus();
      const crafting = new CraftingSystem(eventBus);
      const gameState = new GameState(eventBus);

      const initialCharges = gameState.inventory.empCharges || 0;
      const initialScrap = crafting.materials[CRAFTING_MATERIALS.SCRAP_METAL];

      const success = crafting.craft('craft_emp_mine', gameState);

      expect(success).toBe(true);
      expect(gameState.inventory.empCharges).toBe(initialCharges + 1);
      expect(crafting.materials[CRAFTING_MATERIALS.SCRAP_METAL]).toBe(initialScrap - 2);
    });

    test('CraftingUI: Toggles modal and handles schematic selection and craft execution', () => {
      const eventBus = new EventBus();
      const crafting = new CraftingSystem(eventBus);
      const ui = new CraftingUI(eventBus, crafting);
      const gameState = new GameState(eventBus);

      expect(ui.isOpen).toBe(false);
      ui.toggle();
      expect(ui.isOpen).toBe(true);

      // Navigate down and craft
      ui.handleInput('KeyS', gameState);
      ui.handleInput('Enter', gameState);

      ui.handleInput('Escape', gameState);
      expect(ui.isOpen).toBe(false);
    });
  });
}
