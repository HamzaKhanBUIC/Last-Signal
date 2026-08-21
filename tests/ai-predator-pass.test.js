/**
 * THE LAST SIGNAL — PREDATOR AI V2.0 TEST SUITE
 * Tests:
 * 1. Predictive velocity lead calculation in chase mode
 * 2. Double-back search scanning towards last known player position
 * 3. EMP stun lifecycle and sensory recovery
 */

import { EnemyAI } from '../src/entities/EnemyAI.js';
import { EventBus } from '../src/core/EventBus.js';
import { AI_STATES } from '../src/utils/Constants.js';

export function runAIPredatorPassTests(describe, test, expect) {
  describe('Predator AI V2.0 — Predictive Hunting, Double-Back Scans & Stun Recovery', () => {
    test('EnemyAI: Predicts player trajectory lead position during CHASE mode', () => {
      const eventBus = new EventBus();
      const enemy = new EnemyAI({ x: 100, y: 100, eventBus, waypoints: [{ x: 100, y: 100 }] });

      const mockPlayer = {
        x: 300,
        y: 300,
        vx: 140, // moving right
        vy: 0,
        health: 100,
        isFlashlightOn: true,
        stance: 'WALKING'
      };

      enemy.setState(AI_STATES.CHASE);
      enemy.repathTimer = 0; // Force immediate repath
      enemy.updateChase(0.016, mockPlayer, null, null);

      // Repath target should lead the player rightward
      expect(enemy.currentPath.length > 0).toBe(true);
      const target = enemy.currentPath[0];
      expect(target.x > mockPlayer.x).toBe(true);
    });

    test('EnemyAI: Performs 180-degree double-back scan during SEARCH mode', () => {
      const eventBus = new EventBus();
      const enemy = new EnemyAI({ x: 200, y: 200, eventBus, waypoints: [{ x: 200, y: 200 }] });

      enemy.lastKnownPlayerPos = { x: 100, y: 200 }; // Player was to the west
      enemy.setState('SEARCH');
      enemy.searchTimer = 2.5; // Trigger double-back window

      enemy.updateSearch(0.016, null, null);

      // AI angle should face directly towards last known player position (west: Math.PI rad)
      expect(Math.abs(enemy.angle - Math.PI) < 0.05).toBe(true);
    });

    test('EnemyAI: Recovers sensory functions after EMP shockwave stun duration expires', () => {
      const eventBus = new EventBus();
      const enemy = new EnemyAI({ x: 200, y: 200, eventBus, waypoints: [{ x: 200, y: 200 }] });

      expect(enemy.isStunned).toBe(false);

      // Apply EMP Stun (4.5s)
      enemy.stun(4.5);
      expect(enemy.isStunned).toBe(true);
      expect(enemy.stunTimer).toBe(4.5);

      // Advance time past stun duration
      enemy.update(5.0, { x: 0, y: 0, health: 100 }, null, null);
      expect(enemy.isStunned).toBe(false);
    });
  });
}
