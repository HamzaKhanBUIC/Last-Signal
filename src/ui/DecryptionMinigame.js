/**
 * THE LAST SIGNAL — SIGNAL DECRYPTION MINIGAME
 * Oscilloscope Waveform Alignment Minigame.
 * Players tune Frequency, Amplitude, and Phase to match the encrypted alien/AI signal.
 * Features real-time resonance calculation, harmonic audio synthesis, and glitch-clearing animations.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, FRAGMENT_TYPES } from '../utils/Constants.js';

export class DecryptionMinigame {
  /**
   * @param {Object} [options]
   * @param {import('../audio/SoundEngine.js').SoundEngine} [options.audio]
   * @param {import('../core/EventBus.js').EventBus} [options.eventBus]
   */
  constructor(options = {}) {
    this.audio = options.audio || null;
    this.eventBus = options.eventBus || null;

    this.active = false;
    this.fragmentType = null;
    this.onCompleteCallback = null;
    this.onCancelCallback = null;

    // Target Waveform Parameters (Encrypted Signal)
    this.target = {
      freq: 2.0,
      amp: 0.8,
      phase: Math.PI / 4,
      secondaryFreq: 4.0,
      secondaryAmp: 0.25,
      noise: 0.15
    };

    // Player Waveform Parameters (Tuning)
    this.player = {
      freq: 1.0,
      amp: 0.5,
      phase: 0.0
    };

    // Limits & Step Sizes
    this.limits = {
      freqMin: 0.5,
      freqMax: 5.0,
      ampMin: 0.2,
      ampMax: 1.2,
      phaseMin: 0.0,
      phaseMax: Math.PI * 2
    };

    // Resonance & Accuracy (0.0 to 1.0)
    this.resonance = 0.0;
    this.isLocked = false;
    this.successTimer = 0;
    this.animTime = 0;

    // Interactive Slider hitboxes for Mouse / Touch
    this.sliders = [
      { id: 'freq', label: 'FREQUENCY (kHz)', min: 0.5, max: 5.0, value: 1.0, key: 'freq', x: 0, y: 0, w: 260, h: 20 },
      { id: 'amp', label: 'AMPLITUDE (mV)', min: 0.2, max: 1.2, value: 0.5, key: 'amp', x: 0, y: 0, w: 260, h: 20 },
      { id: 'phase', label: 'PHASE SHIFT (rad)', min: 0.0, max: Math.PI * 2, value: 0.0, key: 'phase', x: 0, y: 0, w: 260, h: 20 }
    ];

    this.activeSlider = null;
    this.selectedParamIndex = 0; // For keyboard navigation: 0: Freq, 1: Amp, 2: Phase, 3: Lock Button

    // Audio Feedback State
    this.audioOsc = null;
    this.audioGain = null;
  }

  /**
   * Starts a decryption session for a specific fragment.
   * @param {string} fragmentType 'FRAGMENT_ALPHA' | 'FRAGMENT_BETA' | 'FRAGMENT_GAMMA' | 'alpha' | 'beta' | 'gamma'
   * @param {Function} [onComplete] Callback when decryption succeeds
   * @param {Function} [onCancel] Callback when aborted
   */
  start(fragmentType = 'FRAGMENT_ALPHA', onComplete = null, onCancel = null) {
    this.active = true;
    this.fragmentType = fragmentType;
    this.onCompleteCallback = onComplete;
    this.onCancelCallback = onCancel;
    this.isLocked = false;
    this.successTimer = 0;
    this.animTime = 0;

    // Generate specific target puzzle parameters based on fragment type
    const normType = fragmentType.toLowerCase();
    if (normType.includes('alpha')) {
      this.target = { freq: 2.2, amp: 0.85, phase: 1.2, secondaryFreq: 4.4, secondaryAmp: 0.2, noise: 0.12 };
      this.player = { freq: 1.1, amp: 0.4, phase: 0.0 };
    } else if (normType.includes('beta')) {
      this.target = { freq: 3.4, amp: 0.95, phase: 2.4, secondaryFreq: 6.8, secondaryAmp: 0.3, noise: 0.18 };
      this.player = { freq: 1.5, amp: 0.6, phase: 0.5 };
    } else {
      // Gamma
      this.target = { freq: 4.1, amp: 1.05, phase: 4.0, secondaryFreq: 8.2, secondaryAmp: 0.35, noise: 0.22 };
      this.player = { freq: 2.0, amp: 0.5, phase: 1.0 };
    }

    this.syncSliders();
    this.calculateResonance();

    // Sound effect
    if (this.audio) {
      this.audio.playTerminalBeep('data');
    }
  }

  /**
   * Closes and resets minigame.
   */
  close() {
    this.active = false;
    this.stopAudioHarmonics();
    if (this.onCancelCallback && !this.isLocked) {
      this.onCancelCallback();
    }
  }

  /**
   * Syncs slider objects with current player parameters.
   */
  syncSliders() {
    this.sliders[0].value = this.player.freq;
    this.sliders[1].value = this.player.amp;
    this.sliders[2].value = this.player.phase;
  }

  /**
   * Evaluates mathematical resonance / alignment accuracy (0.0 to 1.0).
   */
  calculateResonance() {
    const freqDiff = Math.abs(this.player.freq - this.target.freq) / (this.limits.freqMax - this.limits.freqMin);
    const ampDiff = Math.abs(this.player.amp - this.target.amp) / (this.limits.ampMax - this.limits.ampMin);

    // Shortest circular phase difference
    let phaseDiff = Math.abs(this.player.phase - this.target.phase) % (Math.PI * 2);
    if (phaseDiff > Math.PI) phaseDiff = (Math.PI * 2) - phaseDiff;
    const normPhaseDiff = phaseDiff / Math.PI;

    // Weighted similarity
    const error = (freqDiff * 0.50) + (ampDiff * 0.25) + (normPhaseDiff * 0.25);
    this.resonance = Math.max(0, Math.min(1.0, 1.0 - Math.pow(error, 0.75)));

    return this.resonance;
  }

  /**
   * Attempts to lock in the frequency and complete decryption.
   * @returns {boolean} True if lock was successful (>= 95% resonance)
   */
  attemptLock() {
    if (this.isLocked) return true;

    this.calculateResonance();

    if (this.resonance >= 0.95) {
      this.isLocked = true;
      this.successTimer = 1.6;

      if (this.audio) {
        this.audio.playTerminalBeep('success');
      }

      if (this.eventBus) {
        this.eventBus.emit('TOAST_NOTIFICATION', {
          message: `SIGNAL ${String(this.fragmentType || 'UNKNOWN').toUpperCase()} DECRYPTED // FREQUENCY LOCKED`,
          type: 'success'
        });
      }

      return true;
    } else {
      if (this.audio) {
        this.audio.playTerminalBeep('error');
      }
      return false;
    }
  }

  /**
   * Updates animations and completion timers.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (!this.active) return;
    this.animTime += dt;

    if (this.isLocked) {
      this.successTimer -= dt;
      if (this.successTimer <= 0) {
        this.active = false;
        if (this.onCompleteCallback) {
          this.onCompleteCallback(this.fragmentType);
        }
      }
    }
  }

  /**
   * Keyboard & Input handling.
   * @param {import('../core/InputManager.js').InputManager} input
   */
  handleInput(input) {
    if (!this.active || this.isLocked) return;

    const step = 0.05;

    // Up / Down to switch selected parameter
    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp')) {
      this.selectedParamIndex = (this.selectedParamIndex + 3) % 4; // 0, 1, 2, 3 (Lock button)
      this.audio?.playTerminalKeystroke();
    } else if (input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.selectedParamIndex = (this.selectedParamIndex + 1) % 4;
      this.audio?.playTerminalKeystroke();
    }

    // Left / Right to adjust active parameter
    let dir = 0;
    if (input.isActionActive('MOVE_LEFT') || input.isKeyDown('ArrowLeft')) dir -= 1;
    if (input.isActionActive('MOVE_RIGHT') || input.isKeyDown('ArrowRight')) dir += 1;

    if (dir !== 0) {
      if (this.selectedParamIndex === 0) {
        // Frequency
        this.player.freq = Math.max(this.limits.freqMin, Math.min(this.limits.freqMax, this.player.freq + dir * 0.04));
      } else if (this.selectedParamIndex === 1) {
        // Amplitude
        this.player.amp = Math.max(this.limits.ampMin, Math.min(this.limits.ampMax, this.player.amp + dir * 0.015));
      } else if (this.selectedParamIndex === 2) {
        // Phase
        this.player.phase = (this.player.phase + dir * 0.06 + Math.PI * 2) % (Math.PI * 2);
      }
      this.syncSliders();
      this.calculateResonance();
    }

    // Direct Key shortcuts: [1] Freq, [2] Amp, [3] Phase
    if (input.wasKeyJustPressed('Digit1')) this.selectedParamIndex = 0;
    if (input.wasKeyJustPressed('Digit2')) this.selectedParamIndex = 1;
    if (input.wasKeyJustPressed('Digit3')) this.selectedParamIndex = 2;

    // Lock / Enter
    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      this.attemptLock();
    }

    // Exit / Esc
    if (input.wasKeyJustPressed('Escape')) {
      this.close();
    }
  }

  /**
   * Handles mouse clicks and drags on sliders and buttons.
   * @param {number} mouseX Screen X
   * @param {number} mouseY Screen Y
   * @param {boolean} isDown Mouse button down
   * @param {boolean} isJustPressed Mouse button just clicked
   */
  handleMouse(mouseX, mouseY, isDown, isJustPressed) {
    if (!this.active || this.isLocked) return;

    // Sliders drag
    if (isDown) {
      for (let i = 0; i < this.sliders.length; i++) {
        const s = this.sliders[i];
        if (mouseX >= s.x && mouseX <= s.x + s.w && mouseY >= s.y - 10 && mouseY <= s.y + s.h + 10) {
          const norm = Math.max(0, Math.min(1, (mouseX - s.x) / s.w));
          const val = s.min + norm * (s.max - s.min);

          if (s.key === 'freq') this.player.freq = val;
          else if (s.key === 'amp') this.player.amp = val;
          else if (s.key === 'phase') this.player.phase = val;

          this.selectedParamIndex = i;
          this.syncSliders();
          this.calculateResonance();
          break;
        }
      }
    }

    // Lock Button Click
    const lockBtnX = CANVAS_WIDTH / 2 + 100;
    const lockBtnY = CANVAS_HEIGHT / 2 + 195;
    const lockBtnW = 200;
    const lockBtnH = 40;

    if (isJustPressed && mouseX >= lockBtnX && mouseX <= lockBtnX + lockBtnW && mouseY >= lockBtnY && mouseY <= lockBtnY + lockBtnH) {
      this.attemptLock();
    }

    // Abort Button Click
    const abortBtnX = CANVAS_WIDTH / 2 - 300;
    const abortBtnY = CANVAS_HEIGHT / 2 + 195;
    const abortBtnW = 160;
    const abortBtnH = 40;

    if (isJustPressed && mouseX >= abortBtnX && mouseX <= abortBtnX + abortBtnW && mouseY >= abortBtnY && mouseY <= abortBtnY + abortBtnH) {
      this.close();
    }
  }

  /**
   * Master render method for the decryption oscilloscope overlay.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width Canvas width
   * @param {number} height Canvas height
   */
  render(ctx, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    if (!this.active) return;

    ctx.save();

    // 1. Semi-transparent dark CRT overlay backdrop
    ctx.fillStyle = 'rgba(2, 6, 10, 0.94)';
    ctx.fillRect(0, 0, width, height);

    // 2. Main Window Bezel & Framing
    const winW = 860;
    const winH = 550;
    const winX = (width - winW) / 2;
    const winY = (height - winH) / 2;

    ctx.fillStyle = 'rgba(6, 14, 22, 0.96)';
    ctx.fillRect(winX, winY, winW, winH);

    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 2;
    ctx.strokeRect(winX, winY, winW, winH);

    // Header Bar
    ctx.fillStyle = 'rgba(0, 40, 60, 0.7)';
    ctx.fillRect(winX, winY, winW, 36);
    ctx.strokeStyle = COLORS.CYAN_DARK;
    ctx.strokeRect(winX, winY, winW, 36);

    ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillText(`SUBSPACE FREQUENCY DECRYPTION MATRIX // [${(this.fragmentType || 'SIGNAL').toUpperCase()}]`, winX + 16, winY + 23);

    const blink = Math.sin(this.animTime * 6) > 0;
    ctx.fillStyle = blink ? COLORS.CRT_GREEN_BRIGHT : COLORS.AMBER_BRIGHT;
    ctx.fillText('STATUS: OSCILLOSCOPE ACTIVE', winX + winW - 230, winY + 23);

    // 3. Oscilloscope Visualizer Screen
    const oscW = 800;
    const oscH = 240;
    const oscX = winX + (winW - oscW) / 2;
    const oscY = winY + 54;

    this.renderOscilloscope(ctx, oscX, oscY, oscW, oscH);

    // 4. Resonance Meter Bar & Status Readout
    this.renderResonanceMeter(ctx, winX + 30, oscY + oscH + 16, winW - 60);

    // 5. Parameter Tuning Sliders (Frequency, Amplitude, Phase)
    this.renderSliders(ctx, winX + 40, oscY + oscH + 68);

    // 6. Action Buttons: Lock Frequency & Abort
    this.renderButtons(ctx, winX, winY, winW, winH);

    // 7. Success Flash Overlay if locked
    if (this.isLocked) {
      const flashAlpha = Math.max(0, this.successTimer / 1.6);
      ctx.fillStyle = `rgba(0, 255, 102, ${flashAlpha * 0.45})`;
      ctx.fillRect(winX, winY, winW, winH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px "Share Tech Mono", monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SIGNAL DECRYPTED // HARMONIC RESONANCE 100%', width / 2, height / 2);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  // =========================================================================
  // OSCILLOSCOPE GRAPHICS & WAVEFORMS
  // =========================================================================

  renderOscilloscope(ctx, x, y, width, height) {
    ctx.save();

    // Dark screen background
    ctx.fillStyle = '#010c08';
    ctx.fillRect(x, y, width, height);

    // CRT Screen Bezel
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);

    // Oscilloscope Grid Lines (Reticle)
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.12)';
    ctx.lineWidth = 1;
    const gridCols = 16;
    const gridRows = 8;

    for (let c = 1; c < gridCols; c++) {
      const gx = x + (width / gridCols) * c;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + height);
      ctx.stroke();
    }

    for (let r = 1; r < gridRows; r++) {
      const gy = y + (height / gridRows) * r;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + width, gy);
      ctx.stroke();
    }

    // Center Crosshair
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x, y + height / 2);
    ctx.lineTo(x + width, y + height / 2);
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2, y + height);
    ctx.stroke();

    // Clip to screen for wave rendering
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, width - 2, height - 2);
    ctx.clip();

    const centerY = y + height / 2;
    const maxAmplitude = height * 0.38;
    const time = this.animTime * 2.0;

    // 1. Render Target Encrypted Signal (Red / Amber Noisy Waveform)
    ctx.strokeStyle = this.isLocked ? COLORS.CRT_GREEN_BRIGHT : COLORS.ALERT_RED_BRIGHT;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let px = 0; px < width; px += 2) {
      const t = (px / width) * Math.PI * 4;

      let wave = Math.sin(t * this.target.freq + this.target.phase + time) * this.target.amp;
      wave += Math.sin(t * this.target.secondaryFreq + time * 1.5) * this.target.secondaryAmp;

      // Add high-frequency noise unless locked
      if (!this.isLocked) {
        wave += (Math.random() - 0.5) * this.target.noise;
      }

      const py = centerY + wave * maxAmplitude;
      if (px === 0) ctx.moveTo(x + px, py);
      else ctx.lineTo(x + px, py);
    }
    ctx.stroke();

    // 2. Render Player Tuning Waveform (Cyan Phosphor Waveform)
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let px = 0; px < width; px += 2) {
      const t = (px / width) * Math.PI * 4;
      const wave = Math.sin(t * this.player.freq + this.player.phase + time) * this.player.amp;
      const py = centerY + wave * maxAmplitude;

      if (px === 0) ctx.moveTo(x + px, py);
      else ctx.lineTo(x + px, py);
    }
    ctx.stroke();

    // Legend
    ctx.font = '10px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.fillText('— ENCRYPTED SIGNAL', x + 16, y + 20);

    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillText('— TUNING FREQUENCY', x + 160, y + 20);

    ctx.restore();
  }

  // =========================================================================
  // RESONANCE ACCURACY METER
  // =========================================================================

  renderResonanceMeter(ctx, x, y, width) {
    const percent = Math.round(this.resonance * 100);
    const isReady = this.resonance >= 0.95;

    let statusColor = COLORS.ALERT_RED_BRIGHT;
    let statusText = 'SEARCHING HARMONICS...';

    if (percent > 65 && percent < 95) {
      statusColor = COLORS.AMBER_BRIGHT;
      statusText = 'APPROACHING RESONANCE';
    } else if (isReady) {
      statusColor = COLORS.CRT_GREEN_BRIGHT;
      statusText = 'HARMONIC LOCK READY — PRESS [ENTER]';
    }

    // Header & Numerical percentage
    ctx.font = 'bold 12px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = statusColor;
    ctx.fillText(`RESONANCE INTEGRITY: ${percent}% // ${statusText}`, x, y + 12);

    // Meter Bar Frame
    const barY = y + 18;
    const barH = 14;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x, barY, width, barH);

    // Glowing Fill
    ctx.fillStyle = statusColor;
    ctx.fillRect(x, barY, width * this.resonance, barH);

    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, barY, width, barH);

    // 95% Threshold Line Indicator
    const threshX = x + width * 0.95;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(threshX, barY - 3);
    ctx.lineTo(threshX, barY + barH + 3);
    ctx.stroke();

    ctx.font = '9px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('95% LOCK', threshX - 22, barY + barH + 12);
  }

  // =========================================================================
  // SLIDERS & CONTROLS
  // =========================================================================

  renderSliders(ctx, startX, startY) {
    const sliderW = 340;
    const sliderH = 16;
    const gap = 34;

    this.sliders.forEach((s, idx) => {
      const y = startY + idx * gap;
      s.x = startX;
      s.y = y;
      s.w = sliderW;
      s.h = sliderH;

      const isSelected = this.selectedParamIndex === idx;

      // Label & Value
      ctx.font = '11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? COLORS.CYAN_BRIGHT : '#8899aa';

      let valFormatted = s.value.toFixed(2);
      if (s.key === 'phase') valFormatted = (s.value / Math.PI).toFixed(2) + 'π';

      ctx.fillText(`${isSelected ? '▶ ' : '  '}[${idx + 1}] ${s.label}: ${valFormatted}`, startX, y - 5);

      // Track background
      ctx.fillStyle = 'rgba(20, 35, 50, 0.8)';
      ctx.fillRect(startX, y, sliderW, sliderH);

      // Fill ratio
      const norm = (s.value - s.min) / (s.max - s.min);
      ctx.fillStyle = isSelected ? COLORS.CYAN_BRIGHT : COLORS.CYAN_DARK;
      ctx.fillRect(startX, y, sliderW * norm, sliderH);

      ctx.strokeStyle = isSelected ? COLORS.CYAN_BRIGHT : 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.strokeRect(startX, y, sliderW, sliderH);

      // Handle thumb
      const thumbX = startX + sliderW * norm;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(thumbX - 4, y - 2, 8, sliderH + 4);
    });

    // Control Help Instructions
    const helpX = startX + sliderW + 50;
    const helpY = startY + 10;

    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#6688aa';
    ctx.fillText('TUNING INSTRUCTIONS:', helpX, helpY);
    ctx.fillText('• [↑/↓] or [1-3] : Select Parameter', helpX, helpY + 20);
    ctx.fillText('• [←/→] or Drag  : Adjust Value', helpX, helpY + 38);
    ctx.fillText('• Match waves to achieve >95% resonance', helpX, helpY + 56);
    ctx.fillText('• Press [ENTER] when locked in', helpX, helpY + 74);
  }

  // =========================================================================
  // ACTION BUTTONS
  // =========================================================================

  renderButtons(ctx, winX, winY, winW, winH) {
    const isReady = this.resonance >= 0.95;

    // Lock Frequency Button
    const lockBtnX = winX + winW - 260;
    const lockBtnY = winY + winH - 60;
    const lockBtnW = 220;
    const lockBtnH = 38;

    const lockBg = isReady ? 'rgba(0, 255, 102, 0.25)' : 'rgba(40, 45, 50, 0.4)';
    const lockBorder = isReady ? COLORS.CRT_GREEN_BRIGHT : '#445566';
    const lockText = isReady ? COLORS.CRT_GREEN_BRIGHT : '#667788';

    ctx.fillStyle = lockBg;
    ctx.fillRect(lockBtnX, lockBtnY, lockBtnW, lockBtnH);
    ctx.strokeStyle = lockBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(lockBtnX, lockBtnY, lockBtnW, lockBtnH);

    ctx.font = 'bold 12px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = lockText;
    ctx.textAlign = 'center';
    ctx.fillText(isReady ? '[ ENTER ] LOCK FREQUENCY' : 'LOCK UNAVAILABLE (<95%)', lockBtnX + lockBtnW / 2, lockBtnY + 24);

    // Abort Button
    const abortBtnX = winX + 40;
    const abortBtnY = winY + winH - 60;
    const abortBtnW = 160;
    const abortBtnH = 38;

    ctx.fillStyle = 'rgba(255, 34, 68, 0.15)';
    ctx.fillRect(abortBtnX, abortBtnY, abortBtnW, abortBtnH);
    ctx.strokeStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.strokeRect(abortBtnX, abortBtnY, abortBtnW, abortBtnH);

    ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.fillText('[ ESC ] ABORT MATRIX', abortBtnX + abortBtnW / 2, abortBtnY + 24);

    ctx.textAlign = 'left'; // Reset
  }

  // =========================================================================
  // AUDIO HARMONICS CLEANUP
  // =========================================================================

  stopAudioHarmonics() {
    try {
      if (this.audioOsc) {
        this.audioOsc.stop();
        this.audioOsc = null;
      }
    } catch (_) {}
  }
}
