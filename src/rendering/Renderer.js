/**
 * THE LAST SIGNAL — MASTER RENDERING PIPELINE COMPOSITOR
 * 
 * Orchestrates the full rendering hierarchy:
 * 1. Background Void & Starfield
 * 2. Level Floor Tiles & Structures (with frustum culling)
 * 3. Environmental Floor Decals (blood, oil, hazard markers)
 * 4. Interactive Props (Terminals, doors, items)
 * 5. Entities (Player with walk cycle & flashlight, NEXUS-9 with shifting tendrils)
 * 6. High & Low Altitude Particle Systems
 * 7. 2D Raycast Dynamic Lighting & Shadow Mask
 * 8. Retro CRT Post-Processing & Scanlines
 * 9. Developer Debug Overlays
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TILE_SIZE,
  TILE_TYPES,
  COLORS
} from '../utils/Constants.js';
import { SpriteGenerator } from './SpriteGenerator.js';
import { LightingSystem } from './LightingSystem.js';
import { PostProcessing } from './PostProcessing.js';

export class Renderer {
  /**
   * @param {Object} [options]
   * @param {number} [options.width=CANVAS_WIDTH]
   * @param {number} [options.height=CANVAS_HEIGHT]
   * @param {SpriteGenerator} [options.spriteGenerator]
   * @param {LightingSystem} [options.lighting]
   * @param {PostProcessing} [options.postProcessing]
   */
  constructor(options = {}) {
    this.width = options.width || CANVAS_WIDTH;
    this.height = options.height || CANVAS_HEIGHT;

    // Subsystems
    this.sprites = options.spriteGenerator || new SpriteGenerator();
    this.lighting = options.lighting || new LightingSystem(this.width, this.height);
    this.postProcessing = options.postProcessing || new PostProcessing(this.width, this.height);

    // Initialized state
    this.sprites.init();

    // Static environmental decals placed across the station
    this.staticDecals = this.generateStationDecals();

    // Debug Overlay Flags
    this.debug = {
      enabled: false,
      showSegments: false,
      showColliders: false,
      showLightRadii: false,
      showGrid: false,
      showFPS: false
    };

    // Performance telemetry
    this.fps = 60;
    this.frameTime = 16.6;
    this.lastFrameTimestamp = performance.now ? performance.now() : Date.now();
  }

  /**
   * Resizes renderer buffers.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.lighting.resize(width, height);
    this.postProcessing.resize(width, height);
  }

  /**
   * Generates procedural station floor decals.
   * @returns {Array<{ x: number, y: number, name: string, angle?: number, scale?: number }>}
   */
  generateStationDecals() {
    const ts = TILE_SIZE;
    return [
      // Blood splatters near Security & Cryo containment breaches
      { x: 33 * ts + 16, y: 15 * ts + 16, name: 'blood_1', scale: 1.2 },
      { x: 35 * ts + 8, y: 16 * ts + 8, name: 'blood_2', scale: 1.0 },
      { x: 48 * ts + 16, y: 10 * ts + 16, name: 'blood_1', scale: 1.4 },
      { x: 55 * ts + 10, y: 16 * ts + 12, name: 'blood_2', scale: 1.1 },

      // Oil / Machine lubricant leaks near Power Reactor Substation
      { x: 48 * ts + 16, y: 46 * ts + 16, name: 'oil_1', scale: 1.3 },
      { x: 56 * ts + 16, y: 53 * ts + 16, name: 'oil_1', scale: 1.5 },
      { x: 14 * ts + 16, y: 48 * ts + 16, name: 'oil_1', scale: 1.0 },

      // Hazard stripes at security thresholds
      { x: 19 * ts, y: 15 * ts, name: 'hazard_stripes', scale: 1.0 },
      { x: 45 * ts, y: 15 * ts, name: 'hazard_stripes', scale: 1.0 },
      { x: 24 * ts, y: 33 * ts, name: 'hazard_stripes', scale: 1.0 }
    ];
  }

  /**
   * Renders the base tilemap world layer (Floor, Walls, Decals) with fast frustum culling.
   * 
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} level LevelManager instance
   * @param {Object} camera Camera instance
   */
  renderWorld(ctx, level, camera) {
    if (!level || !camera) return;

    const bounds = camera.getViewportBounds();
    const ts = level.tileSize || TILE_SIZE;

    // Viewport tile range
    const minTileX = Math.max(0, Math.floor(bounds.left / ts));
    const maxTileX = Math.min(level.width - 1, Math.floor(bounds.right / ts));
    const minTileY = Math.max(0, Math.floor(bounds.top / ts));
    const maxTileY = Math.min(level.height - 1, Math.floor(bounds.bottom / ts));

    // 1. Render Tilemap Grid
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tileType = level.getTile(tx, ty);
        const tileSprite = this.sprites.getTile(tileType);

        if (tileSprite) {
          ctx.drawImage(tileSprite, tx * ts, ty * ts, ts, ts);
        }

        // Add depth shadow beneath north walls
        if (tileType === TILE_TYPES.WALL && ty < level.height - 1) {
          const neighborBelow = level.getTile(tx, ty + 1);
          if (neighborBelow === TILE_TYPES.FLOOR || neighborBelow === TILE_TYPES.FLOOR_GRATE) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(tx * ts, (ty + 1) * ts, ts, 6);
          }
        }
      }
    }

    // 2. Render Static Floor Decals
    this.renderDecals(ctx, camera);
  }

  /**
   * Renders environmental decals.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} camera
   */
  renderDecals(ctx, camera) {
    for (let i = 0; i < this.staticDecals.length; i++) {
      const decal = this.staticDecals[i];
      if (camera.isCircleInView(decal.x, decal.y, 32)) {
        const sprite = this.sprites.getDecal(decal.name);
        if (sprite) {
          const s = sprite.width * (decal.scale || 1.0);
          ctx.drawImage(sprite, decal.x - s / 2, decal.y - s / 2, s, s);
        }
      }
    }
  }

  /**
   * Complete Master Render Compositor.
   * Renders every layer sequentially from background to post-processing and debug HUD.
   * 
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} state Game state and world context
   */
  renderMaster(ctx, state) {
    const {
      gameState,
      level,
      camera,
      player,
      enemy,
      interactables,
      particles,
      entityDistance
    } = state;

    // Track frame timing
    const now = performance.now ? performance.now() : Date.now();
    this.frameTime = now - this.lastFrameTimestamp;
    this.lastFrameTimestamp = now;
    this.fps = Math.round(1000 / Math.max(1, this.frameTime));

    // 1. Clear Canvas Background
    ctx.fillStyle = COLORS.BG_DARK || '#05080c';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Apply Camera World Transform
    camera.apply(ctx);

    // 3. Render World Tiles & Decals
    this.renderWorld(ctx, level, camera);

    // 4. Render Floor Particles (steam, dust, footstep puffs)
    particles?.renderFloor?.(ctx, camera);

    // 5. Render Interactables (pickups, terminals, doors)
    if (interactables) {
      const time = this.lighting.time;
      for (let i = 0; i < interactables.length; i++) {
        const item = interactables[i];
        if (item.active && camera.isRectInView(item.x - 32, item.y - 32, 64, 64)) {
          if (item.type === 'terminal') {
            this.sprites.renderTerminal(ctx, item, time);
          } else {
            this.sprites.renderItem(ctx, item, time);
          }
        }
      }
    }

    // 6. Render Entities (Player & NEXUS-9)
    if (player) {
      this.sprites.renderPlayer(
        ctx,
        player.x,
        player.y,
        player.angle || 0,
        player.animTime || 0,
        player.isMoving || false,
        player.isDamaged || false,
        player.flashlightOn !== false
      );
    }

    if (enemy && enemy.active) {
      this.sprites.renderEntity(
        ctx,
        enemy.x,
        enemy.y,
        enemy.angle || 0,
        this.lighting.time,
        enemy.state,
        enemy.pulseFactor || 1.0
      );
    }

    // 7. Render Top Particles (sparks, blood drops, glitch voxel shards)
    particles?.renderTop?.(ctx, camera);

    // 8. Debug Overlays in World Space (Colliders, Segments, Rays)
    if (this.debug.enabled) {
      this.renderWorldDebug(ctx, level, player, enemy);
    }

    // Restore camera transform
    camera.restore(ctx);

    // 9. Dynamic 2D Lighting & Shadow Mask Pass
    this.lighting.render(ctx, player, enemy, level, camera);

    // 10. Retro CRT Post-Processing Pass (Scanlines, chromatic glitch, vignette)
    this.postProcessing.render(ctx, entityDistance || 9999, camera.trauma || 0);

    // 11. Debug Overlays in Screen Space (FPS, Stats)
    if (this.debug.enabled && this.debug.showFPS) {
      this.renderScreenDebug(ctx);
    }
  }

  /**
   * Renders developer physics and geometry debug visualizations.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} level
   * @param {Object} player
   * @param {Object} enemy
   */
  renderWorldDebug(ctx, level, player, enemy) {
    // 1. Wall Line Segments
    if (this.debug.showSegments && level.getWallSegments) {
      const segs = level.getWallSegments();
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 1.5;
      for (const seg of segs) {
        ctx.beginPath();
        ctx.moveTo(seg.p1.x, seg.p1.y);
        ctx.lineTo(seg.p2.x, seg.p2.y);
        ctx.stroke();

        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(seg.p1.x - 2, seg.p1.y - 2, 4, 4);
        ctx.fillRect(seg.p2.x - 2, seg.p2.y - 2, 4, 4);
      }
    }

    // 2. Entity Collision Bounding Circles
    if (this.debug.showColliders) {
      if (player) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius || 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (enemy && enemy.active) {
        ctx.strokeStyle = '#ff2244';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius || 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /**
   * Renders on-screen performance debug stats.
   * @param {CanvasRenderingContext2D} ctx
   */
  renderScreenDebug(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(10, 10, 190, 70);
    ctx.strokeStyle = '#00ff66';
    ctx.strokeRect(10, 10, 190, 70);

    ctx.fillStyle = '#00ff66';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${this.fps} (${this.frameTime.toFixed(1)}ms)`, 20, 30);
    ctx.fillText(`Dynamic Lights: ${this.lighting.dynamicLights.length}`, 20, 50);
    ctx.fillText(`PostFX: CRT / Aberration ON`, 20, 68);

    ctx.restore();
  }
}
