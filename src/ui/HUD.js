/**
 * THE LAST SIGNAL — RETRO SCI-FI HUD & TACTICAL READOUT
 * Atmospheric canvas HUD: ECG Heartbeat Monitor, Stamina, Flashlight Battery,
 * Objective Tracker, 3 Holographic Signal Fragment slots, Sonar Motion Tracker,
 * Keycard Badges, Context Action Prompts, and Notification Toast System.
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  SECURITY_LEVELS,
  FRAGMENT_TYPES,
  HEALTH_MAX,
  STAMINA_MAX,
  BATTERY_MAX
} from '../utils/Constants.js';

export class HUD {
  /**
   * @param {import('../core/EventBus.js').EventBus} [eventBus]
   */
  constructor(eventBus = null) {
    this.eventBus = eventBus;

    // Notification Toasts Queue
    /** @type {Array<{ id: string, message: string, type: string, duration: number, elapsed: number, alpha: number }>} */
    this.toasts = [];

    // Contextual Action Prompt
    this.actionPrompt = null; // e.g. { text: "[E] Open Blast Door", subtext: "Blue Clearance Required", type: 'default' }
    this.actionPromptTimer = 0;

    // Dynamic Animation Timers
    this.animTime = 0;
    this.radarSweepAngle = 0;
    this.ecgPhase = 0;

    // Cached state references
    this.cachedHealth = HEALTH_MAX;
    this.cachedStamina = STAMINA_MAX;
    this.cachedBattery = BATTERY_MAX;

    // Active Audio Log Playback State
    this.activeAudioLog = null;
    this.audioLogTimer = 0;

    // Toast & Event listeners
    if (this.eventBus) {
      this.eventBus.on('TOAST_NOTIFICATION', (data) => {
        this.showToast(data.message, data.type || 'info', data.duration || 3.5);
      });
      this.eventBus.on('MAP_TOGGLED', () => {
        this.isMapOpen = !this.isMapOpen;
      });
      this.eventBus.on('AUDIO_LOG_STARTED', (data) => {
        this.activeAudioLog = data.log;
        this.audioLogTimer = data.duration || 6.5;
      });
      this.eventBus.on('AUDIO_LOG_FINISHED', () => {
        this.activeAudioLog = null;
        this.audioLogTimer = 0;
      });
    }
  }

  /**
   * Toggles the Station PDA Map view.
   */
  toggleMap() {
    this.isMapOpen = !this.isMapOpen;
  }

  /**
   * Pushes a floating notification toast.
   * @param {string} message
   * @param {'info'|'alert'|'success'|'warning'} [type='info']
   * @param {number} [duration=3.5] Duration in seconds
   */
  showToast(message, type = 'info', duration = 3.5) {
    this.toasts.push({
      id: 'toast_' + Math.random().toString(36).substr(2, 9),
      message,
      type,
      duration,
      elapsed: 0,
      alpha: 1.0
    });

    // Keep max 5 toasts visible
    if (this.toasts.length > 5) {
      this.toasts.shift();
    }
  }

  /**
   * Sets current contextual action prompt.
   * @param {string} text Primary action text (e.g. "[E] Open Blast Door")
   * @param {string} [subtext=''] Secondary sub-label
   * @param {'default'|'locked'|'critical'} [type='default']
   */
  setActionPrompt(text, subtext = '', type = 'default') {
    this.actionPrompt = { text, subtext, type };
    this.actionPromptTimer = 0.2; // Keep alive buffer
  }

  /**
   * Clears action prompt.
   */
  clearActionPrompt() {
    this.actionPrompt = null;
  }

  /**
   * Updates HUD animations, timers, and toast decays.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    this.animTime += dt;
    this.radarSweepAngle = (this.radarSweepAngle + dt * 2.4) % (Math.PI * 2);
    this.ecgPhase += dt * 3.5;

    // Action prompt buffer
    if (this.actionPromptTimer > 0) {
      this.actionPromptTimer -= dt;
      if (this.actionPromptTimer <= 0) {
        this.actionPrompt = null;
      }
    }

    // Audio log timer countdown
    if (this.audioLogTimer > 0) {
      this.audioLogTimer -= dt;
      if (this.audioLogTimer <= 0) {
        this.activeAudioLog = null;
      }
    }

    // Update toasts
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const toast = this.toasts[i];
      toast.elapsed += dt;

      if (toast.elapsed >= toast.duration) {
        toast.alpha -= dt * 3.0; // Fade out
        if (toast.alpha <= 0) {
          this.toasts.splice(i, 1);
        }
      }
    }
  }

  /**
   * Master HUD rendering pass.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {Object} [player]
   * @param {Object} [enemy]
   * @param {string} [currentSector='Unknown Sector']
   */
  render(ctx, gameState, player = null, enemy = null, currentSector = 'Sector 1: Habitation') {
    ctx.save();

    // 0. Locker Hiding Cinematic Viewport Overlay
    if (player && player.isHiding) {
      this.renderHidingOverlay(ctx, player);
    }

    // 1. Top Left: Objective Tracker Banner & Sector Info
    this.renderObjectiveBanner(ctx, gameState, currentSector);

    // 2. Top Right: Signal Fragment Holographic Matrix
    this.renderFragmentSlots(ctx, gameState);

    // 3. Bottom Left: Tactical Vitals Monitor (Health/ECG, Stamina, Battery, Gear)
    this.renderVitalsMonitor(ctx, gameState, player, enemy);

    // 4. Bottom Right: Circular Sonar Radar / Motion Tracker
    this.renderMotionTracker(ctx, gameState, player, enemy);

    // 5. Center: Contextual Action Prompt
    if (this.actionPrompt) {
      this.renderActionPrompt(ctx, this.actionPrompt);
    }

    // 6. Floating Notification Toasts
    this.renderToasts(ctx);

    // 7. Diegetic Audio Log Subtitle Banner
    if (this.activeAudioLog) {
      this.renderAudioLogSubtitle(ctx, this.activeAudioLog);
    }

    // 8. Tactical PDA Station Map Overlay
    if (this.isMapOpen) {
      this.renderStationMap(ctx, gameState, player, currentSector);
    }

    ctx.restore();
  }

  /**
   * Renders the animated retro sci-fi Audio Log Subtitle Bar
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} log
   */
  renderAudioLogSubtitle(ctx, log) {
    const w = 680;
    const h = 64;
    const x = (CANVAS_WIDTH - w) / 2;
    const y = 20;

    // Outer Bezel Frame
    ctx.fillStyle = 'rgba(4, 10, 18, 0.92)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    this.drawCornerBrackets(ctx, x, y, w, h, COLORS.CYAN_BRIGHT, 8);

    // Left Icon & Animated Radio Waveform Equalizer
    ctx.fillStyle = COLORS.AMBER_BRIGHT;
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillText('📻 AUDIO LOG', x + 16, y + 20);

    for (let i = 0; i < 5; i++) {
      const barH = 4 + Math.abs(Math.sin(this.animTime * 8 + i * 1.2)) * 12;
      ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
      ctx.fillRect(x + 100 + i * 5, y + 20 - barH, 3, barH);
    }

    // Author & Sector Tag
    ctx.fillStyle = COLORS.CYAN;
    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.fillText(`// ${log.author.toUpperCase()} (${log.role || 'Personnel'}) — ${log.sector.toUpperCase()}`, x + 135, y + 20);

    // Transcript Subtitle (with text wrapping)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 12px "Share Tech Mono", monospace';
    
    // Quick single-line truncate / wrap
    const text = `"${log.transcript}"`;
    if (text.length > 85) {
      ctx.fillText(text.substring(0, 82) + '...', x + 16, y + 46);
    } else {
      ctx.fillText(text, x + 16, y + 46);
    }
  }

  // =========================================================================
  // 1. OBJECTIVE BANNER & SECTOR READOUT
  // =========================================================================

  renderObjectiveBanner(ctx, gameState, currentSector) {
    const x = 24;
    const y = 20;
    const width = 420;
    const height = 66;

    // Panel Background
    ctx.fillStyle = 'rgba(6, 12, 20, 0.82)';
    ctx.fillRect(x, y, width, height);

    // Panel Outer Border & Tech Brackets
    ctx.strokeStyle = COLORS.CYAN_DARK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);

    // Glowing Cyan Left Accent Bar
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillRect(x, y, 4, height);

    // Corner Brackets
    this.drawCornerBrackets(ctx, x, y, width, height, COLORS.CYAN_BRIGHT, 8);

    // Header Tag: Sector Info & Transceiver Link
    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN;
    ctx.fillText(`LOCATION: ${currentSector.toUpperCase()}`, x + 14, y + 18);

    const blink = Math.sin(this.animTime * 4) > 0;
    ctx.fillStyle = blink ? COLORS.CRT_GREEN_BRIGHT : COLORS.CRT_GREEN_DARK;
    ctx.fillText(`● LINK ONLINE`, x + width - 96, y + 18);

    // Main Objective Text
    ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#ffffff';

    const objText = gameState.currentObjective || 'Explore AEGIS-7 Station and survive.';
    // Truncate or wrap if too long
    const displayObj = objText.length > 52 ? objText.substring(0, 49) + '...' : objText;
    ctx.fillText(`DIRECTIVE: ${displayObj}`, x + 14, y + 42);

    // Small progress bar under objective
    const fragCount = gameState.getFragmentCount ? gameState.getFragmentCount() : 0;
    const progressW = (width - 28) * (fragCount / 3);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.fillRect(x + 14, y + 54, width - 28, 4);
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillRect(x + 14, y + 54, progressW, 4);
  }

  // =========================================================================
  // 2. SIGNAL FRAGMENT HOLOGRAPHIC SLOTS
  // =========================================================================

  renderFragmentSlots(ctx, gameState) {
    const startX = CANVAS_WIDTH - 360;
    const startY = 20;
    const slotW = 104;
    const slotH = 66;
    const gap = 12;

    const fragments = [
      {
        id: 'FRAGMENT_ALPHA',
        code: 'CRY-01',
        label: 'ALPHA',
        color: COLORS.FRAGMENT_ALPHA,
        has: gameState.hasFragment('FRAGMENT_ALPHA') || gameState.hasFragment('alpha'),
        decrypted: gameState.isFragmentDecrypted ? gameState.isFragmentDecrypted('FRAGMENT_ALPHA') : false
      },
      {
        id: 'FRAGMENT_BETA',
        code: 'PWR-02',
        label: 'BETA',
        color: COLORS.FRAGMENT_BETA,
        has: gameState.hasFragment('FRAGMENT_BETA') || gameState.hasFragment('beta'),
        decrypted: gameState.isFragmentDecrypted ? gameState.isFragmentDecrypted('FRAGMENT_BETA') : false
      },
      {
        id: 'FRAGMENT_GAMMA',
        code: 'DAT-03',
        label: 'GAMMA',
        color: COLORS.FRAGMENT_GAMMA,
        has: gameState.hasFragment('FRAGMENT_GAMMA') || gameState.hasFragment('gamma'),
        decrypted: gameState.isFragmentDecrypted ? gameState.isFragmentDecrypted('FRAGMENT_GAMMA') : false
      }
    ];

    fragments.forEach((frag, idx) => {
      const sx = startX + idx * (slotW + gap);
      const sy = startY;

      // Slot Frame Background
      ctx.fillStyle = 'rgba(6, 12, 20, 0.82)';
      ctx.fillRect(sx, sy, slotW, slotH);

      // Border Styling based on status
      let borderColor = 'rgba(100, 120, 140, 0.3)';
      if (frag.decrypted) {
        borderColor = COLORS.CRT_GREEN_BRIGHT;
      } else if (frag.has) {
        borderColor = frag.color;
      }

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, sy, slotW, slotH);

      // Tech bracket accents
      this.drawCornerBrackets(ctx, sx, sy, slotW, slotH, borderColor, 5);

      // Fragment Name Header
      ctx.font = '10px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = frag.has ? frag.color : '#667788';
      ctx.fillText(`FRAG [${frag.code}]`, sx + 8, sy + 16);

      // Central Holographic Icon / Status
      if (frag.decrypted) {
        // Decrypted State: Solid checkmark + Locked frequency
        ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
        ctx.font = 'bold 12px "Share Tech Mono", monospace, monospace';
        ctx.fillText('DECRYPTED', sx + 8, sy + 38);

        ctx.font = '10px "Share Tech Mono", monospace, monospace';
        ctx.fillStyle = '#aaffcc';
        ctx.fillText('✓ FREQ LOCKED', sx + 8, sy + 54);
      } else if (frag.has) {
        // Acquired but Encrypted State: Pulsing holographic reticle
        const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 5 + idx);
        ctx.fillStyle = frag.color;
        ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
        ctx.fillText('ENCRYPTED', sx + 8, sy + 38);

        // Animated resonance bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(sx + 8, sy + 46, slotW - 16, 6);
        ctx.fillStyle = frag.color;
        ctx.fillRect(sx + 8, sy + 46, (slotW - 16) * pulse, 6);
      } else {
        // Unacquired State: Hollow wireframe
        ctx.fillStyle = '#445566';
        ctx.font = '11px "Share Tech Mono", monospace, monospace';
        ctx.fillText('UNACQUIRED', sx + 8, sy + 38);

        ctx.font = '10px "Share Tech Mono", monospace, monospace';
        ctx.fillStyle = '#334455';
        ctx.fillText('[ NO SIGNAL ]', sx + 8, sy + 54);
      }
    });
  }

  // =========================================================================
  // 3. TACTICAL VITALS MONITOR (ECG, Stamina, Battery, Keycards)
  // =========================================================================

  renderVitalsMonitor(ctx, gameState, player, enemy) {
    const x = 24;
    const y = CANVAS_HEIGHT - 176;
    const width = 340;
    const height = 152;

    // Panel Background
    ctx.fillStyle = 'rgba(6, 12, 20, 0.85)';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = COLORS.CYAN_DARK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);
    this.drawCornerBrackets(ctx, x, y, width, height, COLORS.CYAN_BRIGHT, 8);

    // Section Header
    ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillText('BIOMETRIC & SYSTEM TELEMETRY', x + 12, y + 18);

    // 1. Health Bar & ECG Monitor Line
    const hp = gameState.playerHealth !== undefined ? gameState.playerHealth : HEALTH_MAX;
    const hpPercent = Math.max(0, Math.min(1, hp / HEALTH_MAX));

    // Dynamic ECG speed & color based on HP and enemy proximity
    let ecgColor = COLORS.CRT_GREEN_BRIGHT;
    if (hpPercent < 0.35) ecgColor = COLORS.ALERT_RED_BRIGHT;
    else if (hpPercent < 0.65) ecgColor = COLORS.AMBER_BRIGHT;

    // Health text
    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`VITALS: ${Math.ceil(hp)}%`, x + 12, y + 36);

    // Health Bar Frame
    const barX = x + 96;
    const barY = y + 26;
    const barW = 120;
    const barH = 12;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = ecgColor;
    ctx.fillRect(barX, barY, barW * hpPercent, barH);
    ctx.strokeStyle = ecgColor;
    ctx.strokeRect(barX, barY, barW, barH);

    // ECG Oscilloscope Mini Waveform
    const ecgX = barX + barW + 10;
    const ecgY = barY - 2;
    const ecgW = 90;
    const ecgH = 16;

    ctx.fillStyle = 'rgba(0, 15, 10, 0.7)';
    ctx.fillRect(ecgX, ecgY, ecgW, ecgH);
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.2)';
    ctx.strokeRect(ecgX, ecgY, ecgW, ecgH);

    // Draw Live Animated Heartbeat ECG line
    this.drawECGWaveform(ctx, ecgX, ecgY + ecgH / 2, ecgW, ecgH, ecgColor, hpPercent);

    // 2. Stamina Bar
    const stamina = gameState.stamina !== undefined ? gameState.stamina : STAMINA_MAX;
    const staminaPercent = Math.max(0, Math.min(1, stamina / STAMINA_MAX));

    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`STAMINA:`, x + 12, y + 58);

    const sBarY = y + 48;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barX, sBarY, barW, barH);

    const staminaColor = gameState.isExhausted ? COLORS.ALERT_RED_BRIGHT : COLORS.CYAN_BRIGHT;
    ctx.fillStyle = staminaColor;
    ctx.fillRect(barX, sBarY, barW * staminaPercent, barH);
    ctx.strokeStyle = staminaColor;
    ctx.strokeRect(barX, sBarY, barW, barH);

    if (gameState.isExhausted) {
      const flash = Math.sin(this.animTime * 10) > 0;
      ctx.fillStyle = flash ? COLORS.ALERT_RED_BRIGHT : 'transparent';
      ctx.font = '10px "Share Tech Mono", monospace, monospace';
      ctx.fillText('EXHAUSTED', ecgX + 6, sBarY + 10);
    } else {
      ctx.font = '10px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = COLORS.CYAN;
      ctx.fillText(`${Math.ceil(stamina)}%`, ecgX + 6, sBarY + 10);
    }

    // 3. Flashlight Battery Gauge
    const battery = gameState.flashlightBattery !== undefined ? gameState.flashlightBattery : BATTERY_MAX;
    const battPercent = Math.max(0, Math.min(1, battery / BATTERY_MAX));
    const isLowBatt = battery <= 20;

    let battColor = COLORS.AMBER_BRIGHT;
    if (battery <= 10) battColor = COLORS.ALERT_RED_BRIGHT;
    else if (battery > 50) battColor = COLORS.CRT_GREEN_BRIGHT;

    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`FLASHLIGHT:`, x + 12, y + 80);

    const bBarY = y + 70;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barX, bBarY, barW, barH);
    ctx.fillStyle = battColor;
    ctx.fillRect(barX, bBarY, barW * battPercent, barH);
    ctx.strokeStyle = battColor;
    ctx.strokeRect(barX, bBarY, barW, barH);

    const lightStatus = gameState.isFlashlightOn ? 'ON' : 'OFF';
    ctx.font = '10px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = battColor;
    if (isLowBatt && Math.sin(this.animTime * 8) > 0) {
      ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
      ctx.fillText(`LOW [${Math.ceil(battery)}%]`, ecgX + 6, bBarY + 10);
    } else {
      ctx.fillText(`[${lightStatus}] ${Math.ceil(battery)}%`, ecgX + 6, bBarY + 10);
    }

    // 4. Tactical Item Quick-Use Readout (Medkits, Batteries, Decoys, EMP)
    const inv = gameState.inventory || {};
    const medCount = inv.medkits !== undefined ? inv.medkits : 0;
    const batCount = inv.batteries !== undefined ? inv.batteries : 0;
    const decoyCount = inv.decoys !== undefined ? inv.decoys : 0;
    const empCount = inv.empCharges !== undefined ? inv.empCharges : 0;

    ctx.font = '10px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#aaccdd';
    ctx.fillText(`[1] MEDKIT: x${medCount}`, x + 12, y + 100);
    ctx.fillText(`[2] BATTERY: x${batCount}`, x + 150, y + 100);
    ctx.fillText(`[3] DECOY: x${decoyCount}`, x + 12, y + 115);
    ctx.fillText(`[4] EMP BURST: x${empCount}`, x + 150, y + 115);

    // 5. Active Keycard Clearance Badges
    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillText('CLEARANCE:', x + 12, y + 135);

    const keycards = [
      { level: SECURITY_LEVELS.BLUE, label: 'BLUE', color: COLORS.KEYCARD_BLUE, has: gameState.hasKeycard ? gameState.hasKeycard(SECURITY_LEVELS.BLUE) : false },
      { level: SECURITY_LEVELS.RED, label: 'RED', color: COLORS.KEYCARD_RED, has: gameState.hasKeycard ? gameState.hasKeycard(SECURITY_LEVELS.RED) : false },
      { level: SECURITY_LEVELS.MASTER, label: 'MASTER', color: COLORS.KEYCARD_MASTER, has: gameState.hasKeycard ? gameState.hasKeycard(SECURITY_LEVELS.MASTER) : false }
    ];

    let badgeX = x + 96;
    keycards.forEach(kc => {
      const bw = 54;
      const bh = 18;
      const bg = kc.has ? 'rgba(10, 30, 40, 0.9)' : 'rgba(20, 25, 30, 0.4)';
      const border = kc.has ? kc.color : 'rgba(80, 90, 100, 0.3)';

      ctx.fillStyle = bg;
      ctx.fillRect(badgeX, y + 118, bw, bh);
      ctx.strokeStyle = border;
      ctx.strokeRect(badgeX, y + 118, bw, bh);

      ctx.font = 'bold 9px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = kc.has ? kc.color : '#445566';
      ctx.fillText(kc.label, badgeX + 8, y + 131);

      badgeX += bw + 8;
    });
  }

  /**
   * Draws a live procedural ECG heartbeat wave into the miniature oscilloscope box.
   */
  drawECGWaveform(ctx, x, y, width, height, color, hpPercent) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - height / 2, width, height);
    ctx.clip();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const speed = 2.5 + (1 - hpPercent) * 3.5;
    const t = this.animTime * speed;

    for (let px = 0; px < width; px += 2) {
      const normX = (px / width + t) % 1.0; // 0 to 1 cycle
      let waveY = 0;

      // P wave (0.15 - 0.25)
      if (normX >= 0.15 && normX < 0.25) {
        waveY = -Math.sin((normX - 0.15) * Math.PI * 10) * 3;
      }
      // Q-R-S complex (0.32 - 0.42)
      else if (normX >= 0.32 && normX < 0.35) {
        waveY = 2; // Q dip
      } else if (normX >= 0.35 && normX < 0.38) {
        waveY = -height * 0.45; // R spike
      } else if (normX >= 0.38 && normX < 0.42) {
        waveY = 3; // S dip
      }
      // T wave (0.50 - 0.65)
      else if (normX >= 0.50 && normX < 0.65) {
        waveY = -Math.sin((normX - 0.50) * Math.PI * 6.6) * 4.5;
      }

      const drawX = x + px;
      const drawY = y + waveY;

      if (px === 0) {
        ctx.moveTo(drawX, drawY);
      } else {
        ctx.lineTo(drawX, drawY);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  // =========================================================================
  // 4. CIRCULAR SONAR RADAR / MOTION TRACKER
  // =========================================================================

  renderMotionTracker(ctx, gameState, player, enemy) {
    const radarRadius = 66;
    const cx = CANVAS_WIDTH - radarRadius - 28;
    const cy = CANVAS_HEIGHT - radarRadius - 28;

    // Circular Frame Background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(4, 18, 12, 0.88)';
    ctx.fill();

    // Concentric Range Rings
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.22)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(rRatio => {
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius * rRatio, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - radarRadius, cy);
    ctx.lineTo(cx + radarRadius, cy);
    ctx.moveTo(cx, cy - radarRadius);
    ctx.lineTo(cx, cy + radarRadius);
    ctx.stroke();

    // Rotating Sonar Sweep Beam
    const sweepAngle = this.radarSweepAngle;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarRadius);
    gradient.addColorStop(0, 'rgba(0, 255, 102, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 255, 102, 0.0)');

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radarRadius, sweepAngle - 0.4, sweepAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Leading sweep line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * radarRadius, cy + Math.sin(sweepAngle) * radarRadius);
    ctx.strokeStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Clip to radar circle for blips
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius - 2, 0, Math.PI * 2);
    ctx.clip();

    // Center Player dot
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Max sensor world radius (e.g. 500 world units)
    const sensorMaxDist = 480;

    // Enemy Motion Blip (if enemy is active and within range)
    if (player && enemy && enemy.active) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < sensorMaxDist) {
        const blipNorm = dist / sensorMaxDist;
        const angle = Math.atan2(dy, dx);
        const bx = cx + Math.cos(angle) * (radarRadius * blipNorm);
        const by = cy + Math.sin(angle) * (radarRadius * blipNorm);

        // Calculate angular distance to sweep line for phosphor persistence
        let angleDiff = sweepAngle - angle;
        while (angleDiff < 0) angleDiff += Math.PI * 2;
        angleDiff = angleDiff % (Math.PI * 2);

        const blipIntensity = Math.max(0.2, 1.0 - (angleDiff / (Math.PI * 1.5)));

        // Pulsating red threat diamond
        ctx.fillStyle = `rgba(255, 34, 68, ${blipIntensity})`;
        ctx.beginPath();
        ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing warning ring around enemy blip
        ctx.strokeStyle = `rgba(255, 34, 68, ${blipIntensity * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, 7 + Math.sin(this.animTime * 10) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Radar Outer Ring & Label
    ctx.strokeStyle = COLORS.CRT_GREEN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '10px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.fillText('RADAR // 360°', cx - 36, cy + radarRadius + 15);
  }

  // =========================================================================
  // 5. CONTEXTUAL ACTION PROMPT
  // =========================================================================

  renderActionPrompt(ctx, prompt) {
    const text = prompt.text || '';
    const subtext = prompt.subtext || '';

    ctx.font = 'bold 14px "Share Tech Mono", monospace, monospace';
    const textW = ctx.measureText(text).width;
    const boxW = Math.max(240, textW + 50);
    const boxH = subtext ? 52 : 38;

    const x = (CANVAS_WIDTH - boxW) / 2;
    const y = CANVAS_HEIGHT - 130;

    // Prompt Box Background
    ctx.fillStyle = 'rgba(6, 14, 24, 0.92)';
    ctx.fillRect(x, y, boxW, boxH);

    let borderColor = COLORS.CYAN_BRIGHT;
    if (prompt.type === 'locked') borderColor = COLORS.ALERT_RED_BRIGHT;
    else if (prompt.type === 'critical') borderColor = COLORS.AMBER_BRIGHT;

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, boxW, boxH);
    this.drawCornerBrackets(ctx, x, y, boxW, boxH, borderColor, 6);

    // Centered Action Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(text, CANVAS_WIDTH / 2, y + (subtext ? 22 : 24));

    if (subtext) {
      ctx.font = '11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = borderColor;
      ctx.fillText(subtext, CANVAS_WIDTH / 2, y + 40);
    }

    ctx.textAlign = 'left'; // Reset
  }

  // =========================================================================
  // 6. NOTIFICATION TOAST SYSTEM
  // =========================================================================

  renderToasts(ctx) {
    if (this.toasts.length === 0) return;

    const startX = CANVAS_WIDTH / 2;
    let startY = 100;

    this.toasts.forEach((toast) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, toast.alpha));

      ctx.font = '13px "Share Tech Mono", monospace, monospace';
      const textW = ctx.measureText(toast.message).width;
      const boxW = Math.max(280, textW + 40);
      const boxH = 34;
      const bx = startX - boxW / 2;
      const by = startY;

      // Color scheme
      let accentColor = COLORS.CYAN_BRIGHT;
      if (toast.type === 'alert' || toast.type === 'warning') accentColor = COLORS.ALERT_RED_BRIGHT;
      else if (toast.type === 'success') accentColor = COLORS.CRT_GREEN_BRIGHT;

      // Card Background
      ctx.fillStyle = 'rgba(6, 12, 20, 0.9)';
      ctx.fillRect(bx, by, boxW, boxH);

      // Left Accent Strip & Outer Border
      ctx.fillStyle = accentColor;
      ctx.fillRect(bx, by, 4, boxH);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, boxW, boxH);

      // Text Message
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(toast.message, startX, by + 21);
      ctx.textAlign = 'left';

      ctx.restore();
      startY += boxH + 8;
    });
  }

  // =========================================================================
  // 7. LOCKER HIDING CINEMATIC OVERLAY
  // =========================================================================

  renderHidingOverlay(ctx, player) {
    // Heavy claustrophobic letterboxing and darkness
    ctx.fillStyle = 'rgba(0, 4, 8, 0.78)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Vent Slat Bars across screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
    const barHeight = 28;
    const gap = 16;
    for (let y = 0; y < CANVAS_HEIGHT; y += barHeight + gap) {
      ctx.fillRect(0, y, CANVAS_WIDTH, barHeight);
    }

    // Status HUD overlay
    ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
    const breathPulse = Math.sin(this.animTime * 3);
    ctx.fillStyle = breathPulse > 0 ? '#00ff66' : 'rgba(0, 255, 102, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('CONCEALED IN LOCKER // HEARTBEAT ELEVATED // [E] EXIT CONCEALMENT', CANVAS_WIDTH / 2, 70);
    ctx.textAlign = 'left';
  }

  // =========================================================================
  // 8. TACTICAL STATION RADAR PDA MAP ([M])
  // =========================================================================

  renderStationMap(ctx, gameState, player, currentSector) {
    // Backdrop Tint
    ctx.fillStyle = 'rgba(2, 6, 12, 0.92)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const mapW = 760;
    const mapH = 540;
    const mx = (CANVAS_WIDTH - mapW) / 2;
    const my = (CANVAS_HEIGHT - mapH) / 2;

    // Blueprint frame
    ctx.fillStyle = 'rgba(6, 16, 26, 0.98)';
    ctx.fillRect(mx, my, mapW, mapH);
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, mapW, mapH);
    this.drawCornerBrackets(ctx, mx, my, mapW, mapH, COLORS.CYAN_BRIGHT, 12);

    // Title
    ctx.font = 'bold 16px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillText('AEGIS-7 RESEARCH STATION // TACTICAL SCHEMATIC PDA', mx + 24, my + 34);

    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#8899aa';
    ctx.fillText('PRESS [M] OR [TAB] TO DISMISS SCHEMATIC', mx + mapW - 270, my + 34);

    // Sector Rectangles
    const sectors = [
      { name: 'SEC 1: HABITATION', x: mx + 40, y: my + 60, w: 150, h: 100, color: 'rgba(20, 40, 70, 0.6)', id: 'habitation' },
      { name: 'SEC 2: SECURITY HUB', x: mx + 210, y: my + 60, w: 200, h: 100, color: 'rgba(60, 20, 20, 0.6)', id: 'security' },
      { name: 'SEC 3: CRYO LABS [ALPHA]', x: mx + 430, y: my + 60, w: 290, h: 100, color: 'rgba(10, 45, 80, 0.6)', id: 'cryo' },
      { name: 'SEC 4: HYDROPONICS', x: mx + 430, y: my + 180, w: 290, h: 140, color: 'rgba(10, 50, 30, 0.6)', id: 'hydroponics' },
      { name: 'SEC 5: POWER REACTOR [BETA]', x: mx + 430, y: my + 340, w: 290, h: 150, color: 'rgba(70, 40, 10, 0.6)', id: 'power' },
      { name: 'SEC 6: SERVER CORE [GAMMA]', x: mx + 40, y: my + 340, w: 220, h: 150, color: 'rgba(50, 10, 60, 0.6)', id: 'server_core' },
      { name: 'SEC 7: CENTRAL COMMS', x: mx + 220, y: my + 180, w: 190, h: 140, color: 'rgba(20, 50, 60, 0.6)', id: 'comms' },
      { name: 'SEC 8: ESCAPE BAY [EVAC]', x: mx + 40, y: my + 180, w: 160, h: 140, color: 'rgba(60, 50, 10, 0.6)', id: 'escape_bay' }
    ];

    sectors.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = COLORS.CYAN_DARK;
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x, s.y, s.w, s.h);

      ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.name, s.x + 8, s.y + 20);
    });

    // Player Position Marker
    if (player) {
      // Map world coords (0-2048) to PDA map bounds
      const px = mx + 40 + (player.x / 2048) * (mapW - 100);
      const py = my + 60 + (player.y / 2048) * (mapH - 120);

      const pulse = Math.sin(this.animTime * 6) * 3;
      ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
      ctx.beginPath();
      ctx.arc(px, py, 6 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 10px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
      ctx.fillText('DR. VANCE [YOU]', px + 12, py + 4);
    }

    // 4. CDDA-Inspired Anatomical Body Doll & Trauma Readout (Right Panel)
    const dollX = mx + 540;
    const dollY = my + 60;
    const dollW = 190;
    const dollH = 410;

    ctx.fillStyle = 'rgba(4, 10, 18, 0.9)';
    ctx.fillRect(dollX, dollY, dollW, dollH);
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(dollX, dollY, dollW, dollH);
    this.drawCornerBrackets(ctx, dollX, dollY, dollW, dollH, COLORS.CYAN_BRIGHT, 6);

    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.font = 'bold 11px "Share Tech Mono", monospace';
    ctx.fillText('🩻 BIOMETRIC TRAUMA DOLL', dollX + 12, dollY + 22);

    const limbs = (gameState && gameState.survivalReport && gameState.survivalReport.limbs) || {
      head: 100, torso: 100, leftArm: 100, rightArm: 100, leftLeg: 100, rightLeg: 100
    };

    const drawLimbBar = (label, hp, ly) => {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px "Share Tech Mono", monospace';
      ctx.fillText(label, dollX + 12, ly);

      const barX = dollX + 65;
      const barW = 110;
      const barH = 8;
      ctx.fillStyle = 'rgba(20, 30, 45, 0.8)';
      ctx.fillRect(barX, ly - 8, barW, barH);

      const color = hp > 60 ? COLORS.CRT_GREEN_BRIGHT : (hp > 25 ? COLORS.AMBER_BRIGHT : COLORS.ALERT_RED_BRIGHT);
      ctx.fillStyle = color;
      ctx.fillRect(barX, ly - 8, (hp / 100) * barW, barH);
      ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)';
      ctx.strokeRect(barX, ly - 8, barW, barH);
    };

    drawLimbBar('HEAD', limbs.head || 100, dollY + 48);
    drawLimbBar('TORSO', limbs.torso || 100, dollY + 72);
    drawLimbBar('L.ARM', limbs.leftArm || 100, dollY + 96);
    drawLimbBar('R.ARM', limbs.rightArm || 100, dollY + 120);
    drawLimbBar('L.LEG', limbs.leftLeg || 100, dollY + 144);
    drawLimbBar('R.LEG', limbs.rightLeg || 100, dollY + 168);

    // Physiological Metrics
    const rep = (gameState && gameState.survivalReport) || {
      suitIntegrity: 100, bodyTemperature: 37.0, bleedingRate: 0, pain: 0
    };

    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.font = 'bold 10px "Share Tech Mono", monospace';
    ctx.fillText('PHYSIOLOGY STATUS:', dollX + 12, dollY + 205);

    ctx.fillStyle = rep.suitIntegrity > 50 ? '#ffffff' : COLORS.ALERT_RED_BRIGHT;
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillText(`• SUIT PRESSURE: ${rep.suitIntegrity}%`, dollX + 12, dollY + 228);

    const tempColor = rep.bodyTemperature < 35.0 ? COLORS.CYAN_BRIGHT : '#ffffff';
    ctx.fillStyle = tempColor;
    ctx.fillText(`• CORE TEMP: ${rep.bodyTemperature}°C ${rep.bodyTemperature < 35.0 ? '[HYPO]' : ''}`, dollX + 12, dollY + 250);

    const bleedColor = rep.bleedingRate > 0 ? COLORS.ALERT_RED_BRIGHT : COLORS.CRT_GREEN_BRIGHT;
    ctx.fillStyle = bleedColor;
    ctx.fillText(`• HEMORRHAGE: ${rep.bleedingRate > 0 ? `${rep.bleedingRate} HP/s` : 'SEALED'}`, dollX + 12, dollY + 272);

    ctx.fillStyle = rep.pain > 30 ? COLORS.AMBER_BRIGHT : '#94a3b8';
    ctx.fillText(`• PAIN INDEX: ${rep.pain}%`, dollX + 12, dollY + 294);

    // Legend & Controls at footer
    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN;
    ctx.fillText('KEYS: [1] Medkit  [2] Battery  [3] Decoy  [4] EMP  [C] Craft  [E] Action  [F] Light', mx + 24, my + mapH - 18);
  }

  // =========================================================================
  // HELPER: TECH CORNER BRACKETS
  // =========================================================================

  drawCornerBrackets(ctx, x, y, width, height, color, size = 6) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + width - size, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + size);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x, y + height - size);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + size, y + height);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + width - size, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - size);
    ctx.stroke();
  }
}
