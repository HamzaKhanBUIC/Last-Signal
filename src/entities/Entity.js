/**
 * THE LAST SIGNAL — BASE ENTITY CLASS
 * 
 * Foundational class for all dynamic and interactive game objects in AEGIS-7 Station.
 * Provides transform coordinates, bounding circle/box queries, spatial distance helpers,
 * active lifecycle flags, and tick/render interfaces.
 */

import { distance, distanceSq, angleTo } from '../utils/MathUtils.js';

let entityIdCounter = 0;

export class Entity {
  /**
   * @param {Object} [config={}]
   * @param {string} [config.id] Unique entity identifier
   * @param {string} [config.type='entity'] Entity type classification
   * @param {number} [config.x=0] World X position in pixels
   * @param {number} [config.y=0] World Y position in pixels
   * @param {number} [config.radius=16] Collision/interaction radius in pixels
   * @param {number} [config.angle=0] Facing rotation in radians
   * @param {number} [config.speed=0] Base movement speed in pixels/second
   * @param {boolean} [config.active=true] Whether entity is active and updated
   * @param {number} [config.width] Optional bounding width (defaults to radius * 2)
   * @param {number} [config.height] Optional bounding height (defaults to radius * 2)
   */
  constructor(config = {}) {
    this.id = config.id || `entity_${++entityIdCounter}`;
    this.type = config.type || 'entity';
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.radius = config.radius !== undefined ? config.radius : 16;
    this.angle = config.angle || 0;
    this.speed = config.speed || 0;
    this.active = config.active !== undefined ? config.active : true;

    this.width = config.width || this.radius * 2;
    this.height = config.height || this.radius * 2;

    // Velocity components
    this.vx = 0;
    this.vy = 0;

    // Custom metadata / tags
    this.tags = new Set(config.tags || []);
  }

  /**
   * Returns Axis-Aligned Bounding Box (AABB) centered on entity position
   * @returns {{ x: number, y: number, width: number, height: number }}
   */
  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Returns circular bounding geometry for collision checks
   * @returns {{ x: number, y: number, radius: number }}
   */
  getCircle() {
    return {
      x: this.x,
      y: this.y,
      radius: this.radius
    };
  }

  /**
   * Calculates Euclidean distance to a target point or entity
   * @param {{ x: number, y: number }|number} targetOrX
   * @param {number} [targetY]
   * @returns {number} Distance in pixels
   */
  distanceTo(targetOrX, targetY) {
    if (typeof targetOrX === 'object' && targetOrX !== null) {
      return distance(this.x, this.y, targetOrX.x, targetOrX.y);
    }
    return distance(this.x, this.y, targetOrX, targetY);
  }

  /**
   * Calculates squared Euclidean distance to avoid Math.sqrt in hot loops
   * @param {{ x: number, y: number }|number} targetOrX
   * @param {number} [targetY]
   * @returns {number} Squared distance in pixels
   */
  distanceToSq(targetOrX, targetY) {
    if (typeof targetOrX === 'object' && targetOrX !== null) {
      return distanceSq(this.x, this.y, targetOrX.x, targetOrX.y);
    }
    return distanceSq(this.x, this.y, targetOrX, targetY);
  }

  /**
   * Calculates angle in radians towards target point or entity
   * @param {{ x: number, y: number }|number} targetOrX
   * @param {number} [targetY]
   * @returns {number} Angle in radians [-PI, PI]
   */
  angleTo(targetOrX, targetY) {
    if (typeof targetOrX === 'object' && targetOrX !== null) {
      return angleTo(this.x, this.y, targetOrX.x, targetOrX.y);
    }
    return angleTo(this.x, this.y, targetOrX, targetY);
  }

  /**
   * Checks if this entity's bounding circle overlaps another entity or circle
   * @param {Entity|{ x: number, y: number, radius: number }} other
   * @returns {boolean} True if overlapping
   */
  collidesWith(other) {
    if (!other || !this.active) return false;
    const rSum = this.radius + (other.radius || 0);
    return this.distanceToSq(other) <= rSum * rSum;
  }

  /**
   * Sets position coordinates
   * @param {number} x
   * @param {number} y
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Adds a metadata tag
   * @param {string} tag
   */
  addTag(tag) {
    this.tags.add(tag);
  }

  /**
   * Checks if entity contains a metadata tag
   * @param {string} tag
   * @returns {boolean}
   */
  hasTag(tag) {
    return this.tags.has(tag);
  }

  /**
   * Base physics / logic tick
   * @param {number} dt Delta time in seconds
   * @param {...any} _args Optional context arguments
   */
  update(dt, ..._args) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /**
   * Base render stub (to be overridden by subclasses or custom renderers)
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Camera.js').Camera} [camera]
   */
  render(ctx, camera) {
    if (!this.active) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Facing direction notch
    const tipX = this.x + Math.cos(this.angle) * this.radius;
    const tipY = this.y + Math.sin(this.angle) * this.radius;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.restore();
  }
}
