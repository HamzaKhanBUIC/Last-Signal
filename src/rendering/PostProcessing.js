/**
 * THE LAST SIGNAL — RETRO-FUTURISTIC SCI-FI CRT POST-PROCESSING
 * 
 * Implements scanlines, CRT screen vignette, dynamic chromatic aberration,
 * entity proximity glitch slicing, and procedural film grain.
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ENEMY_AURA_FAR_DIST,
  ENEMY_AURA_NEAR_DIST,
  COLORS
} from '../utils/Constants.js';
import { clamp, lerp } from '../utils/MathUtils.js';
import { createOffscreenCanvas } from './CanvasUtils.js';

export class PostProcessing {
  /**
   * @param {number} [width=CANVAS_WIDTH]
   * @param {number} [height=CANVAS_HEIGHT]
   */
  constructor(width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    this.width = width;
    this.height = height;

    // Feature Toggles & Settings
    this.scanlinesEnabled = true;
    this.vignetteEnabled = true;
    this.glitchEnabled = true;
    this.noiseEnabled = true;
    this.crtCurvatureEnabled = true;

    // Intensities
    this.scanlineOpacity = 0.14;
    this.vignetteIntensity = 0.45;
    this.noiseOpacity = 0.03;

    // Internal animation timers
    this.time = 0;

    // Pre-baked static assets
    this.scanlinePattern = null;
    this.noiseCanvas = null;
    this.vignetteCanvas = null;

    this.initBuffers();
  }

  /**
   * Pre-renders scanlines, noise, and vignette gradients into offscreen buffers.
   */
  initBuffers() {
    // 1. Scanline Texture (Repeatable pattern)
    const scanCanvas = createOffscreenCanvas(4, 4);
    const scanCtx = scanCanvas.getContext('2d');
    scanCtx.fillStyle = 'rgba(0, 0, 0, 0)';
    scanCtx.fillRect(0, 0, 4, 4);
    scanCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    scanCtx.fillRect(0, 0, 4, 2);
    scanCtx.fillStyle = 'rgba(0, 255, 102, 0.02)'; // Subtle CRT phosphor tint
    scanCtx.fillRect(0, 2, 4, 2);
    this.scanlineCanvas = scanCanvas;

    // 2. Film Grain / Static Noise Canvas (64x64 tile)
    const noiseCanvas = createOffscreenCanvas(64, 64);
    const noiseCtx = noiseCanvas.getContext('2d');
    const imgData = noiseCtx.createImageData(64, 64);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      imgData.data[i] = v;     // R
      imgData.data[i + 1] = v; // G
      imgData.data[i + 2] = v; // B
      imgData.data[i + 3] = Math.random() < 0.2 ? 20 : 0; // Alpha
    }
    noiseCtx.putImageData(imgData, 0, 0);
    this.noiseCanvas = noiseCanvas;

    // 3. CRT Vignette & Corner Darkening (High Clarity)
    const vigCanvas = createOffscreenCanvas(this.width, this.height);
    const vigCtx = vigCanvas.getContext('2d');
    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = Math.hypot(cx, cy);

    const grad = vigCtx.createRadialGradient(cx, cy, radius * 0.55, cx, cy, radius * 0.98);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.75, 'rgba(3, 5, 8, 0.15)');
    grad.addColorStop(1, 'rgba(0, 2, 5, 0.45)');

    vigCtx.fillStyle = grad;
    vigCtx.fillRect(0, 0, this.width, this.height);

    // Bezel border simulation
    vigCtx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    vigCtx.lineWidth = 6;
    vigCtx.strokeRect(0, 0, this.width, this.height);

    this.vignetteCanvas = vigCanvas;
  }

  /**
   * Resizes internal post-processing buffers.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.initBuffers();
  }

  /**
   * Updates internal animation time.
   * @param {number} dt
   */
  update(dt) {
    this.time += dt;
  }

  /**
   * Executes the full retro-futuristic post-processing chain.
   * 
   * @param {CanvasRenderingContext2D} ctx Destination canvas context
   * @param {number} [entityDistance=9999] Distance to NEXUS-9 entity in pixels
   * @param {number} [trauma=0] Camera shake trauma [0, 1]
   */
  render(ctx, entityDistance = 9999, trauma = 0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const isNearEntity = entityDistance < ENEMY_AURA_FAR_DIST;
    const proximityFactor = isNearEntity ? clamp(1 - (entityDistance / ENEMY_AURA_FAR_DIST), 0, 1) : 0;
    const glitchIntensity = proximityFactor + trauma * 0.8;

    // -------------------------------------------------------------
    // 1. DYNAMIC GLITCH SLICES & SCANLINE JITTER (NEXUS-9 Proximity)
    // -------------------------------------------------------------
    if (this.glitchEnabled && glitchIntensity > 0.08) {
      const sliceCount = Math.floor(lerp(1, 8, glitchIntensity));
      const maxOffset = lerp(4, 28, glitchIntensity);

      for (let s = 0; s < sliceCount; s++) {
        if (Math.random() < glitchIntensity * 0.75) {
          const sy = Math.random() * (this.height - 30);
          const sh = randomInt(4, 24);
          const shiftX = (Math.random() - 0.5) * maxOffset * 2;

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, sy, this.width, sh);
          ctx.clip();

          // Displace horizontal strip
          ctx.drawImage(ctx.canvas, shiftX, 0);

          // Color glitch tint
          if (Math.random() < 0.5) {
            ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255, 0, 68, 0.15)' : 'rgba(0, 240, 255, 0.15)';
            ctx.fillRect(0, sy, this.width, sh);
          }
          ctx.restore();
        }
      }
    }

    // -------------------------------------------------------------
    // 2. CHROMATIC ABERRATION (RGB Shift on High Glitch / Shock)
    // -------------------------------------------------------------
    if (this.glitchEnabled && glitchIntensity > 0.35) {
      const shift = Math.floor(glitchIntensity * 4);
      if (shift > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = glitchIntensity * 0.25;

        // Red shift to left
        ctx.drawImage(ctx.canvas, -shift, 0);

        // Cyan shift to right
        ctx.drawImage(ctx.canvas, shift, 0);
        ctx.restore();
      }
    }

    // -------------------------------------------------------------
    // 3. CRT SCANLINES OVERLAY
    // -------------------------------------------------------------
    if (this.scanlinesEnabled) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = this.scanlineOpacity;

      // Draw repeating scanlines
      ctx.fillStyle = ctx.createPattern ? ctx.createPattern(this.scanlineCanvas, 'repeat') : 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, this.width, this.height);

      // Subtle moving scan beam refresh roll
      const rollY = (this.time * 60) % this.height;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(0, rollY, this.width, 16);
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 4. FILM NOISE & STATIC GRAIN
    // -------------------------------------------------------------
    if (this.noiseEnabled && this.noiseCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const noiseAlpha = this.noiseOpacity + glitchIntensity * 0.1;
      ctx.globalAlpha = clamp(noiseAlpha, 0, 0.3);

      const offX = Math.floor(Math.random() * 64);
      const offY = Math.floor(Math.random() * 64);

      for (let y = -offY; y < this.height; y += 64) {
        for (let x = -offX; x < this.width; x += 64) {
          ctx.drawImage(this.noiseCanvas, x, y);
        }
      }
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 5. CRT VIGNETTE & TUBE CORNER CURVATURE
    // -------------------------------------------------------------
    if (this.vignetteEnabled && this.vignetteCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = this.vignetteIntensity;
      ctx.drawImage(this.vignetteCanvas, 0, 0);
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 6. DANGER / FRENZY PULSE RED TINT
    // -------------------------------------------------------------
    if (entityDistance < ENEMY_AURA_NEAR_DIST) {
      const dangerFactor = 1 - (entityDistance / ENEMY_AURA_NEAR_DIST);
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 8);
      const dangerAlpha = dangerFactor * pulse * 0.18;

      if (dangerAlpha > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(255, 0, 40, ${dangerAlpha})`;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}
