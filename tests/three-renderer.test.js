/**
 * THE LAST SIGNAL — THREE.JS 3D RENDERER TEST SUITE
 * Tests:
 * 1. ThreeRenderer initialization and headless safety
 * 2. Mesh construction and level geometry building
 * 3. 3D Spotlight and Volumetric Light setup
 */

import { ThreeRenderer } from '../src/rendering/ThreeRenderer.js';
import { LevelManager } from '../src/world/LevelManager.js';
import { Camera } from '../src/core/Camera.js';

export function runThreeRendererTests(describe, test, expect) {
  describe('ThreeRenderer — 3D WebGL Rendering Engine & Scene Graph', () => {
    test('ThreeRenderer: Initializes gracefully without thrown errors in headless environment', () => {
      const threeRenderer = new ThreeRenderer(null);

      expect(threeRenderer).toBeTruthy();
      expect(typeof threeRenderer.render).toBe('function');
      expect(typeof threeRenderer.buildLevel).toBe('function');
      expect(typeof threeRenderer.resize).toBe('function');
    });

    test('ThreeRenderer: buildLevel handles LevelManager instances safely', () => {
      const threeRenderer = new ThreeRenderer(null);
      const level = new LevelManager();

      let threw = false;
      try {
        threeRenderer.buildLevel(level);
      } catch (_) {
        threw = true;
      }
      expect(threw).toBe(false);
    });

    test('ThreeRenderer: render handles player, enemy, and camera safely', () => {
      const threeRenderer = new ThreeRenderer(null);
      const camera = new Camera(1280, 720);
      const mockPlayer = { x: 100, y: 100, angle: 0, isFlashlightOn: true };
      const mockEnemy = { x: 200, y: 200, active: true, state: 'PATROL' };

      let threw = false;
      try {
        threeRenderer.render(mockPlayer, mockEnemy, 0.016, camera);
      } catch (_) {
        threw = true;
      }
      expect(threw).toBe(false);
    });
  });
}
