/**
 * THE LAST SIGNAL — 2D CAMERA SYSTEM
 * Smooth lerp target tracking, trauma-based screen shake, zoom scaling,
 * viewport world-bounds clamping, and coordinate projection.
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CAMERA_SMOOTHING,
  CAMERA_DEFAULT_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_MAX_ZOOM,
  CAMERA_MAX_SHAKE_OFFSET
} from '../utils/Constants.js';
import { clamp, lerp } from '../utils/MathUtils.js';

export class Camera {
  /**
   * @param {number} [viewportWidth=CANVAS_WIDTH]
   * @param {number} [viewportHeight=CANVAS_HEIGHT]
   */
  constructor(viewportWidth = CANVAS_WIDTH, viewportHeight = CANVAS_HEIGHT) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    // World position (center of camera view)
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;

    // Follow target reference (e.g. Player)
    /** @type {{x: number, y: number}|null} */
    this.target = null;

    // Motion parameters
    this.smoothing = CAMERA_SMOOTHING; // Position lerp factor (0 = instant, 1 = sluggish)

    // Zoom factors
    this.zoom = CAMERA_DEFAULT_ZOOM;
    this.targetZoom = CAMERA_DEFAULT_ZOOM;
    this.zoomSmoothing = 0.08;

    // World Bounds
    this.bounds = {
      minX: 0,
      minY: 0,
      maxX: Infinity,
      maxY: Infinity,
      enabled: false
    };

    // Trauma & Screen Shake System
    this.trauma = 0;           // Normalized [0, 1]
    this.traumaDecay = 1.6;    // Trauma reduction per second
    this.shakeTime = 0;        // Internal accumulator for noise synthesis
    this.shakeOffset = {
      x: 0,
      y: 0,
      rotation: 0
    };
    this.maxShakeOffset = CAMERA_MAX_SHAKE_OFFSET;
    this.maxShakeAngle = 0.04; // Max rotation in radians (~2.3 degrees)
  }

  /**
   * Sets the viewport canvas dimensions.
   * @param {number} width
   * @param {number} height
   */
  setViewport(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /**
   * Sets target entity to smoothly track.
   * @param {{x: number, y: number}|null} entity
   */
  follow(entity) {
    this.target = entity;
    if (entity) {
      this.targetX = entity.x;
      this.targetY = entity.y;
    }
  }

  /**
   * Instantly snaps camera position to target/coordinates without smoothing.
   * @param {number} [x=null]
   * @param {number} [y=null]
   */
  snapTo(x = null, y = null) {
    if (x !== null && y !== null) {
      this.x = x;
      this.y = y;
      this.targetX = x;
      this.targetY = y;
    } else if (this.target) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.targetX = this.target.x;
      this.targetY = this.target.y;
    }
    this.clampToBounds();
  }

  /**
   * Sets world bounding box to constrain camera view.
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   */
  setWorldBounds(minX, minY, maxX, maxY) {
    this.bounds.minX = minX;
    this.bounds.minY = minY;
    this.bounds.maxX = maxX;
    this.bounds.maxY = maxY;
    this.bounds.enabled = true;
    this.clampToBounds();
  }

  /**
   * Disables world bounds constraint.
   */
  clearWorldBounds() {
    this.bounds.enabled = false;
  }

  /**
   * Sets desired zoom level.
   * @param {number} level Target zoom [0.5, 2.5]
   * @param {boolean} [instant=false]
   */
  setZoom(level, instant = false) {
    const target = clamp(level, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
    this.targetZoom = target;
    if (instant) {
      this.zoom = target;
    }
  }

  /**
   * Adds trauma for directional screen shake.
   * @param {number} intensity Normalized trauma [0, 1] or raw trauma points
   * @param {number} [duration=0] Optional duration in seconds (adjusts decay)
   */
  shake(intensity, duration = 0) {
    const addedTrauma = Math.min(1.0, intensity > 1 ? intensity / 25 : intensity);
    this.trauma = clamp(this.trauma + addedTrauma, 0, 1.0);

    if (duration > 0) {
      this.traumaDecay = Math.max(0.5, 1.0 / duration);
    }
  }

  /**
   * Clamps current camera center to keep viewport within defined world bounds.
   */
  clampToBounds() {
    if (!this.bounds.enabled) return;

    const halfW = (this.viewportWidth * 0.5) / this.zoom;
    const halfH = (this.viewportHeight * 0.5) / this.zoom;

    const minX = this.bounds.minX + halfW;
    const maxX = this.bounds.maxX - halfW;
    const minY = this.bounds.minY + halfH;
    const maxY = this.bounds.maxY - halfH;

    if (minX <= maxX) {
      this.x = clamp(this.x, minX, maxX);
    } else {
      this.x = (this.bounds.minX + this.bounds.maxX) * 0.5;
    }

    if (minY <= maxY) {
      this.y = clamp(this.y, minY, maxY);
    } else {
      this.y = (this.bounds.minY + this.bounds.maxY) * 0.5;
    }
  }

  // ==========================================
  // COORDINATE TRANSFORMATIONS
  // ==========================================

  /**
   * Converts world space coordinates to screen viewport coordinates.
   * @param {number} worldX
   * @param {number} worldY
   * @returns {{x: number, y: number}} Screen coordinates
   */
  worldToScreen(worldX, worldY) {
    const camX = this.x + this.shakeOffset.x;
    const camY = this.y + this.shakeOffset.y;

    const screenX = (worldX - camX) * this.zoom + this.viewportWidth * 0.5;
    const screenY = (worldY - camY) * this.zoom + this.viewportHeight * 0.5;

    return { x: screenX, y: screenY };
  }

  /**
   * Converts screen viewport coordinates to game world space coordinates.
   * @param {number} screenX
   * @param {number} screenY
   * @returns {{x: number, y: number}} World coordinates
   */
  screenToWorld(screenX, screenY) {
    const camX = this.x + this.shakeOffset.x;
    const camY = this.y + this.shakeOffset.y;

    const worldX = (screenX - this.viewportWidth * 0.5) / this.zoom + camX;
    const worldY = (screenY - this.viewportHeight * 0.5) / this.zoom + camY;

    return { x: worldX, y: worldY };
  }

  /**
   * Returns current visible world rectangle (useful for frustum culling).
   * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
   */
  getViewportBounds() {
    const halfW = (this.viewportWidth * 0.5) / this.zoom;
    const halfH = (this.viewportHeight * 0.5) / this.zoom;
    const camX = this.x + this.shakeOffset.x;
    const camY = this.y + this.shakeOffset.y;

    return {
      left: camX - halfW,
      top: camY - halfH,
      right: camX + halfW,
      bottom: camY + halfH,
      width: halfW * 2,
      height: halfH * 2
    };
  }

  /**
   * Checks if an axis-aligned bounding box intersects the current camera viewport.
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @returns {boolean}
   */
  isRectInView(x, y, width, height) {
    const bounds = this.getViewportBounds();
    return (
      x + width >= bounds.left &&
      x <= bounds.right &&
      y + height >= bounds.top &&
      y <= bounds.bottom
    );
  }

  /**
   * Checks if a bounding circle intersects the current camera viewport.
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @returns {boolean}
   */
  isCircleInView(x, y, radius) {
    const bounds = this.getViewportBounds();
    return (
      x + radius >= bounds.left &&
      x - radius <= bounds.right &&
      y + radius >= bounds.top &&
      y - radius <= bounds.bottom
    );
  }

  // ==========================================
  // RENDER TRANSFORM HELPERS
  // ==========================================

  /**
   * Applies camera translation, zoom, and rotation onto 2D Canvas context.
   * @param {CanvasRenderingContext2D} ctx
   */
  apply(ctx) {
    ctx.save();
    ctx.translate(this.viewportWidth * 0.5, this.viewportHeight * 0.5);
    ctx.scale(this.zoom, this.zoom);

    if (this.shakeOffset.rotation !== 0) {
      ctx.rotate(this.shakeOffset.rotation);
    }

    const camX = this.x + this.shakeOffset.x;
    const camY = this.y + this.shakeOffset.y;
    ctx.translate(-camX, -camY);
  }

  /**
   * Restores Canvas context transform.
   * @param {CanvasRenderingContext2D} ctx
   */
  restore(ctx) {
    ctx.restore();
  }

  // ==========================================
  // UPDATE TICK
  // ==========================================

  /**
   * Updates camera tracking, zoom lerp, and trauma shake decay.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    // 1. Follow target if assigned
    if (this.target) {
      this.targetX = this.target.x;
      this.targetY = this.target.y;
    }

    // 2. Smoothly lerp towards target (framerate-independent lerp)
    const factor = 1 - Math.exp(-this.smoothing * 60 * dt);
    this.x = lerp(this.x, this.targetX, factor);
    this.y = lerp(this.y, this.targetY, factor);

    // 3. Zoom interpolation
    if (Math.abs(this.zoom - this.targetZoom) > 0.001) {
      const zoomFactor = 1 - Math.exp(-this.zoomSmoothing * 60 * dt);
      this.zoom = lerp(this.zoom, this.targetZoom, zoomFactor);
    } else {
      this.zoom = this.targetZoom;
    }

    // 4. Clamping
    this.clampToBounds();

    // 5. Trauma & Screen Shake Calculation (Trauma^2 provides natural falloff)
    if (this.trauma > 0) {
      // Decay trauma over time
      this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);

      if (this.trauma > 0) {
        this.shakeTime += dt * 35; // Shake frequency
        const shakePower = this.trauma * this.trauma; // Non-linear response

        // Multi-frequency harmonic shake
        const sX = Math.sin(this.shakeTime * 1.1) + 0.5 * Math.sin(this.shakeTime * 2.3);
        const sY = Math.cos(this.shakeTime * 1.3) + 0.5 * Math.cos(this.shakeTime * 2.7);
        const sRot = Math.sin(this.shakeTime * 0.9);

        this.shakeOffset.x = sX * this.maxShakeOffset * shakePower;
        this.shakeOffset.y = sY * this.maxShakeOffset * shakePower;
        this.shakeOffset.rotation = sRot * this.maxShakeAngle * shakePower;
      } else {
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
        this.shakeOffset.rotation = 0;
      }
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
      this.shakeOffset.rotation = 0;
    }
  }
}
