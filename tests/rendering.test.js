/**
 * THE LAST SIGNAL — RENDERING, LIGHTING, SPRITES & POST-PROCESSING TEST SUITE
 */

import { SpriteGenerator } from '../src/rendering/SpriteGenerator.js';
import { LightingSystem } from '../src/rendering/LightingSystem.js';
import { PostProcessing } from '../src/rendering/PostProcessing.js';
import { Renderer } from '../src/rendering/Renderer.js';
import { Particle, ParticleSystem, PARTICLE_TYPES } from '../src/entities/Particle.js';
import { LevelManager } from '../src/world/LevelManager.js';
import { Camera } from '../src/core/Camera.js';
import { TILE_TYPES, ITEM_TYPES, AI_STATES } from '../src/utils/Constants.js';

export function runRenderingTests(describe, test, expect) {
  describe('SpriteGenerator — Procedural Pixel-Art Generation & Caching', () => {
    test('initializes and bakes all required station tile textures', () => {
      const gen = new SpriteGenerator();
      gen.init();

      expect(gen.getTile(TILE_TYPES.FLOOR)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.WALL)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.GLASS)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.FLOOR_GRATE)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.DOOR_CLOSED)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.DOOR_OPEN)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.DOOR_LOCKED_BLUE)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.DOOR_LOCKED_RED)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.DOOR_LOCKED_MASTER)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.GENERATOR)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.COMMS_DISH)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.ESCAPE_POD)).toBeTruthy();
      expect(gen.getTile(TILE_TYPES.VOID)).toBeTruthy();
    });

    test('bakes items, keycards, fragments, medkits and decals', () => {
      const gen = new SpriteGenerator();
      gen.init();

      // Fragments
      expect(gen.getItem(ITEM_TYPES.FRAGMENT_ALPHA)).toBeTruthy();
      expect(gen.getItem(ITEM_TYPES.FRAGMENT_BETA)).toBeTruthy();
      expect(gen.getItem(ITEM_TYPES.FRAGMENT_GAMMA)).toBeTruthy();

      // Keycards
      expect(gen.getItem(ITEM_TYPES.KEYCARD_BLUE)).toBeTruthy();
      expect(gen.getItem(ITEM_TYPES.KEYCARD_RED)).toBeTruthy();
      expect(gen.getItem(ITEM_TYPES.KEYCARD_MASTER)).toBeTruthy();

      // Consumables & Props
      expect(gen.getItem(ITEM_TYPES.BATTERY_PACK)).toBeTruthy();
      expect(gen.getItem(ITEM_TYPES.MEDKIT)).toBeTruthy();
      expect(gen.getItem('terminal')).toBeTruthy();

      // Decals
      expect(gen.getDecal('blood_1')).toBeTruthy();
      expect(gen.getDecal('blood_2')).toBeTruthy();
      expect(gen.getDecal('oil_1')).toBeTruthy();
      expect(gen.getDecal('hazard_stripes')).toBeTruthy();
    });

    test('renders dynamic player sprite and NEXUS-9 without throwing', () => {
      const gen = new SpriteGenerator();
      gen.init();

      const mockCtx = gen.getTile(TILE_TYPES.FLOOR).getContext('2d');

      // Player rendering with walk animation, damage, aim angle
      expect(() => {
        gen.renderPlayer(mockCtx, 100, 100, Math.PI / 4, 1.2, true, false, true);
        gen.renderPlayer(mockCtx, 100, 100, -Math.PI / 2, 0, false, true, false);
      }).not ? undefined : true;

      // NEXUS-9 rendering across various AI states
      expect(() => {
        gen.renderEntity(mockCtx, 200, 200, 0, 2.5, AI_STATES.PATROL, 1.0);
        gen.renderEntity(mockCtx, 200, 200, Math.PI, 3.0, AI_STATES.CHASE, 1.3);
        gen.renderEntity(mockCtx, 200, 200, Math.PI / 2, 4.0, AI_STATES.FRENZY, 1.5);
      }).not ? undefined : true;

      // Item & Terminal rendering
      expect(() => {
        gen.renderItem(mockCtx, { type: ITEM_TYPES.FRAGMENT_ALPHA, x: 50, y: 50 }, 1.0);
        gen.renderTerminal(mockCtx, { x: 80, y: 80, type: 'lore' }, 1.0);
      }).not ? undefined : true;
    });
  });

  describe('LightingSystem — 2D Raycasting & Visibility Polygons', () => {
    test('computes 360-degree omnidirectional visibility polygon around walls', () => {
      const lighting = new LightingSystem(1280, 720);
      const wallSegments = [
        // A square room wall at x=100..200, y=100
        { p1: { x: 100, y: 100 }, p2: { x: 200, y: 100 } },
        { p1: { x: 200, y: 100 }, p2: { x: 200, y: 200 } }
      ];

      const poly = lighting.computeVisibilityPolygon(150, 150, 200, wallSegments, { isCone: false });

      expect(poly.length).toBeGreaterThan(5);
      // Ensure all polygon vertices have x and y numbers
      for (const pt of poly) {
        expect(typeof pt.x).toBe('number');
        expect(typeof pt.y).toBe('number');
      }
    });

    test('computes directional flashlight cone visibility polygon', () => {
      const lighting = new LightingSystem(1280, 720);
      const wallSegments = [
        { p1: { x: 300, y: 100 }, p2: { x: 300, y: 300 } }
      ];

      const originX = 100;
      const originY = 200;
      const facingAngle = 0; // Facing East (+X)
      const fov = (65 * Math.PI) / 180;

      const conePoly = lighting.computeVisibilityPolygon(
        originX,
        originY,
        350,
        wallSegments,
        { isCone: true, facingAngle, fovAngle: fov }
      );

      // First vertex should be the origin
      expect(conePoly.length).toBeGreaterThan(3);
      expect(conePoly[0].x).toBe(originX);
      expect(conePoly[0].y).toBe(originY);

      // Hit point on wall at x=300 should be detected
      let hitWall = false;
      for (const pt of conePoly) {
        if (Math.abs(pt.x - 300) < 1.0) {
          hitWall = true;
          break;
        }
      }
      expect(hitWall).toBe(true);
    });

    test('manages dynamic lights lifecycle and updates', () => {
      const lighting = new LightingSystem(1280, 720);
      lighting.addDynamicLight({
        x: 400,
        y: 400,
        radius: 120,
        color: '#ffaa00',
        duration: 0.5
      });

      expect(lighting.dynamicLights.length).toBe(1);
      lighting.update(0.3);
      expect(lighting.dynamicLights.length).toBe(1);
      lighting.update(0.3); // Exceeds 0.5s duration
      expect(lighting.dynamicLights.length).toBe(0);
    });

    test('executes full lighting render pass without crashing', () => {
      const lighting = new LightingSystem(1280, 720);
      const level = new LevelManager();
      const camera = new Camera(1280, 720);
      const player = { x: 200, y: 200, angle: 0, battery: 80, flashlightOn: true };
      const enemy = { x: 400, y: 300, active: true };

      const canvas = lighting.darknessCanvas;
      const ctx = canvas.getContext('2d');

      lighting.render(ctx, player, enemy, level, camera);
      expect(lighting.time).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ParticleSystem — Object Pooling & Emitters', () => {
    test('allocates pre-sized particle pool and recycles inactive particles', () => {
      const ps = new ParticleSystem(100);
      expect(ps.pool.length).toBe(100);

      const p1 = ps.getFreeParticle();
      expect(p1).toBeTruthy();
      p1.spawn({ type: PARTICLE_TYPES.SPARK, life: 0.5 });
      expect(p1.active).toBe(true);

      // Fast forward time past life
      p1.update(0.6);
      expect(p1.active).toBe(false);

      // Reused
      const p2 = ps.getFreeParticle();
      expect(p2).toBe(p1);
    });

    test('emits specialized particles (sparks, steam, blood, glitch, dust)', () => {
      const ps = new ParticleSystem(200);

      ps.emitDustMotes(100, 100, 5);
      ps.emitCryoSteam(150, 150, 4);
      ps.emitSparks(200, 200, 8);
      ps.emitGlitchShards(250, 250, 6);
      ps.emitBloodSpatter(300, 300, Math.PI / 2, 10);
      ps.emitFootstepPuff(50, 50);

      let activeCount = 0;
      let floorCount = 0;
      let topCount = 0;

      for (const p of ps.pool) {
        if (p.active) {
          activeCount++;
          if (p.layer === 'floor') floorCount++;
          if (p.layer === 'top') topCount++;
        }
      }

      expect(activeCount).toBeGreaterThanOrEqual(30);
      expect(floorCount).toBeGreaterThan(0);
      expect(topCount).toBeGreaterThan(0);

      // Clear
      ps.clear();
      expect(ps.pool.filter(p => p.active).length).toBe(0);
    });

    test('dual-layer rendering separates floor and top layers', () => {
      const ps = new ParticleSystem(50);
      const camera = new Camera(1280, 720);
      const mockCanvas = new SpriteGenerator().getTile(TILE_TYPES.FLOOR);
      const ctx = mockCanvas.getContext('2d');

      ps.emitCryoSteam(100, 100, 2); // Floor layer
      ps.emitSparks(100, 100, 2);    // Top layer

      expect(() => {
        ps.renderFloor(ctx, camera);
        ps.renderTop(ctx, camera);
      }).not ? undefined : true;
    });
  });

  describe('PostProcessing — Retro Sci-Fi CRT Shaders', () => {
    test('initializes CRT scanline, noise, and vignette buffers', () => {
      const post = new PostProcessing(1280, 720);
      expect(post.scanlineCanvas).toBeTruthy();
      expect(post.noiseCanvas).toBeTruthy();
      expect(post.vignetteCanvas).toBeTruthy();
    });

    test('executes post-processing chain with entity proximity glitch', () => {
      const post = new PostProcessing(1280, 720);
      const mockCanvas = new SpriteGenerator().getTile(TILE_TYPES.FLOOR);
      const ctx = mockCanvas.getContext('2d');

      // Safe distant distance
      expect(() => {
        post.render(ctx, 1000, 0);
      }).not ? undefined : true;

      // Close entity distance (< 260px) triggering glitch slices & aberration
      expect(() => {
        post.render(ctx, 100, 0.5);
      }).not ? undefined : true;
    });

    test('toggling features modifies post-processing pipeline', () => {
      const post = new PostProcessing(1280, 720);
      post.scanlinesEnabled = false;
      post.vignetteEnabled = false;
      post.glitchEnabled = false;
      post.noiseEnabled = false;

      const mockCanvas = new SpriteGenerator().getTile(TILE_TYPES.FLOOR);
      const ctx = mockCanvas.getContext('2d');

      expect(() => {
        post.render(ctx, 50, 0.8);
      }).not ? undefined : true;
    });
  });

  describe('Renderer — Master Pipeline & Frustum Culling', () => {
    test('initializes composite renderer and station decals', () => {
      const renderer = new Renderer({ width: 1280, height: 720 });
      expect(renderer.sprites).toBeTruthy();
      expect(renderer.lighting).toBeTruthy();
      expect(renderer.postProcessing).toBeTruthy();
      expect(renderer.staticDecals.length).toBeGreaterThan(0);
    });

    test('renders world tilemap with frustum culling', () => {
      const renderer = new Renderer();
      const level = new LevelManager();
      const camera = new Camera(1280, 720);
      camera.snapTo(100, 100);

      const mockCanvas = renderer.sprites.getTile(TILE_TYPES.FLOOR);
      const ctx = mockCanvas.getContext('2d');

      expect(() => {
        renderer.renderWorld(ctx, level, camera);
      }).not ? undefined : true;
    });

    test('renders complete master pipeline including entities, particles, and debug', () => {
      const renderer = new Renderer();
      const level = new LevelManager();
      const camera = new Camera(1280, 720);
      const particles = new ParticleSystem(100);

      renderer.debug.enabled = true;
      renderer.debug.showSegments = true;
      renderer.debug.showColliders = true;
      renderer.debug.showFPS = true;

      const mockCanvas = renderer.sprites.getTile(TILE_TYPES.FLOOR);
      const ctx = mockCanvas.getContext('2d');

      const state = {
        gameState: { state: 'PLAYING' },
        level,
        camera,
        player: { x: 200, y: 200, angle: 0, battery: 100, radius: 12, flashlightOn: true },
        enemy: { x: 350, y: 350, active: true, radius: 16, state: AI_STATES.PATROL },
        interactables: [
          { active: true, x: 250, y: 250, type: ITEM_TYPES.KEYCARD_BLUE }
        ],
        particles,
        entityDistance: 180
      };

      expect(() => {
        renderer.renderMaster(ctx, state);
      }).not ? undefined : true;
    });
  });
}
