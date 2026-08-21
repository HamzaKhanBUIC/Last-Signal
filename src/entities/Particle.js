/**
 * THE LAST SIGNAL — HIGH-PERFORMANCE 2D PARTICLE SYSTEM
 * 
 * Manages atmospheric dust motes, cryogenic fog/steam, electrical sparks,
 * digital glitch voxel shards, blood impacts, and footstep puffs.
 * Features zero-allocation object pooling and dual-layer floor/top rendering.
 */

import { randomRange, randomInt, clamp } from '../utils/MathUtils.js';

export const PARTICLE_TYPES = Object.freeze({
  DUST: 'DUST',
  STEAM: 'STEAM',
  SPARK: 'SPARK',
  GLITCH: 'GLITCH',
  BLOOD: 'BLOOD',
  PUFF: 'PUFF'
});

export class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.type = PARTICLE_TYPES.DUST;
    this.layer = 'top'; // 'floor' or 'top'
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 2;
    this.startSize = 2;
    this.endSize = 0;
    this.color = '#ffffff';
    this.alpha = 1.0;
    this.startAlpha = 1.0;
    this.life = 1.0;
    this.maxLife = 1.0;
    this.friction = 0.96;
    this.gravity = 0;
    this.rotation = 0;
    this.vRot = 0;
    this.shape = 'circle'; // 'circle', 'rect', 'line'
  }

  /**
   * Initializes a particle instance with specific parameters.
   * @param {Object} config
   */
  spawn(config) {
    this.active = true;
    this.type = config.type || PARTICLE_TYPES.DUST;
    this.layer = config.layer || (config.type === PARTICLE_TYPES.STEAM || config.type === PARTICLE_TYPES.DUST ? 'floor' : 'top');
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.vx = config.vx || 0;
    this.vy = config.vy || 0;
    this.startSize = config.size !== undefined ? config.size : 2;
    this.size = this.startSize;
    this.endSize = config.endSize !== undefined ? config.endSize : 0;
    this.color = config.color || '#ffffff';
    this.startAlpha = config.alpha !== undefined ? config.alpha : 1.0;
    this.alpha = this.startAlpha;
    this.maxLife = config.life || 1.0;
    this.life = this.maxLife;
    this.friction = config.friction !== undefined ? config.friction : 0.98;
    this.gravity = config.gravity || 0;
    this.rotation = config.rotation || 0;
    this.vRot = config.vRot || 0;
    this.shape = config.shape || 'circle';
  }

  /**
   * Updates particle physics and lifespan.
   * @param {number} dt Delta time in seconds
   * @returns {boolean} True if particle is still alive
   */
  update(dt) {
    if (!this.active) return false;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return false;
    }

    const progress = 1 - (this.life / this.maxLife); // [0, 1]

    // Velocity & friction
    this.vx *= Math.pow(this.friction, dt * 60);
    this.vy *= Math.pow(this.friction, dt * 60);
    this.vy += this.gravity * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Rotation
    this.rotation += this.vRot * dt;

    // Interpolate size & alpha
    this.size = this.startSize + (this.endSize - this.startSize) * progress;
    this.alpha = this.startAlpha * (1 - progress);

    return true;
  }

  /**
   * Renders single particle.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.active || this.alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = clamp(this.alpha, 0, 1);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    if (this.shape === 'rect') {
      ctx.translate(this.x, this.y);
      if (this.rotation !== 0) ctx.rotate(this.rotation);
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else if (this.shape === 'line') {
      ctx.lineWidth = Math.max(1, this.size);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.04, this.y - this.vy * 0.04);
      ctx.stroke();
    } else {
      // Circle
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class ParticleSystem {
  /**
   * @param {number} [maxParticles=600] Maximum particle pool capacity
   */
  constructor(maxParticles = 600) {
    this.maxParticles = maxParticles;
    this.pool = new Array(maxParticles);
    for (let i = 0; i < maxParticles; i++) {
      this.pool[i] = new Particle();
    }
  }

  /**
   * Obtains an inactive particle from the object pool.
   * @returns {Particle|null}
   */
  getFreeParticle() {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null; // Pool saturated
  }

  /**
   * Emits floating atmospheric dust motes.
   * @param {number} x
   * @param {number} y
   * @param {number} [count=5]
   */
  emitDustMotes(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      p.spawn({
        type: PARTICLE_TYPES.DUST,
        layer: 'floor',
        x: x + randomRange(-40, 40),
        y: y + randomRange(-40, 40),
        vx: randomRange(-8, 8),
        vy: randomRange(-8, 8),
        size: randomRange(1, 2.5),
        endSize: randomRange(0.5, 1.5),
        color: '#88a0c0',
        alpha: randomRange(0.15, 0.4),
        life: randomRange(2.5, 5.0),
        friction: 0.99,
        shape: 'circle'
      });
    }
  }

  /**
   * Emits billowing cold cryogenic fog/steam.
   * @param {number} x
   * @param {number} y
   * @param {number} [count=4]
   * @param {Object} [options]
   */
  emitCryoSteam(x, y, count = 4, options = {}) {
    const dirX = options.dirX || 0;
    const dirY = options.dirY || -1;

    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      p.spawn({
        type: PARTICLE_TYPES.STEAM,
        layer: 'floor',
        x: x + randomRange(-8, 8),
        y: y + randomRange(-8, 8),
        vx: dirX * randomRange(20, 45) + randomRange(-15, 15),
        vy: dirY * randomRange(20, 45) + randomRange(-15, 15),
        size: randomRange(4, 8),
        endSize: randomRange(14, 22),
        color: options.color || '#bae6fd',
        alpha: randomRange(0.2, 0.45),
        life: randomRange(1.2, 2.2),
        friction: 0.95,
        shape: 'circle'
      });
    }
  }

  /**
   * Emits high-velocity electrical sparks from broken consoles or generator.
   * @param {number} x
   * @param {number} y
   * @param {number} [count=8]
   * @param {Object} [options]
   */
  emitSparks(x, y, count = 8, options = {}) {
    const baseColor = options.color || '#fbbf24';

    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      const ang = randomRange(0, Math.PI * 2);
      const spd = randomRange(60, 180);

      p.spawn({
        type: PARTICLE_TYPES.SPARK,
        layer: 'top',
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: randomRange(1.5, 3),
        endSize: 0.5,
        color: Math.random() < 0.3 ? '#ffffff' : baseColor,
        alpha: 1.0,
        life: randomRange(0.25, 0.65),
        friction: 0.92,
        gravity: 90, // downward pull
        shape: 'line'
      });
    }
  }

  /**
   * Emits digital glitch voxel shards from NEXUS-9.
   * @param {number} x
   * @param {number} y
   * @param {number} [count=6]
   * @param {string} [color='#a855f7']
   */
  emitGlitchShards(x, y, count = 6, color = '#a855f7') {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      const ang = randomRange(0, Math.PI * 2);
      const spd = randomRange(30, 90);

      p.spawn({
        type: PARTICLE_TYPES.GLITCH,
        layer: 'top',
        x: x + randomRange(-12, 12),
        y: y + randomRange(-12, 12),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: randomRange(2, 5),
        endSize: randomRange(1, 3),
        color: Math.random() < 0.4 ? '#ff0055' : color,
        alpha: randomRange(0.6, 0.95),
        life: randomRange(0.15, 0.45),
        friction: 0.88,
        rotation: randomRange(0, Math.PI * 2),
        vRot: randomRange(-10, 10),
        shape: 'rect'
      });
    }
  }

  /**
   * Emits directional crimson blood spatter when player is damaged.
   * @param {number} x
   * @param {number} y
   * @param {number} [angle=0] Direction of impact
   * @param {number} [count=12]
   */
  emitBloodSpatter(x, y, angle = 0, count = 12) {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      const spread = randomRange(-0.8, 0.8);
      const spd = randomRange(50, 160);
      const ang = angle + spread;

      p.spawn({
        type: PARTICLE_TYPES.BLOOD,
        layer: 'top',
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: randomRange(2, 4.5),
        endSize: randomRange(1, 2),
        color: Math.random() < 0.3 ? '#880815' : '#cc1133',
        alpha: randomRange(0.8, 1.0),
        life: randomRange(0.3, 0.7),
        friction: 0.85,
        shape: 'circle'
      });
    }
  }

  /**
   * Emits footstep dust puff.
   * @param {number} x
   * @param {number} y
   */
  emitFootstepPuff(x, y) {
    for (let i = 0; i < 2; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      p.spawn({
        type: PARTICLE_TYPES.PUFF,
        layer: 'floor',
        x: x + randomRange(-4, 4),
        y: y + randomRange(-4, 4),
        vx: randomRange(-10, 10),
        vy: randomRange(-10, 10),
        size: randomRange(2, 4),
        endSize: randomRange(5, 8),
        color: '#475569',
        alpha: 0.35,
        life: 0.4,
        friction: 0.9,
        shape: 'circle'
      });
    }
  }

  /**
   * Updates all active particles.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(dt);
      }
    }
  }

  /**
   * Renders low-altitude floor particles (dust, steam, footstep puffs).
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} camera
   */
  renderFloor(ctx, camera) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (p.active && p.layer === 'floor') {
        if (!camera || camera.isCircleInView(p.x, p.y, p.size + 10)) {
          p.render(ctx);
        }
      }
    }
  }

  /**
   * Renders high-altitude top particles (sparks, blood, glitch shards).
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} camera
   */
  renderTop(ctx, camera) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (p.active && p.layer === 'top') {
        if (!camera || camera.isCircleInView(p.x, p.y, p.size + 10)) {
          p.render(ctx);
        }
      }
    }
  }

  /**
   * Clears all active particles.
   */
  clear() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool[i].reset();
    }
  }
}
