/**
 * THE LAST SIGNAL — CCTV SECURITY SURVEILLANCE SYSTEM
 * 
 * Multi-channel tactical security monitor featuring:
 * - 8 Sector surveillance feeds (CAM-01 to CAM-08) with manual/keyboard cycling.
 * - Realistic retro CRT scanline raster, timestamp telemetry, and recording badges.
 * - Dynamic electromagnetic interference and corrupted feeds when NEXUS-9 is in sector.
 * - Tactical scouting showing sector state, locked doors, hazards, and entity motion shadows.
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CCTV_CAMERAS,
  COLORS,
  GAME_STATES,
  EVENTS
} from '../utils/Constants.js';
import { distance } from '../utils/MathUtils.js';

export class CCTVUI {
  /**
   * @param {import('../core/EventBus.js').EventBus} [eventBus]
   * @param {import('../core/GameState.js').GameState} [gameState]
   */
  constructor(eventBus = null, gameState = null) {
    this.eventBus = eventBus;
    this.gameState = gameState;

    this.isOpen = false;
    this.currentCameraIndex = 0;
    this.cameras = [...CCTV_CAMERAS];

    // Dynamic feed animation
    this.feedTime = 0;
    this.staticNoiseAlpha = 0.08;
    this.glitchOffset = 0;
    this.interferenceLevel = 0; // 0 (Clean) to 1 (Heavily Glitched)

    // Interactive button hitboxes
    this.hitboxes = [];
  }

  /**
   * Opens the CCTV terminal interface.
   * @param {number} [initialCamIndex=0]
   */
  open(initialCamIndex = 0) {
    this.isOpen = true;
    this.currentCameraIndex = Math.max(0, Math.min(this.cameras.length - 1, initialCamIndex));
    this.eventBus?.emit(EVENTS.CCTV_OPENED, { camera: this.cameras[this.currentCameraIndex] });
    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'terminal_boot' });
  }

  /**
   * Closes the CCTV terminal.
   */
  close() {
    this.isOpen = false;
    this.eventBus?.emit(EVENTS.CCTV_CLOSED);
    if (this.gameState) {
      this.gameState.setState(GAME_STATES.PLAYING);
    }
  }

  /**
   * Switches to next camera channel.
   */
  nextCamera() {
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'terminal_keystroke' });
  }

  /**
   * Switches to previous camera channel.
   */
  prevCamera() {
    this.currentCameraIndex = (this.currentCameraIndex - 1 + this.cameras.length) % this.cameras.length;
    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'terminal_keystroke' });
  }

  /**
   * Selects a specific camera by index.
   * @param {number} index
   */
  selectCamera(index) {
    if (index >= 0 && index < this.cameras.length) {
      this.currentCameraIndex = index;
      this.eventBus?.emit('AUDIO_TRIGGER', { type: 'terminal_keystroke' });
    }
  }

  /**
   * Updates feed animation, interference levels, and noise.
   * @param {number} dt Delta time in seconds
   * @param {Object} [enemy]
   */
  update(dt, enemy = null) {
    if (!this.isOpen) return;

    this.feedTime += dt;
    const activeCam = this.cameras[this.currentCameraIndex];

    // Calculate electromagnetic interference from NEXUS-9 proximity
    if (enemy && enemy.active && activeCam) {
      const distToEnemy = distance(activeCam.x, activeCam.y, enemy.x, enemy.y);
      if (distToEnemy < 350) {
        // High interference when enemy is in surveillance zone
        this.interferenceLevel = Math.min(1.0, (1 - distToEnemy / 350) * 1.5);
      } else {
        this.interferenceLevel = Math.max(0, this.interferenceLevel - dt * 2.0);
      }
    } else {
      this.interferenceLevel = Math.max(0, this.interferenceLevel - dt * 2.0);
    }

    // Dynamic scanline glitch
    this.glitchOffset = Math.sin(this.feedTime * 18) * (this.interferenceLevel * 20);
  }

  /**
   * Handles keyboard and click inputs for CCTV UI.
   * @param {import('../core/InputManager.js').InputManager} input
   */
  handleInput(input) {
    if (!this.isOpen || !input) return;

    if (input.wasKeyJustPressed('KeyA') || input.wasKeyJustPressed('ArrowLeft')) {
      this.prevCamera();
    } else if (input.wasKeyJustPressed('KeyD') || input.wasKeyJustPressed('ArrowRight')) {
      this.nextCamera();
    } else if (input.wasKeyJustPressed('Escape') || input.wasKeyJustPressed('KeyE') || input.wasKeyJustPressed('Space')) {
      this.close();
    }

    // Number keys 1-8 for direct camera access
    for (let i = 1; i <= 8; i++) {
      if (input.wasKeyJustPressed(`Digit${i}`) || input.wasKeyJustPressed(`Numpad${i}`)) {
        this.selectCamera(i - 1);
      }
    }

    // Mouse click handling
    if (input.wasMouseButtonJustPressed(0)) {
      for (const box of this.hitboxes) {
        if (
          input.mouse.screenX >= box.x &&
          input.mouse.screenX <= box.x + box.w &&
          input.mouse.screenY >= box.y &&
          input.mouse.screenY <= box.y + box.h
        ) {
          box.action?.();
          break;
        }
      }
    }
  }

  /**
   * Master CCTV viewport renderer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} [width=CANVAS_WIDTH]
   * @param {number} [height=CANVAS_HEIGHT]
   * @param {import('../world/LevelManager.js').LevelManager} [levelManager]
   * @param {Object} [enemy]
   * @param {Object} [player]
   */
  render(ctx, width = CANVAS_WIDTH, height = CANVAS_HEIGHT, levelManager = null, enemy = null, player = null) {
    if (!this.isOpen) return;

    this.hitboxes = [];
    const activeCam = this.cameras[this.currentCameraIndex];

    ctx.save();

    // 1. Dark CRT Monitor Housing
    ctx.fillStyle = '#020508';
    ctx.fillRect(0, 0, width, height);

    // 2. Surveillance Feed Frame Area
    const feedX = 40;
    const feedY = 40;
    const feedW = width - 300;
    const feedH = height - 120;

    ctx.fillStyle = '#050c12';
    ctx.fillRect(feedX, feedY, feedW, feedH);

    // 3. Render Simulated Camera Feed Content
    this.renderFeedWorld(ctx, feedX, feedY, feedW, feedH, activeCam, levelManager, enemy, player);

    // 4. CRT Interference & Static Snow
    this.renderInterferenceOverlay(ctx, feedX, feedY, feedW, feedH);

    // 5. Camera Telemetry Header & Timestamp
    this.renderTelemetryHeader(ctx, feedX, feedY, feedW, activeCam);

    // 6. Camera Channel Sidebar Switcher
    this.renderSidebar(ctx, width - 240, feedY, 200, feedH);

    // 7. Footer Instructions
    ctx.font = '12px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillText('[A / D] PREV/NEXT CAM  |  [1-8] SELECT CHANNEL  |  [ESC / E] EXIT SURVEILLANCE', feedX, height - 40);

    ctx.restore();
  }

  /**
   * Renders the simulated world view for the selected camera.
   */
  renderFeedWorld(ctx, fx, fy, fw, fh, cam, levelManager, enemy, player) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();

    // Camera perspective transform
    ctx.translate(fx + fw / 2, fy + fh / 2);
    ctx.scale(0.85, 0.85);
    ctx.translate(-cam.x, -cam.y);

    // Render floor tiles around camera
    if (levelManager && levelManager.grid) {
      const tileRadius = 14;
      const camTx = Math.floor(cam.x / 32);
      const camTy = Math.floor(cam.y / 32);

      for (let y = Math.max(0, camTy - tileRadius); y < Math.min(levelManager.height, camTy + tileRadius); y++) {
        for (let x = Math.max(0, camTx - tileRadius); x < Math.min(levelManager.width, camTx + tileRadius); x++) {
          const tile = levelManager.grid[y][x];
          const px = x * 32;
          const py = y * 32;

          if (tile === 1) {
            // Bulkhead wall
            ctx.fillStyle = '#0c1b26';
            ctx.fillRect(px, py, 32, 32);
            ctx.strokeStyle = '#1a3548';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, 32, 32);
          } else if (tile >= 4 && tile <= 7) {
            // Door
            ctx.fillStyle = '#1e384d';
            ctx.fillRect(px, py, 32, 32);
          } else {
            // Floor
            ctx.fillStyle = '#050f17';
            ctx.fillRect(px, py, 32, 32);
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
            ctx.strokeRect(px, py, 32, 32);
          }
        }
      }
    }

    // Render Player if in camera zone
    if (player && distance(cam.x, cam.y, player.x, player.y) < 320) {
      ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
      ctx.fillText('OPERATOR VANCE', player.x - 45, player.y - 20);
    }

    // Render NEXUS-9 if in camera zone
    if (enemy && enemy.active && distance(cam.x, cam.y, enemy.x, enemy.y) < 340) {
      const glitch = (Math.random() - 0.5) * 12;
      ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
      ctx.beginPath();
      ctx.arc(enemy.x + glitch, enemy.y, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 12px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
      ctx.fillText('⚠ ANOMALY: NEXUS-9', enemy.x - 55, enemy.y - 24);
    }

    ctx.restore();
  }

  /**
   * Renders CRT scanline raster and electromagnetic glitch noise.
   */
  renderInterferenceOverlay(ctx, fx, fy, fw, fh) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();

    // Scanlines
    ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
    for (let y = fy; y < fy + fh; y += 4) {
      ctx.fillRect(fx, y, fw, 1.5);
    }

    // Glitch Distortion Bars if interference active
    if (this.interferenceLevel > 0.05) {
      const numBars = Math.floor(this.interferenceLevel * 8);
      ctx.fillStyle = `rgba(255, 50, 80, ${this.interferenceLevel * 0.35})`;
      for (let i = 0; i < numBars; i++) {
        const barY = fy + Math.random() * fh;
        const barH = 4 + Math.random() * 24;
        ctx.fillRect(fx, barY, fw, barH);
      }
    }

    // Outer Surveillance Bezel Border
    ctx.strokeStyle = this.interferenceLevel > 0.4 ? COLORS.ALERT_RED_BRIGHT : COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 2;
    ctx.strokeRect(fx, fy, fw, fh);

    ctx.restore();
  }

  /**
   * Renders camera metadata, sector tag, and recording status.
   */
  renderTelemetryHeader(ctx, fx, fy, fw, cam) {
    // Top banner
    ctx.font = 'bold 14px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillText(`${cam.id} // ${cam.name.toUpperCase()}`, fx + 16, fy + 26);

    // REC Blink Badge
    const recBlink = Math.sin(this.feedTime * 4) > 0;
    ctx.fillStyle = recBlink ? COLORS.ALERT_RED_BRIGHT : 'rgba(255, 50, 50, 0.3)';
    ctx.beginPath();
    ctx.arc(fx + fw - 80, fy + 22, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillText('LIVE REC', fx + fw - 70, fy + 26);

    // Signal Quality Indicator
    let sigText = 'SIGNAL: 98% [NOMINAL]';
    let sigColor = COLORS.CRT_GREEN_BRIGHT;
    if (this.interferenceLevel > 0.6) {
      sigText = 'SIGNAL: 18% [CORRUPTED]';
      sigColor = COLORS.ALERT_RED_BRIGHT;
    } else if (this.interferenceLevel > 0.2) {
      sigText = 'SIGNAL: 62% [INTERFERENCE]';
      sigColor = COLORS.AMBER_BRIGHT;
    }
    ctx.fillStyle = sigColor;
    ctx.fillText(sigText, fx + 16, fy + 48);
  }

  /**
   * Renders the right sidebar with clickable camera list.
   */
  renderSidebar(ctx, sx, sy, sw, sh) {
    ctx.fillStyle = 'rgba(6, 14, 22, 0.95)';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = COLORS.CYAN_DARK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, sw, sh);

    ctx.font = 'bold 12px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillText('CHANNEL FEEDS', sx + 14, sy + 24);

    const btnH = 34;
    const gap = 8;
    let by = sy + 40;

    this.cameras.forEach((cam, idx) => {
      const isSelected = this.currentCameraIndex === idx;
      ctx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.25)' : 'rgba(10, 24, 36, 0.6)';
      ctx.fillRect(sx + 10, by, sw - 20, btnH);
      ctx.strokeStyle = isSelected ? COLORS.CYAN_BRIGHT : 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.strokeRect(sx + 10, by, sw - 20, btnH);

      ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : '#88aacc';
      ctx.fillText(`[${idx + 1}] ${cam.id}`, sx + 18, by + 21);

      this.hitboxes.push({
        x: sx + 10,
        y: by,
        w: sw - 20,
        h: btnH,
        action: () => this.selectCamera(idx)
      });

      by += btnH + gap;
    });
  }
}
